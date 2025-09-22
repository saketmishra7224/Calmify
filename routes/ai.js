const express = require('express');
const { auth } = require('../utils');
const aiChatbot = require('../utils/aiChatbot');

const router = express.Router();

// Main AI chat endpoint for conversational interactions
router.post('/chat',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { message, sessionId, context, options = {} } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message is required'
        });
      }

      // Analyze user intent and generate response
      const intent = aiChatbot.analyzeIntent(message);
      const response = aiChatbot.generateResponse(intent, message);
      
      // Get confidence score
      const confidence = aiChatbot.getConfidenceScore ? 
        aiChatbot.getConfidenceScore(intent, message) : 0.8;

      // Check for crisis detection if enabled
      const crisisDetected = intent === 'crisis' || intent === 'self-harm';
      
      // Generate follow-up suggestions
      const suggestions = aiChatbot.generateSuggestions ? 
        aiChatbot.generateSuggestions(intent, message) : 
        ['Tell me more about that', 'How does that make you feel?', 'What would help you right now?'];

      // Get relevant resources if requested
      const resources = options.includeResources ? 
        aiChatbot.getMentalHealthResources().slice(0, 3) : [];

      res.json({
        response: {
          text: response,
          type: 'supportive-response',
          intent: intent,
          suggestions: suggestions.slice(0, 4),
          escalationNeeded: crisisDetected,
          resources: resources,
          followUpQuestions: [
            'How are you feeling about that?',
            'What would you like to explore next?',
            'Is there anything specific you need help with?'
          ].slice(0, 3)
        },
        metadata: {
          confidence: confidence,
          intent: intent,
          sentiment: 'neutral', // Could be enhanced with sentiment analysis
          crisisDetected: crisisDetected,
          riskLevel: crisisDetected ? 'high' : 'low',
          responseTime: 1.0,
          model: 'rule-based-chatbot',
          conversationId: sessionId || `conv_${Date.now()}`
        },
        analytics: {
          userEngagement: 'medium',
          topicProgression: 'appropriate',
          supportLevel: 'peer-appropriate'
        }
      });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({
        error: 'Failed to generate AI response',
        details: error.message
      });
    }
  }
);

// Get AI chatbot response for testing
router.post('/response',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message is required'
        });
      }

      const intent = aiChatbot.analyzeIntent(message);
      const response = aiChatbot.generateResponse(intent, message);

      res.json({
        intent,
        response,
        confidence: aiChatbot.getConfidenceScore ? aiChatbot.getConfidenceScore(intent, message) : 0.8
      });
    } catch (error) {
      console.error('AI response error:', error);
      res.status(500).json({
        error: 'Failed to generate AI response',
        details: error.message
      });
    }
  }
);

// Get mental health resources
router.get('/resources',
  auth.optionalAuth,
  async (req, res) => {
    try {
      const resources = aiChatbot.getMentalHealthResources();
      
      res.json({
        resources,
        message: 'Mental health resources and support information'
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

// Test intent detection
router.post('/analyze-intent',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          error: 'Text is required for analysis'
        });
      }

      const intent = aiChatbot.analyzeIntent(text);
      const shouldRespond = aiChatbot.shouldRespondToMessage(
        { content: { text } },
        [req.user] // Simulate single participant
      );

      res.json({
        text,
        intent,
        shouldRespond,
        availableIntents: Object.keys(aiChatbot.INTENT_PATTERNS)
      });
    } catch (error) {
      console.error('Intent analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze intent',
        details: error.message
      });
    }
  }
);

module.exports = router;