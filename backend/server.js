require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Import models and utilities
const { User, Session, Message, CrisisAlert } = require('./models');
const { auth } = require('./utils');
const crisisDetection = require('./utils/crisisDetection');
const aiChatbot = require('./utils/aiChatbot');

// Import routes
const routes = require('./routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Define allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8080", 
  "http://localhost:8081",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:5173"
];

// Add origins from environment variable if set
if (process.env.SOCKET_ORIGIN) {
  const envOrigins = process.env.SOCKET_ORIGIN.split(',').map(origin => origin.trim());
  allowedOrigins.push(...envOrigins);
}

// Initialize Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saneyar-mental-health';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.'
  }
});

// Apply rate limiting
app.use(limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection with better handling
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 Database connection closed');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log(`👤 User connected: ${socket.user.username} (${socket.userId})`);

  // Update user online status
  try {
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastActive: new Date()
    });
  } catch (error) {
    console.error('Error updating user online status:', error);
  }

  // Join user to their active session rooms
  try {
    const userSessions = await Session.find({
      $or: [
        { patientId: socket.userId },
        { helperId: socket.userId }
      ],
      status: { $in: ['active', 'waiting', 'escalated'] }
    });

    userSessions.forEach(session => {
      socket.join(`session_${session._id}`);
      console.log(`📱 User ${socket.user.username} auto-joined session room: ${session._id}`);
    });

    // Join counselors/admins to crisis alert room
    if (['counselor', 'admin'].includes(socket.user.role)) {
      socket.join('crisis_responders');
      console.log(`🚨 Crisis responder ${socket.user.username} joined alert room`);
    }
  } catch (error) {
    console.error('Error joining session rooms:', error);
  }

  // Add rate limiting for session operations
  socket.lastSessionAction = 0;
  socket.sessionActionCooldown = 500; // 500ms cooldown between session actions

  // Handle user joining a session
  socket.on('join-session', async (data) => {
    try {
      const now = Date.now();
      if (now - socket.lastSessionAction < socket.sessionActionCooldown) {
        console.log(`📱 Rate limiting session action for user ${socket.user.username}`);
        return;
      }
      socket.lastSessionAction = now;

      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('error', { 
          event: 'join-session',
          message: 'Session ID is required' 
        });
        return;
      }

      // Prevent joining the same session multiple times
      if (socket.currentSession === sessionId) {
        console.log(`📱 User ${socket.user.username} already in session: ${sessionId}`);
        return;
      }

      // Check MongoDB connection before operations
      if (mongoose.connection.readyState !== 1) {
        socket.emit('error', { 
          event: 'join-session',
          message: 'Database temporarily unavailable. Please try again.' 
        });
        return;
      }

      const session = await Session.findById(sessionId)
        .populate('patientId', 'username profile anonymousId role')
        .populate('helperId', 'username profile role');
      
      if (!session) {
        socket.emit('error', { 
          event: 'join-session',
          message: 'Session not found' 
        });
        return;
      }

      // Check if user has permission to join session
      const isPatient = session.patientId._id.toString() === socket.userId;
      const isHelper = session.helperId && session.helperId._id.toString() === socket.userId;
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(socket.user.role);

      if (!isPatient && !isHelper && !isCounselorOrAdmin) {
        socket.emit('error', { 
          event: 'join-session',
          message: 'Not authorized to join this session' 
        });
        return;
      }

      // Join the session room
      socket.join(`session_${sessionId}`);
      
      // Leave previous session if any
      if (socket.currentSession && socket.currentSession !== sessionId) {
        socket.leave(`session_${socket.currentSession}`);
        socket.to(`session_${socket.currentSession}`).emit('user-left-session', {
          user: {
            _id: socket.userId,
            username: socket.user.username,
            role: socket.user.role
          },
          sessionId: socket.currentSession,
          reason: 'switched_session',
          timestamp: new Date()
        });
      }
      
      socket.currentSession = sessionId;
      
      // Notify others in the session
      socket.to(`session_${sessionId}`).emit('user-joined-session', {
        user: {
          _id: socket.userId,
          username: socket.user.username,
          role: socket.user.role,
          profile: socket.user.profile,
          isAnonymous: !!socket.user.anonymousId
        },
        sessionId,
        timestamp: new Date()
      });

      // Confirm join to the user
      socket.emit('session-joined', {
        sessionId,
        session: {
          _id: session._id,
          status: session.status,
          helperType: session.helperType,
          severity: session.severity
        },
        participants: {
          patient: session.patientId,
          helper: session.helperId
        }
      });

      console.log(`📱 User ${socket.user.username} joined session: ${sessionId} (participants: ${Object.keys(io.sockets.adapter.rooms.get(`session_${sessionId}`) || {}).length})`);
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('error', { 
        event: 'join-session',
        message: 'Failed to join session',
        details: error.message 
      });
    }
  });

  // Handle sending messages
  socket.on('send-message', async (data) => {
    try {
      const { sessionId, message, messageType = 'text', replyTo } = data;

      if (!sessionId || !message || message.trim().length === 0) {
        socket.emit('error', { 
          event: 'send-message',
          message: 'Session ID and message are required' 
        });
        return;
      }

      // Check MongoDB connection before operations
      if (mongoose.connection.readyState !== 1) {
        socket.emit('error', { 
          event: 'send-message',
          message: 'Database temporarily unavailable. Please try again.' 
        });
        return;
      }

      // Validate session and permissions
      const session = await Session.findById(sessionId);
      if (!session) {
        socket.emit('error', { 
          event: 'send-message',
          message: 'Session not found' 
        });
        return;
      }

      const isPatient = session.patientId.toString() === socket.userId;
      const isHelper = session.helperId && session.helperId.toString() === socket.userId;

      if (!isPatient && !isHelper) {
        socket.emit('error', { 
          event: 'send-message',
          message: 'Not authorized to send message to this session' 
        });
        return;
      }

      // Create message with current timestamp to avoid delays
      const messageTimestamp = new Date();
      const newMessage = new Message({
        sessionId: sessionId,
        senderId: socket.userId,
        message: message.trim(),
        senderRole: socket.user.role,
        messageType,
        replyTo,
        createdAt: messageTimestamp
      });

      await newMessage.save();
      await newMessage.populate('senderId', 'username profile anonymousId role');

      if (replyTo) {
        await newMessage.populate('replyTo', 'message senderId');
      }

      // Process message for crisis detection
      try {
        const crisisResult = await crisisDetection.processMessageForCrisis(newMessage);
        
        if (crisisResult.alert) {
          // Emit crisis alert to responders
          io.to('crisis_responders').emit('crisis-alert', {
            alert: {
              _id: crisisResult.alert._id,
              severity: crisisResult.alert.severity,
              user: crisisResult.alert.user,
              session: sessionId,
              confidence: crisisResult.analysis.confidence
            },
            message: newMessage,
            timestamp: new Date()
          });

          console.log(`🚨 Crisis alert triggered for session ${sessionId}`);
        }
      } catch (crisisError) {
        console.error('Crisis detection error:', crisisError);
      }

      // Broadcast message to session participants
      io.to(`session_${sessionId}`).emit('new-message', {
        message: {
          _id: newMessage._id,
          sessionId: newMessage.sessionId,
          senderId: newMessage.senderId,
          message: newMessage.message,
          senderRole: newMessage.senderRole,
          messageType: newMessage.messageType,
          createdAt: messageTimestamp.toISOString(), // Use the timestamp we created when message was received
          replyTo: newMessage.replyTo,
          crisisDetected: !!newMessage.crisisDetection.isCrisis
        },
        timestamp: messageTimestamp
      });

      // Check if AI should respond (for chatbot sessions)
      if (session.helperType === 'chatbot' && isPatient) {
        setTimeout(async () => {
          try {
            const aiResponseData = await aiChatbot.generateAIResponse(newMessage, session, socket.user);
            
            const aiMessage = new Message({
              sessionId: sessionId,
              senderId: socket.userId, // In production, use bot user ID
              message: aiResponseData.content.text,
              senderRole: 'chatbot',
              messageType: 'text',
              metadata: aiResponseData.metadata
            });

            await aiMessage.save();

            // Broadcast AI response
            io.to(`session_${sessionId}`).emit('new-message', {
              message: {
                _id: aiMessage._id,
                sessionId: aiMessage.sessionId,
                senderId: aiMessage.senderId,
                message: aiMessage.message,
                senderRole: aiMessage.senderRole,
                messageType: aiMessage.messageType,
                createdAt: aiMessage.createdAt,
                isAI: true
              },
              timestamp: new Date()
            });
          } catch (aiError) {
            console.error('AI response error:', aiError);
          }
        }, Math.random() * 2000 + 1000); // Random delay 1-3 seconds
      }

      console.log(`💬 Message sent in session ${sessionId} by ${socket.user.username}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { 
        event: 'send-message',
        message: 'Failed to send message',
        details: error.message 
      });
    }
  });

  // Handle session escalation
  socket.on('escalate-session', async (data) => {
    try {
      const { sessionId, newSeverity, reason, targetHelperType } = data;

      if (!sessionId || !newSeverity) {
        socket.emit('error', { 
          event: 'escalate-session',
          message: 'Session ID and severity are required' 
        });
        return;
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        socket.emit('error', { 
          event: 'escalate-session',
          message: 'Session not found' 
        });
        return;
      }

      // Check permissions
      const isPatient = session.patientId.toString() === socket.userId;
      const isHelper = session.helperId && session.helperId.toString() === socket.userId;
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(socket.user.role);

      if (!isPatient && !isHelper && !isCounselorOrAdmin) {
        socket.emit('error', { 
          event: 'escalate-session',
          message: 'Not authorized to escalate this session' 
        });
        return;
      }

      let newSession = null;
      
      // Check if escalating from peer to counselor
      if (targetHelperType === 'counselor' && session.helperType === 'peer') {
        // End the current peer session
        session.status = 'escalated';
        session.closedAt = new Date();
        session.escalationReason = reason;
        await session.save();

        // Create a new counselor session request
        newSession = new Session({
          patientId: session.patientId,
          helperType: 'counselor',
          severity: newSeverity,
          status: 'waiting',
          title: `Escalated from Peer Support - ${session.title || 'Support Needed'}`,
          description: `This session was escalated from peer support. Original reason: ${reason}`,
          escalatedFrom: sessionId,
          createdAt: new Date()
        });

        await newSession.save();
        await newSession.populate('patientId', 'username profile anonymousId role');

        // Notify all counselors about the new session
        io.to('crisis_responders').emit('new-session-available', {
          session: {
            _id: newSession._id,
            patientId: newSession.patientId,
            helperType: newSession.helperType,
            severity: newSession.severity,
            status: newSession.status,
            title: newSession.title,
            description: newSession.description,
            createdAt: newSession.createdAt
          },
          priority: 'high',
          escalated: true
        });

        // Remove helper from current session room
        const currentHelperSocket = [...io.sockets.sockets.values()]
          .find(s => s.userId === session.helperId.toString());
        
        if (currentHelperSocket) {
          currentHelperSocket.leave(`session_${sessionId}`);
        }

        console.log(`⚡ Peer session ${sessionId} escalated to counselor. New session: ${newSession._id}`);
      } else {
        // Regular escalation without changing helper type
        await session.escalateSession(newSeverity, reason);
      }

      // Notify session participants about escalation
      if (targetHelperType === 'counselor' && session.helperType === 'peer') {
        // Notify patient about escalation to counselor
        io.to(`session_${sessionId}`).emit('session-escalated-to-counselor', {
          sessionId,
          newSessionId: newSession ? newSession._id : null,
          escalation: {
            newSeverity,
            reason,
            escalatedBy: {
              _id: socket.userId,
              username: socket.user.username,
              role: socket.user.role
            },
            targetHelperType,
            timestamp: new Date()
          },
          message: 'Your peer support session has been escalated to a professional counselor for specialized assistance.'
        });
      } else {
        // Regular escalation notification
        io.to(`session_${sessionId}`).emit('session-escalated', {
          sessionId,
          escalation: {
            newSeverity,
            reason,
            escalatedBy: {
              _id: socket.userId,
              username: socket.user.username,
              role: socket.user.role
            },
            targetHelperType,
            timestamp: new Date()
          },
          session: {
            _id: session._id,
            status: session.status,
            severity: session.severity,
            helperType: session.helperType
          }
        });
      }

      // Notify crisis responders if escalated to critical
      if (newSeverity === 'critical') {
        io.to('crisis_responders').emit('session-escalated-critical', {
          sessionId,
          severity: newSeverity,
          reason,
          patient: session.patientId,
          timestamp: new Date()
        });
      }

      console.log(`⚡ Session ${sessionId} escalated to ${newSeverity} by ${socket.user.username}`);
    } catch (error) {
      console.error('Error escalating session:', error);
      socket.emit('error', { 
        event: 'escalate-session',
        message: 'Failed to escalate session',
        details: error.message 
      });
    }
  });

  // Handle crisis alert broadcasting
  socket.on('crisis-alert', async (data) => {
    try {
      const { severity = 'critical', description, location, sessionId } = data;

      if (!description) {
        socket.emit('error', { 
          event: 'crisis-alert',
          message: 'Crisis description is required' 
        });
        return;
      }

      // Create crisis alert
      const alert = new CrisisAlert({
        user: socket.userId,
        session: sessionId || null,
        type: 'user-report',
        severity: severity,
        triggerContent: {
          text: description
        },
        metadata: {
          userLocation: location || {},
          socketTriggered: true
        }
      });

      await alert.save();
      await alert.populate('user', 'username profile anonymousId');

      // Broadcast to all crisis responders
      io.to('crisis_responders').emit('crisis-alert', {
        alert: {
          _id: alert._id,
          severity: alert.severity,
          type: alert.type,
          user: alert.user,
          session: sessionId,
          description,
          location,
          createdAt: alert.createdAt
        },
        urgency: 'immediate',
        timestamp: new Date()
      });

      // Send confirmation to user
      socket.emit('crisis-alert-sent', {
        alertId: alert._id,
        message: 'Crisis alert sent to all available responders',
        emergencyContacts: {
          crisis: '988',
          emergency: '911',
          text: 'Text HOME to 741741'
        },
        timestamp: new Date()
      });

      console.log(`🚨 Crisis alert broadcast by ${socket.user.username}`);
    } catch (error) {
      console.error('Error broadcasting crisis alert:', error);
      socket.emit('error', { 
        event: 'crisis-alert',
        message: 'Failed to send crisis alert',
        details: error.message 
      });
    }
  });

  // Handle typing indicators
  socket.on('typing-indicator', (data) => {
    try {
      const { sessionId, isTyping } = data;

      if (!sessionId) {
        socket.emit('error', { 
          event: 'typing-indicator',
          message: 'Session ID is required' 
        });
        return;
      }

      // Broadcast typing status to other session participants
      socket.to(`session_${sessionId}`).emit('user-typing', {
        sessionId,
        user: {
          _id: socket.userId,
          username: socket.user.username,
          role: socket.user.role
        },
        isTyping,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  });

  // Handle session status updates
  socket.on('session-status', async (data) => {
    try {
      const { sessionId, status, additionalData = {} } = data;

      if (!sessionId || !status) {
        socket.emit('error', { 
          event: 'session-status',
          message: 'Session ID and status are required' 
        });
        return;
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        socket.emit('error', { 
          event: 'session-status',
          message: 'Session not found' 
        });
        return;
      }

      // Check permissions to update status
      const isPatient = session.patientId.toString() === socket.userId;
      const isHelper = session.helperId && session.helperId.toString() === socket.userId;
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(socket.user.role);

      if (!isPatient && !isHelper && !isCounselorOrAdmin) {
        socket.emit('error', { 
          event: 'session-status',
          message: 'Not authorized to update session status' 
        });
        return;
      }

      // Update session status
      const oldStatus = session.status;
      session.status = status;

      if (status === 'active' && !session.startedAt) {
        session.startedAt = new Date();
      } else if (status === 'closed' && !session.endedAt) {
        session.endedAt = new Date();
        if (additionalData.rating) session.rating = additionalData.rating;
        if (additionalData.feedback) session.feedback = additionalData.feedback;
        if (additionalData.notes) session.sessionNotes = additionalData.notes;
      }

      await session.save();

      // Notify all session participants about status change
      io.to(`session_${sessionId}`).emit('session-status-updated', {
        sessionId,
        statusChange: {
          from: oldStatus,
          to: status,
          updatedBy: {
            _id: socket.userId,
            username: socket.user.username,
            role: socket.user.role
          },
          additionalData,
          timestamp: new Date()
        },
        session: {
          _id: session._id,
          status: session.status,
          startedAt: session.startedAt,
          endedAt: session.endedAt
        }
      });

      console.log(`� Session ${sessionId} status updated from ${oldStatus} to ${status} by ${socket.user.username}`);
    } catch (error) {
      console.error('Error updating session status:', error);
      socket.emit('error', { 
        event: 'session-status',
        message: 'Failed to update session status',
        details: error.message 
      });
    }
  });

  // Handle leaving a session
  socket.on('leave-session', async (data) => {
    try {
      const now = Date.now();
      if (now - socket.lastSessionAction < socket.sessionActionCooldown) {
        console.log(`📱 Rate limiting session action for user ${socket.user.username}`);
        return;
      }
      socket.lastSessionAction = now;

      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('error', { 
          event: 'leave-session',
          message: 'Session ID is required' 
        });
        return;
      }

      // Only leave if currently in this session
      if (socket.currentSession !== sessionId) {
        console.log(`📱 User ${socket.user.username} not in session ${sessionId}, current: ${socket.currentSession}`);
        return;
      }

      socket.leave(`session_${sessionId}`);
      
      // Notify others in the session
      socket.to(`session_${sessionId}`).emit('user-left-session', {
        user: {
          _id: socket.userId,
          username: socket.user.username,
          role: socket.user.role
        },
        sessionId,
        timestamp: new Date()
      });

      socket.currentSession = null;

      console.log(`📱 User ${socket.user.username} left session: ${sessionId} (remaining: ${Object.keys(io.sockets.adapter.rooms.get(`session_${sessionId}`) || {}).length})`);
    } catch (error) {
      console.error('Error leaving session:', error);
      socket.emit('error', { 
        event: 'leave-session',
        message: 'Failed to leave session',
        details: error.message 
      });
    }
  });

  // Handle user status updates
  socket.on('update-user-status', async (data) => {
    try {
      const { status } = data;
      
      if (!status) {
        socket.emit('error', { 
          event: 'update-user-status',
          message: 'Status is required' 
        });
        return;
      }

      await User.findByIdAndUpdate(socket.userId, { 
        isActive: status === 'active',
        lastActive: new Date()
      });
      
      // Notify connected users about status change
      socket.broadcast.emit('user-status-updated', {
        userId: socket.userId,
        username: socket.user.username,
        status,
        timestamp: new Date()
      });

      console.log(`👤 User ${socket.user.username} status updated to ${status}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      socket.emit('error', { 
        event: 'update-user-status',
        message: 'Failed to update status',
        details: error.message 
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`👤 User disconnected: ${socket.user.username} (${socket.userId})`);

    try {
      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastActive: new Date()
      });

      // Notify session participants if user was in a session
      if (socket.currentSession) {
        socket.to(`session_${socket.currentSession}`).emit('user-left-session', {
          user: {
            _id: socket.userId,
            username: socket.user.username,
            role: socket.user.role
          },
          sessionId: socket.currentSession,
          reason: 'disconnect',
          timestamp: new Date()
        });
      }

      // Notify about offline status
      socket.broadcast.emit('user-status-updated', {
        userId: socket.userId,
        username: socket.user.username,
        status: 'offline',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', routes.auth);
app.use('/api/sessions', routes.sessions);
app.use('/api/messages', routes.messages);
app.use('/api/crisis', routes.crisis);
app.use('/api/ai', routes.ai);
app.use('/api/chatbot', routes.chatbot);
app.use('/api/urgent', routes.urgent);
app.use('/api/questionnaires', routes.questionnaires);
app.use('/api/responses', routes.responses);
app.use('/api/results', routes.results);
app.use('/api/assessment', routes.assessment);
app.use('/api/notes', routes.notes);
app.use('/api/admin', routes.admin);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
    
    server.close(() => {
      console.log('🔴 Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
    
    server.close(() => {
      console.log('🔴 Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      console.log('🚀 Calmify Mental Health Support Platform');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${MONGODB_URI}`);
      console.log(`🔗 CORS allowed origins: ${allowedOrigins.join(', ')}`);
      console.log('✅ Server started successfully');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { app, server, io };