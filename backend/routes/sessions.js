const express = require('express');
const { Session, User, Message } = require('../models');
const { auth, validation } = require('../utils');

const router = express.Router();

// Helper function to calculate urgency score
function calculateUrgencyScore(severity, waitingMinutes) {
  const severityScores = {
    'critical': 100,
    'severe': 75,
    'moderate': 50,
    'mild': 25
  };
  
  const baseScore = severityScores[severity] || 25;
  const waitingBonus = Math.min(waitingMinutes * 0.5, 50); // Max 50 bonus points for waiting
  
  return baseScore + waitingBonus;
}

// Create new chat session
router.post('/create',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { helperType, severity = 'mild', title, description, isPrivate = true, maxParticipants = 2 } = req.body;

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

      let status = 'waiting';
      let helperId = null;
      let startedAt = null;

      // For chatbot sessions, start immediately with no specific helper
      if (helperType === 'chatbot') {
        status = 'active';
        startedAt = new Date();
        // helperId remains null for chatbot sessions
      }
      // For human helpers (peer/counselor), always start in waiting status
      // They will be assigned when a helper accepts the session

      const session = new Session({
        patientId: req.user._id,
        helperId, // null for waiting sessions, null for chatbot
        helperType,
        severity,
        status,
        title: title || `${helperType} session`,
        description,
        isPrivate,
        maxParticipants,
        startedAt
      });

      await session.save();
      await session.populate('patientId', 'username profile anonymousId');

      // Provide different responses based on session type
      let responseMessage = '';
      let instructions = {};

      if (helperType === 'chatbot') {
        responseMessage = 'Chatbot session created and started successfully';
        instructions = {
          nextSteps: [
            'You can start chatting immediately',
            'Use /api/ai/chat to send messages and get AI responses'
          ],
          endpoints: {
            sendMessage: 'POST /api/messages',
            aiChat: 'POST /api/ai/chat'
          }
        };
      } else {
        responseMessage = 'Session created successfully and added to helper queue';
        instructions = {
          nextSteps: [
            'Your session is now waiting for an available helper',
            'You will be notified when a helper accepts your session',
            'You can check session status using the session ID'
          ],
          endpoints: {
            checkStatus: `GET /api/sessions/${session._id}`,
            startChatbot: `POST /api/sessions/${session._id}/start-chatbot`
          },
          estimatedWaitTime: 'Varies based on helper availability'
        };
      }

      res.status(201).json({
        message: responseMessage,
        session: {
          _id: session._id,
          patientId: session.patientId,
          helperId: session.helperId,
          helperType: session.helperType,
          severity: session.severity,
          status: session.status,
          title: session.title,
          description: session.description,
          isPrivate: session.isPrivate,
          maxParticipants: session.maxParticipants,
          createdAt: session.createdAt,
          startedAt: session.startedAt
        },
        instructions
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

      // Use the static method to find pending sessions
      const sessions = await Session.findPendingSessions(
        helperType || req.user.role, // Default to user's role if no specific type requested
        severity,
        parseInt(limit)
      );

      console.log(`Found ${sessions.length} available sessions for ${req.user.role}`);

      // Add waiting time to each session
      const sessionsWithWaitTime = sessions.map(session => {
        const waitingMinutes = Math.round((new Date() - session.createdAt) / (1000 * 60));
        return {
          ...session.toObject(),
          waitingMinutes,
          urgencyScore: calculateUrgencyScore(session.severity, waitingMinutes)
        };
      });

      // Sort by urgency score (combines severity and waiting time)
      sessionsWithWaitTime.sort((a, b) => b.urgencyScore - a.urgencyScore);

      res.json({
        sessions: sessionsWithWaitTime,
        totalWaiting: sessions.length,
        filters: {
          helperType: helperType || req.user.role,
          severity: severity || 'all'
        },
        instructions: {
          acceptEndpoint: `POST /api/sessions/{sessionId}/accept`,
          declineEndpoint: `POST /api/sessions/{sessionId}/decline`,
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

// Get user's sessions (moved before /:id to avoid routing conflicts)
router.get('/my-sessions',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { status = 'all', page = 1, limit = 10, role } = req.query;
      const skip = (page - 1) * limit;

      let query = {};
      
      // For patients, find sessions where they are the patient
      if (req.user.role === 'patient') {
        query = { patientId: req.user._id };
      } 
      // For helpers, find sessions where they are the helper
      else if (['peer', 'counselor'].includes(req.user.role)) {
        query = { helperId: req.user._id };
      }
      // For admins, they can see all sessions or filter by role
      else if (req.user.role === 'admin') {
        if (role === 'patient') {
          query = { patientId: req.user._id };
        } else if (role === 'helper') {
          query = { helperId: req.user._id };
        }
        // If no role specified, admin sees all their sessions (both as patient and helper)
        if (!role) {
          query = {
            $or: [
              { patientId: req.user._id },
              { helperId: req.user._id }
            ]
          };
        }
      }

      // Filter by status if not 'all'
      if (status !== 'all') {
        query.status = status;
      }

      const sessions = await Session.find(query)
        .populate('patientId', 'username profile anonymousId role')
        .populate('helperId', 'username profile role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Session.countDocuments(query);

      // Add calculated fields to sessions
      const sessionsWithMetadata = sessions.map(session => {
        const sessionObj = session.toObject();
        
        // Add duration if session is closed
        if (sessionObj.endedAt && sessionObj.startedAt) {
          sessionObj.durationMinutes = Math.round((new Date(sessionObj.endedAt) - new Date(sessionObj.startedAt)) / (1000 * 60));
        }
        
        // Add current waiting time if still waiting
        if (sessionObj.status === 'waiting') {
          sessionObj.waitingMinutes = Math.round((new Date() - new Date(sessionObj.createdAt)) / (1000 * 60));
        }
        
        // Add active duration for active sessions
        if (sessionObj.status === 'active' && sessionObj.startedAt) {
          sessionObj.activeDurationMinutes = Math.round((new Date() - new Date(sessionObj.startedAt)) / (1000 * 60));
        }
        
        // Add role context for the current user
        if (sessionObj.patientId._id.toString() === req.user._id.toString()) {
          sessionObj.userRole = 'patient';
        } else if (sessionObj.helperId && sessionObj.helperId._id.toString() === req.user._id.toString()) {
          sessionObj.userRole = 'helper';
        }
        
        return sessionObj;
      });

      // Calculate summary statistics
      const summary = {
        total,
        waiting: sessions.filter(s => s.status === 'waiting').length,
        active: sessions.filter(s => s.status === 'active').length,
        closed: sessions.filter(s => s.status === 'closed').length,
        escalated: sessions.filter(s => s.status === 'escalated').length
      };

      res.json({
        sessions: sessionsWithMetadata,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          status: status,
          role: role || 'all'
        },
        summary,
        userRole: req.user.role
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

      // Use the static method for finding pending sessions
      const pendingSessions = await Session.findPendingSessions(
        role,
        severity,
        parseInt(limit)
      );

      // Add waiting time and urgency scoring to each session
      const sessionsWithMetadata = pendingSessions.map(session => {
        const waitingMinutes = Math.round((new Date() - session.createdAt) / (1000 * 60));
        const urgencyScore = calculateUrgencyScore(session.severity, waitingMinutes);
        
        return {
          ...session.toObject(),
          waitingMinutes,
          urgencyScore,
          waitingHours: Math.round(waitingMinutes / 60 * 10) / 10 // rounded to 1 decimal
        };
      });

      // Sort by urgency score
      sessionsWithMetadata.sort((a, b) => b.urgencyScore - a.urgencyScore);

      res.json({
        queue: sessionsWithMetadata,
        totalPending: pendingSessions.length,
        role,
        queueStats: {
          critical: pendingSessions.filter(s => s.severity === 'critical').length,
          severe: pendingSessions.filter(s => s.severity === 'severe').length,
          moderate: pendingSessions.filter(s => s.severity === 'moderate').length,
          mild: pendingSessions.filter(s => s.severity === 'mild').length,
          averageWaitTime: sessionsWithMetadata.length > 0 
            ? Math.round(sessionsWithMetadata.reduce((sum, s) => sum + s.waitingMinutes, 0) / sessionsWithMetadata.length)
            : 0
        },
        instructions: {
          acceptSession: 'POST /api/sessions/{sessionId}/accept',
          declineSession: 'POST /api/sessions/{sessionId}/decline'
        }
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

// Get user's sessions (improved with better filtering)





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
          error: 'Can only accept sessions that are waiting for a helper',
          currentStatus: session.status
        });
      }

      if (session.helperId) {
        return res.status(409).json({
          error: 'Session already has a helper assigned',
          helperId: session.helperId
        });
      }

      // Check if helper role matches what's requested (but allow escalation)
      const canAccept = 
        session.helperType === req.user.role || 
        (session.helperType === 'peer' && req.user.role === 'counselor') ||
        req.user.role === 'admin';

      if (!canAccept) {
        return res.status(403).json({
          error: `This session is requesting a ${session.helperType}, but you are a ${req.user.role}`,
          suggestion: session.helperType === 'counselor' && req.user.role === 'peer' 
            ? 'This session requires a counselor. Consider declining if you cannot provide the required level of support.'
            : null
        });
      }

      // Accept the session using the model method
      await session.acceptSession(req.user._id);
      
      // If counselor accepts a peer session, upgrade the helper type
      if (session.helperType === 'peer' && req.user.role === 'counselor') {
        session.helperType = 'counselor';
        await session.save();
      }

      await session.populate('patientId', 'username profile anonymousId');
      await session.populate('helperId', 'username profile role');

      // Create welcome message if provided
      let welcomeMsg = null;
      if (welcomeMessage) {
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
          acceptedAt: session.acceptedAt,
          waitingTime: session.waitingTime,
          createdAt: session.createdAt
        },
        welcomeMessage: welcomeMsg ? {
          _id: welcomeMsg._id,
          message: welcomeMsg.message,
          createdAt: welcomeMsg.createdAt
        } : null,
        statistics: {
          waitingTimeMinutes: session.waitingTime,
          priorityLevel: session.severity
        },
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
            escalate: `PUT /api/sessions/${session._id}/escalate`,
            close: `POST /api/sessions/${session._id}/close`
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