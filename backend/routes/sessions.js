const express = require('express');
const { Session, User, Message } = require('../models');
const { auth, validation } = require('../utils');

const router = express.Router();

// Create new chat session
router.post('/create',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { helperType, severity = 'mild', title, description } = req.body;

      // Validate helper type
      const validHelperTypes = ['chatbot', 'peer', 'counselor'];
      if (!validHelperTypes.includes(helperType)) {
        return res.status(400).json({
          error: 'Invalid helper type. Must be chatbot, peer, or counselor'
        });
      }

      // Only patients can create sessions
      if (req.user.role !== 'patient') {
        return res.status(403).json({
          error: 'Only patients can create new sessions'
        });
      }

      let helperId = null;
      let status = 'waiting';

      // For chatbot sessions, start immediately
      if (helperType === 'chatbot') {
        status = 'active';
        // For chatbot, we can create a virtual helper or leave helperId as null
        // The AI will handle responses through the /api/ai/chat endpoint
      } else {
        // For human helpers, find available helper
        const availableHelper = await User.findOne({
          role: helperType,
          isActive: true,
          isOnline: true
        });

        if (availableHelper) {
          helperId = availableHelper._id;
          status = 'active';
        } else {
          // If no helper available, session stays in waiting status
          console.log(`No ${helperType} available, session will wait in queue`);
        }
      }

      const session = new Session({
        patientId: req.user._id,
        helperId,
        helperType,
        severity,
        status,
        title: title || `${helperType} session`,
        description,
        startedAt: status === 'active' ? new Date() : null
      });

      await session.save();
      await session.populate('patientId', 'username profile anonymousId');
      if (helperId) {
        await session.populate('helperId', 'username profile role');
      }

      res.status(201).json({
        message: 'Session created successfully',
        session
      });
    } catch (error) {
      console.error('Session creation error:', error);
      res.status(500).json({
        error: 'Session creation failed',
        details: error.message
      });
    }
  }
);

// Get available sessions for helpers to join
router.get('/available',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { helperType, severity, limit = 10 } = req.query;

      // Only helpers can view available sessions
      if (!['peer', 'counselor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Only helpers can view available sessions'
        });
      }

      const query = {
        status: 'waiting',
        helperId: null
      };

      // Filter by helper type if specified
      if (helperType) {
        query.helperType = helperType;
      }

      // Filter by severity if specified
      if (severity) {
        query.severity = severity;
      }

      console.log('Available sessions query:', JSON.stringify(query));

      const sessions = await Session.find(query)
        .populate('patientId', 'username profile anonymousId')
        .sort({ 
          severity: -1,  // Higher severity first
          createdAt: 1   // Older sessions first within same severity
        })
        .limit(parseInt(limit));

      console.log(`Found ${sessions.length} available sessions`);

      // Add waiting time to each session
      const sessionsWithWaitTime = sessions.map(session => ({
        ...session.toObject(),
        waitingMinutes: Math.round((new Date() - session.createdAt) / (1000 * 60))
      }));

      res.json({
        sessions: sessionsWithWaitTime,
        totalWaiting: sessions.length,
        instructions: {
          acceptEndpoint: `POST /api/sessions/{sessionId}/accept`,
          note: 'Use the accept endpoint to accept a session and start helping'
        }
      });
    } catch (error) {
      console.error('Get available sessions error:', error);
      res.status(500).json({
        error: 'Failed to get available sessions',
        details: error.message
      });
    }
  }
);

// Get session details and message history
router.get('/:id',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const sessionId = req.params.id;

      const session = await Session.findById(sessionId)
        .populate('patientId', 'username profile anonymousId role')
        .populate('helperId', 'username profile role');

      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      // Check access permissions
      const isPatient = session.patientId._id.toString() === req.user._id.toString();
      const isHelper = session.helperId && session.helperId._id.toString() === req.user._id.toString();
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);

      if (!isPatient && !isHelper && !isCounselorOrAdmin) {
        return res.status(403).json({
          error: 'Access denied to this session'
        });
      }

      // Get recent messages (last 50)
      const messages = await Message.find({
        sessionId: sessionId,
        'metadata.isDeleted': false
      })
        .populate('senderId', 'username profile anonymousId role')
        .sort({ createdAt: -1 })
        .limit(50);

      // Mark messages as read by current user
      const unreadMessages = messages.filter(msg => 
        !msg.readBy.some(r => r.user.toString() === req.user._id.toString())
      );

      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(msg => msg.markAsRead(req.user._id))
        );
      }

      res.json({
        session,
        messages: messages.reverse(), // Return in chronological order
        messageCount: messages.length
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        error: 'Failed to get session',
        details: error.message
      });
    }
  }
);

