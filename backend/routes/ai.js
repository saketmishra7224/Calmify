const express = require('express');
const { auth } = require('../utils');
const { AIChat } = require('../models');
const { analyzeMessageForCrisis, processMessageForCrisis } = require('../utils/crisisDetection');
const OpenAI = require('openai');

const router = express.Router();

// Initialize Groq AI client (OpenAI compatible)
const initializeGroq = () => {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.log('Groq API Key not found, using fallback responses');
      return null;
    }

    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });

    console.log('✅ Groq AI client initialized for chatbot');
    return client;
  } catch (error) {
    console.error('Failed to initialize Groq AI client:', error.message);
    return null;
  }
};

const groqClient = initializeGroq();

// Database storage for conversations (replacing in-memory storage)

// Psychology expert system prompt
const PSYCHOLOGY_EXPERT_PROMPT = `You are Dr. Sarah, a compassionate and experienced clinical psychologist and mental health expert working for Calmify, a comprehensive mental health support platform. You specialize in cognitive behavioral therapy, mindfulness-based interventions, and crisis intervention.

Your role is to:
- Provide empathetic, non-judgmental support and active listening
- Offer evidence-based coping strategies and therapeutic techniques
- Help users understand their emotions and thought patterns
- Provide psychoeducation about mental health conditions
- Guide users through mindfulness and grounding exercises
- Recognize crisis situations and provide appropriate resources
- Encourage professional help when needed

IMPORTANT GUIDELINES:
- Always be warm, empathetic, and understanding
- Validate emotions and normalize mental health struggles
- Provide specific, actionable advice and coping strategies
- Keep responses concise but meaningful (2-4 sentences typically)
- NEVER diagnose or prescribe medication
- Always prioritize user safety and well-being
- If someone mentions self-harm, suicide, or crisis, immediately provide crisis resources
- Encourage professional therapy for ongoing support
- Use person-first language and avoid stigmatizing terms
- Remember details from the conversation to build rapport

Crisis Resources to provide when needed:
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- Emergency Services: 911
- SAMHSA National Helpline: 1-800-662-4357

Remember: You're here to provide support, hope, and practical tools for mental wellness.`;

