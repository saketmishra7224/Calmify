const express = require('express');
const { Message, Session, User } = require('../models');
const { auth } = require('../utils');
const aiChatbot = require('../utils/aiChatbot');
const crisisDetection = require('../utils/crisisDetection');

const router = express.Router();

// Process patient message and return bot response
router.post('/message',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { sessionId, message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          error: 'Message is required'
        });
      }

      // Get session and verify it's a chatbot session
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      if (session.helperType !== 'chatbot') {
        return res.status(400).json({
          error: 'This endpoint is only for chatbot sessions'
        });
      }

      // Verify user is the patient in this session
      if (session.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Not authorized to send messages in this session'
        });
      }

      // Create patient message
      const patientMessage = new Message({
        sessionId: sessionId,
        senderId: req.user._id,
        message: message.trim(),
        senderRole: 'patient',
        messageType: 'text'
      });

      await patientMessage.save();

      // Process message for crisis detection
      let crisisAlert = null;
      try {
        const crisisResult = await crisisDetection.processMessageForCrisis(patientMessage);
        if (crisisResult.alert) {
          crisisAlert = crisisResult.alert;
          
          // Flag the message for crisis
          await patientMessage.flagForCrisis(
            crisisResult.analysis.severity,
            crisisResult.analysis.keywords.map(k => k.keyword),
            crisisResult.analysis.confidence
          );
        }
      } catch (crisisError) {
        console.error('Crisis detection error:', crisisError);
      }

      // Generate AI response
      const aiResponseData = await aiChatbot.generateAIResponse(
        patientMessage, 
        session, 
        req.user
      );

      const botMessage = new Message({
        sessionId: sessionId,
        senderId: req.user._id, // In production, this would be a bot user ID
        message: aiResponseData.content.text,
        senderRole: 'chatbot',
        messageType: 'text',
        metadata: aiResponseData.metadata
      });

      await botMessage.save();

      // If crisis detected, potentially escalate session
      if (crisisAlert && crisisAlert.severity === 'critical') {
        await session.escalateSession('critical', 'Crisis detected by AI chatbot');
      }

      res.json({
        message: 'Message processed successfully',
        patientMessage: {
          _id: patientMessage._id,
          message: patientMessage.message,
          createdAt: patientMessage.createdAt,
          crisisDetected: !!crisisAlert
        },
        botResponse: {
          _id: botMessage._id,
          message: botMessage.message,
          createdAt: botMessage.createdAt,
          intent: aiResponseData.metadata?.intent
        },
        crisisAlert: crisisAlert ? {
          _id: crisisAlert._id,
          severity: crisisAlert.severity,
          escalated: crisisAlert.severity === 'critical'
        } : null
      });
    } catch (error) {
      console.error('Chatbot message error:', error);
      res.status(500).json({
        error: 'Failed to process message',
        details: error.message
      });
    }
  }
);

// Run mental health screening (PHQ-9, GAD-7)
router.post('/assess',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { assessmentType, responses } = req.body;

      if (!assessmentType || !responses) {
        return res.status(400).json({
          error: 'Assessment type and responses are required'
        });
      }

      let score = 0;
      let severity = 'mild';
      let recommendations = [];

      if (assessmentType === 'PHQ-9') {
        // PHQ-9 Depression screening
        score = responses.reduce((sum, response) => sum + parseInt(response), 0);
        
        if (score >= 20) {
          severity = 'severe';
          recommendations = [
            'Your responses suggest severe depression symptoms',
            'Please consider speaking with a mental health professional immediately',
            'Contact the crisis hotline if you have thoughts of self-harm: 988'
          ];
        } else if (score >= 15) {
          severity = 'moderate-severe';
          recommendations = [
            'Your responses suggest moderately severe depression symptoms',
            'We recommend speaking with a counselor or therapist',
            'Consider reaching out to your healthcare provider'
          ];
        } else if (score >= 10) {
          severity = 'moderate';
          recommendations = [
            'Your responses suggest moderate depression symptoms',
            'Consider speaking with a mental health professional',
            'Self-care activities and support groups may be helpful'
          ];
        } else if (score >= 5) {
          severity = 'mild';
          recommendations = [
            'Your responses suggest mild depression symptoms',
            'Monitor your mood and consider self-care activities',
            'Reach out for support if symptoms worsen'
          ];
        } else {
          severity = 'minimal';
          recommendations = [
            'Your responses suggest minimal depression symptoms',
            'Continue with healthy lifestyle practices',
            'Stay connected with supportive people'
          ];
        }
      } else if (assessmentType === 'GAD-7') {
        // GAD-7 Anxiety screening
        score = responses.reduce((sum, response) => sum + parseInt(response), 0);
        
        if (score >= 15) {
          severity = 'severe';
          recommendations = [
            'Your responses suggest severe anxiety symptoms',
            'Please consider speaking with a mental health professional',
            'Anxiety management techniques may provide immediate relief'
          ];
        } else if (score >= 10) {
          severity = 'moderate';
          recommendations = [
            'Your responses suggest moderate anxiety symptoms',
            'Consider speaking with a counselor or therapist',
            'Practice relaxation techniques and mindfulness'
          ];
        } else if (score >= 5) {
          severity = 'mild';
          recommendations = [
            'Your responses suggest mild anxiety symptoms',
            'Try stress reduction techniques',
            'Regular exercise and good sleep habits can help'
          ];
        } else {
          severity = 'minimal';
          recommendations = [
            'Your responses suggest minimal anxiety symptoms',
            'Continue with healthy coping strategies',
            'Stay aware of your stress levels'
          ];
        }
      } else {
        return res.status(400).json({
          error: 'Invalid assessment type. Supported: PHQ-9, GAD-7'
        });
      }

      // Create assessment record (you might want to store this)
      const assessment = {
        userId: req.user._id,
        type: assessmentType,
        score,
        severity,
        responses,
        completedAt: new Date()
      };

      res.json({
        assessment: {
          type: assessmentType,
          score,
          severity,
          recommendations,
          completedAt: assessment.completedAt
        },
        nextSteps: severity === 'severe' ? 
          'We recommend immediate professional support' :
          'Continue monitoring your mental health'
      });
    } catch (error) {
      console.error('Assessment error:', error);
      res.status(500).json({
        error: 'Failed to process assessment',
        details: error.message
      });
    }
  }
);