// Escalate session to higher care level
router.put('/:id/escalate',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { newSeverity, reason } = req.body;

      const session = await Session.findById(sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      // Check permissions - patient, current helper, or counselor/admin
      const isPatient = session.patientId.toString() === req.user._id.toString();
      const isHelper = session.helperId && session.helperId.toString() === req.user._id.toString();
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);

      if (!isPatient && !isHelper && !isCounselorOrAdmin) {
        return res.status(403).json({
          error: 'Not authorized to escalate this session'
        });
      }

      // Validate severity level
      const validSeverities = ['mild', 'moderate', 'severe', 'critical'];
      if (!validSeverities.includes(newSeverity)) {
        return res.status(400).json({
          error: 'Invalid severity level'
        });
      }

      // Escalate session
      await session.escalateSession(newSeverity, reason);

      // If escalating to critical, try to find a counselor
      if (newSeverity === 'critical') {
        const availableCounselor = await User.findOne({
          role: 'counselor',
          isActive: true,
          isOnline: true
        });

        if (availableCounselor) {
          session.helperId = availableCounselor._id;
          session.helperType = 'counselor';
          await session.save();
        }
      }

      await session.populate('patientId', 'username profile anonymousId');
      await session.populate('helperId', 'username profile role');

      res.json({
        message: 'Session escalated successfully',
        session
      });
    } catch (error) {
      console.error('Escalate session error:', error);
      res.status(500).json({
        error: 'Failed to escalate session',
        details: error.message
      });
    }
  }
);

// Close session with rating and feedback
router.post('/:id/close',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { rating, feedback, notes } = req.body;

      const session = await Session.findById(sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      // Check permissions - patient, helper, or counselor/admin
      const isPatient = session.patientId.toString() === req.user._id.toString();
      const isHelper = session.helperId && session.helperId.toString() === req.user._id.toString();
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);

      if (!isPatient && !isHelper && !isCounselorOrAdmin) {
        return res.status(403).json({
          error: 'Not authorized to close this session'
        });
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          error: 'Rating must be between 1 and 5'
        });
      }

      // Close session
      await session.endSession(notes, rating, feedback);

      res.json({
        message: 'Session closed successfully',
        session: {
          _id: session._id,
          status: session.status,
          rating: session.rating,
          feedback: session.feedback,
          endedAt: session.endedAt,
          durationMinutes: session.durationMinutes
        }
      });
    } catch (error) {
      console.error('Close session error:', error);
      res.status(500).json({
        error: 'Failed to close session',
        details: error.message
      });
    }
  }
);

// Get pending sessions for peer/counselor queue
router.get('/queue/:role',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { role } = req.params;
      const { severity, limit = 20 } = req.query;

      // Validate role and user permissions
      const validRoles = ['peer', 'counselor'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role. Must be peer or counselor'
        });
      }

      // Check if user has permission to view this queue
      if (req.user.role !== role && !['counselor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Not authorized to view this queue'
        });
      }

      const query = {
        helperType: role,
        status: 'waiting',
        helperId: null
      };

      if (severity) {
        query.severity = severity;
      }

      const pendingSessions = await Session.find(query)
        .populate('patientId', 'username profile anonymousId')
        .sort({ 
          severity: -1, // Critical first
          createdAt: 1  // Older first within same severity
        })
        .limit(parseInt(limit));

      // Add waiting time to each session
      const sessionsWithWaitTime = pendingSessions.map(session => ({
        ...session.toObject(),
        waitingMinutes: Math.round((new Date() - session.createdAt) / (1000 * 60))
      }));

      res.json({
        queue: sessionsWithWaitTime,
        totalPending: pendingSessions.length,
        role
      });
    } catch (error) {
      console.error('Get queue error:', error);
      res.status(500).json({
        error: 'Failed to get session queue',
        details: error.message
      });
    }
  }
);

