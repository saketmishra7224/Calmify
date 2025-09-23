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

// Initialize Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_ORIGIN || "http://localhost:3000",
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
  origin: process.env.SOCKET_ORIGIN || "http://localhost:3000",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

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

  // Handle user joining a session
  socket.on('join-session', async (data) => {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('error', { 
          event: 'join-session',
          message: 'Session ID is required' 
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

      console.log(`📱 User ${socket.user.username} joined session: ${sessionId}`);
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

      // Create message
      const newMessage = new Message({
        sessionId: sessionId,
        senderId: socket.userId,
        message: message.trim(),
        senderRole: socket.user.role,
        messageType,
        replyTo
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
          createdAt: newMessage.createdAt,
          replyTo: newMessage.replyTo,
          crisisDetected: !!newMessage.crisisDetection.isCrisis
        },
        timestamp: new Date()
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

      // Escalate session
      await session.escalateSession(newSeverity, reason);

      // Try to find new helper if escalating helper type
      if (targetHelperType && targetHelperType !== session.helperType) {
        const newHelper = await User.findOne({
          role: targetHelperType,
          isActive: true,
          isOnline: true
        });

        if (newHelper) {
          session.helperId = newHelper._id;
          session.helperType = targetHelperType;
          await session.save();

          // Add new helper to session room
          const helperSocket = [...io.sockets.sockets.values()]
            .find(s => s.userId === newHelper._id.toString());
          
          if (helperSocket) {
            helperSocket.join(`session_${sessionId}`);
          }
        }
      }

      // Notify all session participants about escalation
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
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit('error', { 
          event: 'leave-session',
          message: 'Session ID is required' 
        });
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

      if (socket.currentSession === sessionId) {
        socket.currentSession = null;
      }

      console.log(`📱 User ${socket.user.username} left session: ${sessionId}`);
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
      console.log('🚀 Saneyar Mental Health Support Platform');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${MONGODB_URI}`);
      console.log(`🔗 Socket.io CORS origin: ${process.env.SOCKET_ORIGIN || 'http://localhost:3000'}`);
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