// Get meditation and self-help content
router.get('/resources',
  auth.optionalAuth,
  async (req, res) => {
    try {
      const { category, mood } = req.query;

      const resources = {
        meditation: [
          {
            title: "5-Minute Breathing Exercise",
            description: "Simple breathing technique to reduce stress and anxiety",
            duration: "5 minutes",
            type: "audio",
            content: "Focus on your breath. Inhale for 4 counts, hold for 4, exhale for 6. Repeat 10 times.",
            tags: ["anxiety", "stress", "breathing"]
          },
          {
            title: "Body Scan Relaxation",
            description: "Progressive muscle relaxation to release tension",
            duration: "10 minutes",
            type: "guided",
            content: "Start at your toes and slowly work up your body, tensing and releasing each muscle group.",
            tags: ["relaxation", "sleep", "tension"]
          },
          {
            title: "Mindful Walking",
            description: "Combine movement with mindfulness",
            duration: "15 minutes",
            type: "activity",
            content: "Walk slowly and focus on each step, your breathing, and your surroundings.",
            tags: ["mindfulness", "exercise", "grounding"]
          }
        ],
        selfHelp: [
          {
            title: "Cognitive Behavioral Techniques",
            description: "Strategies to challenge negative thinking patterns",
            type: "worksheet",
            content: "Identify the thought → Examine the evidence → Consider alternatives → Balanced thinking",
            tags: ["CBT", "thinking", "depression"]
          },
          {
            title: "Gratitude Practice",
            description: "Daily gratitude exercises to improve mood",
            type: "journal",
            content: "Write down 3 things you're grateful for each day. Include why you're grateful for each.",
            tags: ["gratitude", "mood", "positivity"]
          },
          {
            title: "Crisis Safety Plan",
            description: "Step-by-step plan for managing crisis situations",
            type: "safety",
            content: "1. Warning signs 2. Coping strategies 3. Support contacts 4. Professional contacts 5. Safe environment",
            tags: ["crisis", "safety", "emergency"]
          }
        ],
        emergency: [
          {
            title: "Crisis Hotlines",
            description: "24/7 support for mental health emergencies",
            contacts: [
              { name: "Suicide & Crisis Lifeline", number: "988" },
              { name: "Crisis Text Line", number: "Text HOME to 741741" },
              { name: "Emergency Services", number: "911" }
            ]
          }
        ]
      };

      // Filter by category if specified
      let filteredResources = resources;
      if (category && resources[category]) {
        filteredResources = { [category]: resources[category] };
      }

      // Filter by mood/tags if specified
      if (mood) {
        Object.keys(filteredResources).forEach(key => {
          if (key !== 'emergency') {
            filteredResources[key] = filteredResources[key].filter(resource =>
              resource.tags && resource.tags.includes(mood.toLowerCase())
            );
          }
        });
      }

      res.json({
        resources: filteredResources,
        categories: Object.keys(resources),
        availableMoods: ["anxiety", "stress", "depression", "sleep", "crisis"]
      });
    } catch (error) {
      console.error('Get resources error:', error);
      res.status(500).json({
        error: 'Failed to get resources',
        details: error.message
      });
    }
  }
);

// Trigger escalation to human support
router.post('/escalate',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { sessionId, reason, preferredHelperType = 'counselor' } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID is required'
        });
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      // Verify user is the patient in this session
      if (session.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Not authorized to escalate this session'
        });
      }

      // Find available human helper
      const availableHelper = await User.findOne({
        role: preferredHelperType,
        isActive: true,
        isOnline: true
      });

      if (availableHelper) {
        // Direct escalation to available helper
        session.helperId = availableHelper._id;
        session.helperType = preferredHelperType;
        session.status = 'active';
        session.metadata.escalationReason = reason || 'User requested human support';
        await session.save();

        // Create system message about escalation
        const systemMessage = new Message({
          sessionId: sessionId,
          senderId: req.user._id,
          message: `Session escalated to ${preferredHelperType}. ${availableHelper.username} will assist you shortly.`,
          senderRole: 'system',
          messageType: 'escalation'
        });

        await systemMessage.save();

        res.json({
          message: 'Session escalated successfully',
          helper: {
            _id: availableHelper._id,
            username: availableHelper.username,
            role: availableHelper.role
          },
          estimatedWaitTime: '1-2 minutes'
        });
      } else {
        // No helper available, add to queue
        session.helperType = preferredHelperType;
        session.status = 'waiting';
        session.metadata.escalationReason = reason || 'User requested human support';
        await session.save();

        res.json({
          message: 'Added to support queue',
          queuePosition: await Session.countDocuments({
            helperType: preferredHelperType,
            status: 'waiting',
            createdAt: { $lt: session.createdAt }
          }) + 1,
          estimatedWaitTime: '5-15 minutes'
        });
      }
    } catch (error) {
      console.error('Escalation error:', error);
      res.status(500).json({
        error: 'Failed to escalate session',
        details: error.message
      });
    }
  }
);

module.exports = router;