// Simple psychology expert chatbot endpoint
router.post('/chat',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { message, conversationId } = req.body;
      const userId = req.user.id;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Find existing chat or create new one
      let chat;
      if (conversationId) {
        chat = await AIChat.findById(conversationId);
        if (!chat || chat.userId.toString() !== userId.toString()) {
          return res.status(404).json({
            success: false,
            error: 'Chat not found'
          });
        }
      } else {
        // Check if user has an active chat first
        chat = await AIChat.getActiveChat(userId);
        
        if (!chat) {
          // Create new chat if no active chat exists
          chat = await AIChat.createNewChat(userId);
        }
      }

      // Add user message to chat
      await chat.addMessage('user', message.trim());

      // CRISIS DETECTION FIRST - Before AI processing
      const crisisAnalysis = analyzeMessageForCrisis(message.trim());
      const crisisDetected = crisisAnalysis.isCrisis;

      console.log('🔍 Crisis analysis for message:', {
        message: message.trim().substring(0, 50) + '...',
        isCrisis: crisisDetected,
        severity: crisisAnalysis.severity,
        confidence: crisisAnalysis.confidence
      });

      // If crisis detected, process for automatic escalation IMMEDIATELY
      if (crisisDetected) {
        console.log('🚨 Crisis detected in AI chat - processing escalation...');

        try {
          // Import additional crisis functions
          const { createCrisisAlert } = require('../utils/crisisDetection');
          
          // Create crisis alert
          const alert = await createCrisisAlert(
            chat._id, // Use chat ID as message ID for AI chats
            userId,
            null, // AI chats don't have session IDs
            crisisAnalysis
          );

          console.log('✅ Crisis alert created:', alert._id);

          // For critical severity, user should be redirected to RequestCounselorPage
          if (crisisAnalysis.severity === 'critical') {
            console.log('� Critical crisis detected - will redirect user to RequestCounselorPage');
          }
        } catch (crisisError) {
          console.error('❌ Error processing crisis message:', crisisError);
        }
      }

      // Get recent conversation history for AI context
      const recentMessages = chat.getRecentMessages(20);

      let responseText;
      let isAIGenerated = false;

      // Try Groq AI first
      if (groqClient) {
        try {
          // Build messages for OpenAI
          const messages = [
            {
              role: 'system',
              content: PSYCHOLOGY_EXPERT_PROMPT
            }
          ];

          // Add conversation history (last 10 messages for context)
          const contextMessages = recentMessages.slice(-10);
          for (const msg of contextMessages) {
            messages.push({
              role: msg.role,
              content: msg.content
            });
          }

          const response = await groqClient.chat.completions.create({
            model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
            messages: messages,
            max_tokens: 400,
            temperature: 0.7,
            top_p: 0.9
          });

          responseText = response.choices[0]?.message?.content;
          isAIGenerated = true;

        } catch (aiError) {
          console.error('Groq AI error:', aiError);
          responseText = null;
        }
      }

      // Fallback to rule-based responses if AI fails
      if (!responseText) {
        responseText = generateFallbackResponse(message.trim());
      }

      // Add crisis response to the bot's message if crisis was detected
      if (crisisDetected && crisisAnalysis.severity === 'critical') {
        const crisisResponse = "\n\n🚨 I'm very concerned about what you've shared. I want to connect you with professional help right away. If this is an immediate emergency, please call 911 or the crisis hotline at 988. Let me help you request a counselor session for immediate support.";
        responseText += crisisResponse;
      } else if (crisisDetected && crisisAnalysis.severity === 'high') {
        const crisisResponse = "\n\n⚠️ I'm concerned about what you've shared. Professional support is available if you need it. If this becomes urgent, please call 911 or the crisis hotline at 988. You're not alone in this.";
        responseText += crisisResponse;
      }

      // Add bot response to chat with crisis information
      await chat.addMessage('assistant', responseText, crisisDetected);

      res.json({
        success: true,
        data: {
          response: responseText,
          conversationId: chat._id,
          isAIGenerated,
          crisisDetected,
          crisisInfo: crisisDetected ? {
            severity: crisisAnalysis.severity,
            confidence: Math.round(crisisAnalysis.confidence * 100),
            redirectToCounselor: crisisAnalysis.severity === 'critical'
          } : null,
          timestamp: new Date().toISOString(),
          title: chat.title
        }
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate response',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Fallback responses for when AI is unavailable
const generateFallbackResponse = (message) => {
  const text = message.toLowerCase();
  
  // Crisis detection - use comprehensive crisis analysis
  const crisisAnalysis = analyzeMessageForCrisis(message);
  if (crisisAnalysis.isCrisis) {
    if (crisisAnalysis.severity === 'critical') {
      return "I'm very concerned about what you've shared with me. Your life has value and there are people who want to help. I've immediately notified our crisis support team and they will reach out to you very soon. For immediate help: National Suicide Prevention Lifeline at 988, Crisis Text Line by texting HOME to 741741, or call 911 if you're in immediate danger. You don't have to go through this alone.";
    } else {
      return "I'm concerned about what you've shared, and I want you to know that support is available. Our team has been notified and someone will reach out to provide additional help. In the meantime, if you need immediate support: 988 for crisis support, or text HOME to 741741. You matter, and there are people who care about you.";
    }
  }

  // Greeting
  if (text.includes('hello') || text.includes('hi') || text.match(/^(good morning|good afternoon|good evening)/)) {
    return "Hello! I'm Dr. Sarah, and I'm here to support you. It takes courage to reach out, and I'm glad you're here. How are you feeling today, and what would you like to talk about?";
  }

  // Depression/sadness
  if (text.includes('depressed') || text.includes('sad') || text.includes('hopeless') || text.includes('empty')) {
    return "I hear that you're going through a really difficult time, and I want you to know that your feelings are completely valid. Depression can make everything feel overwhelming, but you're not alone in this. Can you tell me a bit more about what's been weighing on your mind lately?";
  }

  // Anxiety/worry
  if (text.includes('anxious') || text.includes('worried') || text.includes('panic') || text.includes('stressed')) {
    return "Anxiety can feel incredibly overwhelming, and I want you to know that what you're experiencing is real and valid. Let's take this one step at a time. First, try taking a slow, deep breath with me. Would you like to try a simple grounding technique, or would you prefer to talk about what's been causing these anxious feelings?";
  }

  // Stress
  if (text.includes('stressed') || text.includes('overwhelmed') || text.includes('pressure')) {
    return "It sounds like you're carrying a heavy load right now, and that's really challenging. Stress can affect us both mentally and physically. Let's work together to find some ways to help you feel more balanced. What's been your biggest source of stress lately?";
  }

  // Sleep issues
  if (text.includes('sleep') || text.includes('insomnia') || text.includes('tired')) {
    return "Sleep difficulties can really impact our mental health and daily functioning. This is very common, especially when we're dealing with stress or emotional challenges. Can you tell me more about your sleep patterns? Are you having trouble falling asleep, staying asleep, or both?";
  }

  // Relationships
  if (text.includes('relationship') || text.includes('family') || text.includes('friend') || text.includes('partner')) {
    return "Relationships can be both a source of great joy and significant stress. It sounds like you might be navigating some challenges in this area. Healthy relationships require communication, boundaries, and mutual respect. Would you like to share more about what's happening in your relationships?";
  }

  // Therapy/help seeking
  if (text.includes('therapy') || text.includes('therapist') || text.includes('counselor') || text.includes('help')) {
    return "Seeking help is actually a sign of strength and self-awareness. Therapy can provide you with personalized tools and support to navigate life's challenges. While I can offer support and coping strategies, working with a licensed therapist can provide deeper, ongoing care. Would you like some guidance on finding a therapist or would you like to explore some coping strategies we can work on together?";
  }

  // Default supportive response
  return "Thank you for sharing that with me. I can hear that this is important to you, and I want to make sure I understand what you're going through. Your feelings and experiences matter. Can you tell me a bit more about what's on your mind or how you've been feeling lately?";
};

// Crisis detection is now handled by the comprehensive crisisDetection utility

// Get user's chat history
router.get('/chats',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const chats = await AIChat.getUserChatHistory(userId, limit);

      res.json({
        success: true,
        data: chats
      });
    } catch (error) {
      console.error('Get chat history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat history'
      });
    }
  }
);