// Get user's sessions
router.get('/my-sessions',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { status = 'active', page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const query = {
        'participants.user': req.user._id,
        'participants.leftAt': { $exists: false }
      };

      if (status !== 'all') {
        query.status = status;
      }

      const sessions = await Session.find(query)
        .populate('createdBy', 'username profile.firstName profile.lastName role')
        .populate('participants.user', 'username profile.firstName profile.lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Session.countDocuments(query);

      res.json({
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        error: 'Failed to get sessions',
        details: error.message
      });
    }
  }
);



// Start chatbot session or convert waiting session to chatbot
router.post('/:sessionId/start-chatbot',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const session = await Session.findById(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      // Verify user has access to this session
      const isPatient = session.patientId.toString() === req.user._id.toString();
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);
      
      if (!isPatient && !isCounselorOrAdmin) {
        return res.status(403).json({
          error: 'Not authorized to start chatbot for this session'
        });
      }

      // Only allow for waiting sessions or sessions that want chatbot help
      if (session.status !== 'waiting' && session.helperType !== 'chatbot') {
        return res.status(400).json({
          error: 'Can only start chatbot for waiting sessions or chatbot sessions'
        });
      }

      // Convert to active chatbot session
      session.helperType = 'chatbot';
      session.status = 'active';
      session.startedAt = new Date();
      session.helperId = null; // Chatbot doesn't need a specific helper ID
      
      await session.save();
      await session.populate('patientId', 'username profile');

      // Create welcome message from chatbot
      const welcomeMessage = new Message({
        sessionId: session._id,
        senderId: req.user._id,
        message: 'Hello! I\'m here to provide support and guidance. How are you feeling today, and what would you like to talk about?',
        senderRole: 'chatbot',
        messageType: 'text',
        metadata: {
          aiGenerated: true,
          intent: 'welcome'
        }
      });

      await welcomeMessage.save();

      res.json({
        message: 'Chatbot session started successfully',
        session: {
          _id: session._id,
          status: session.status,
          helperType: session.helperType,
          startedAt: session.startedAt
        },
        welcomeMessage: {
          _id: welcomeMessage._id,
          message: welcomeMessage.message,
          createdAt: welcomeMessage.createdAt
        },
        instructions: {
          chatEndpoint: '/api/ai/chat',
          messageEndpoint: '/api/messages',
          note: 'You can now send messages and get AI responses immediately'
        }
      });
    } catch (error) {
      console.error('Start chatbot session error:', error);
      res.status(500).json({
        error: 'Failed to start chatbot session',
        details: error.message
      });
    }
  }
);

// Accept a waiting session as a helper (counselor/peer)
router.post('/:sessionId/accept',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { message: welcomeMessage } = req.body;

      // Verify user is qualified to be a helper
      if (!['peer', 'counselor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Only peers, counselors, and admins can accept sessions'
        });
      }

      const session = await Session.findById(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      if (session.status !== 'waiting') {
        return res.status(400).json({
          error: 'Can only accept sessions that are waiting for a helper'
        });
      }

      if (session.helperId) {
        return res.status(409).json({
          error: 'Session already has a helper assigned'
        });
      }

      // Check if helper role matches what's requested (but allow escalation)
      const canAccept = 
        session.helperType === req.user.role || 
        (session.helperType === 'peer' && req.user.role === 'counselor') ||
        req.user.role === 'admin';

      if (!canAccept) {
        return res.status(403).json({
          error: `This session is requesting a ${session.helperType}, but you are a ${req.user.role}`
        });
      }

      // Accept the session
      session.helperId = req.user._id;
      session.status = 'active';
      session.startedAt = new Date();
      
      // If counselor accepts a peer session, upgrade the helper type
      if (session.helperType === 'peer' && req.user.role === 'counselor') {
        session.helperType = 'counselor';
      }

      await session.save();
      await session.populate('patientId', 'username profile');
      await session.populate('helperId', 'username profile role');

      // Create welcome message if provided
      let welcomeMsg = null;
      if (welcomeMessage) {
        const Message = require('../models/Message');
        welcomeMsg = new Message({
          sessionId: session._id,
          senderId: req.user._id,
          message: welcomeMessage,
          senderRole: req.user.role,
          messageType: 'text',
          metadata: {
            isWelcomeMessage: true
          }
        });
        await welcomeMsg.save();
      }

      res.json({
        message: 'Session accepted successfully',
        session: {
          _id: session._id,
          patientId: session.patientId,
          helperId: session.helperId,
          helperType: session.helperType,
          status: session.status,
          severity: session.severity,
          title: session.title,
          description: session.description,
          startedAt: session.startedAt,
          createdAt: session.createdAt
        },
        welcomeMessage: welcomeMsg ? {
          _id: welcomeMsg._id,
          message: welcomeMsg.message,
          createdAt: welcomeMsg.createdAt
        } : null,
        instructions: {
          nextSteps: [
            'Send a welcome message to introduce yourself',
            'Ask about their current situation and feelings',
            'Provide support and active listening',
            'Use /api/messages to send messages',
            'Monitor for any crisis indicators'
          ],
          endpoints: {
            sendMessage: 'POST /api/messages',
            getMessages: `GET /api/messages/session/${session._id}`,
            escalate: 'POST /api/urgent/escalate'
          }
        }
      });
    } catch (error) {
      console.error('Accept session error:', error);
      res.status(500).json({
        error: 'Failed to accept session',
        details: error.message
      });
    }
  }
);