// Create new chat
router.post('/chats/new',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { title } = req.body;

      const chat = await AIChat.createNewChat(userId, title);

      res.json({
        success: true,
        data: {
          id: chat._id,
          title: chat.title,
          createdAt: chat.createdAt
        }
      });
    } catch (error) {
      console.error('Create new chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create new chat'
      });
    }
  }
);

// Get specific chat with messages
router.get('/chats/:chatId',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;

      const chat = await AIChat.findById(chatId);
      
      if (!chat || chat.userId.toString() !== userId.toString()) {
        return res.status(404).json({
          success: false,
          error: 'Chat not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: chat._id,
          title: chat.title,
          messages: chat.messages,
          crisisDetected: chat.crisisDetected,
          createdAt: chat.createdAt,
          lastMessageAt: chat.lastMessageAt
        }
      });
    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat'
      });
    }
  }
);

// Get active chat
router.get('/chats/active/current',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const chat = await AIChat.getActiveChat(userId);

      res.json({
        success: true,
        data: chat || null
      });
    } catch (error) {
      console.error('Get active chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active chat'
      });
    }
  }
);

// Close chat session
router.patch('/chats/:chatId/close',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { chatId } = req.params;

      const chat = await AIChat.findById(chatId);
      
      if (!chat || chat.userId.toString() !== userId.toString()) {
        return res.status(404).json({
          success: false,
          error: 'Chat not found'
        });
      }

      await chat.markInactive();

      res.json({
        success: true,
        data: {
          id: chat._id,
          title: chat.title,
          isActive: chat.isActive
        }
      });
    } catch (error) {
      console.error('Close chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to close chat'
      });
    }
  }
);

module.exports = router;