// Decline a waiting session (for helpers who can't accept)
router.post('/:sessionId/decline',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { reason } = req.body;

      if (!['peer', 'counselor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Only helpers can decline sessions'
        });
      }

      const session = await Session.findById(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      if (session.status !== 'waiting') {
        return res.status(400).json({
          error: 'Can only decline sessions that are waiting'
        });
      }

      // Add decline record to session metadata
      if (!session.metadata) {
        session.metadata = {};
      }
      if (!session.metadata.declines) {
        session.metadata.declines = [];
      }

      session.metadata.declines.push({
        helperId: req.user._id,
        helperRole: req.user.role,
        reason: reason || 'Helper unavailable',
        declinedAt: new Date()
      });

      // Mark session as modified to save metadata
      session.markModified('metadata');
      await session.save();

      res.json({
        message: 'Session declined successfully',
        note: 'Session remains available for other helpers to accept',
        sessionStatus: session.status,
        declinesCount: session.metadata.declines.length
      });
    } catch (error) {
      console.error('Decline session error:', error);
      res.status(500).json({
        error: 'Failed to decline session',
        details: error.message
      });
    }
  }
);

// Join session
router.post('/:sessionId/join',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const session = await Session.findById(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      if (session.status !== 'active') {
        return res.status(400).json({
          error: 'Session is not active'
        });
      }

      await session.addParticipant(req.user._id);
      await session.populate('participants.user', 'username profile.firstName profile.lastName role');

      res.json({
        message: 'Joined session successfully',
        session
      });
    } catch (error) {
      console.error('Join session error:', error);
      
      if (error.message.includes('already in this session') || error.message.includes('full')) {
        return res.status(400).json({
          error: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to join session',
        details: error.message
      });
    }
  }
);

// Leave session
router.post('/:sessionId/leave',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const session = await Session.findById(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      await session.removeParticipant(req.user._id);

      res.json({
        message: 'Left session successfully'
      });
    } catch (error) {
      console.error('Leave session error:', error);
      res.status(500).json({
        error: 'Failed to leave session',
        details: error.message
      });
    }
  }
);

// Get session details
router.get('/:sessionId',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const session = await Session.findById(req.params.sessionId)
        .populate('createdBy', 'username profile.firstName profile.lastName role')
        .populate('participants.user', 'username profile.firstName profile.lastName role');

      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      // Check if user is participant or has access
      const isParticipant = session.participants.some(
        p => p.user._id.toString() === req.user._id.toString() && !p.leftAt
      );

      const isCreator = session.createdBy._id.toString() === req.user._id.toString();
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);

      if (!isParticipant && !isCreator && !isCounselorOrAdmin && session.isPrivate) {
        return res.status(403).json({
          error: 'Access denied to private session'
        });
      }

      res.json({
        session
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        error: 'Failed to get session',
        details: error.message
      });
    }
  }
);

// End session (only creator or counselor/admin)
router.post('/:sessionId/end',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const session = await Session.findById(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      const isCreator = session.createdBy.toString() === req.user._id.toString();
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);

      if (!isCreator && !isCounselorOrAdmin) {
        return res.status(403).json({
          error: 'Only session creator or counselor/admin can end session'
        });
      }

      session.status = 'ended';
      session.endedAt = new Date();
      await session.save();

      res.json({
        message: 'Session ended successfully',
        session
      });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({
        error: 'Failed to end session',
        details: error.message
      });
    }
  }
);

module.exports = router;