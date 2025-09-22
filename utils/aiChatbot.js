const { PHQ9_QUESTIONS, GAD7_QUESTIONS, calculatePHQ9Score, calculateGAD7Score } = require('./crisisDetection');
const OpenAI = require('openai');

// Initialize Azure OpenAI client
const initializeAzureOpenAI = () => {
  try {
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      console.log('Azure OpenAI credentials not found, using fallback responses');
      return null;
    }

    const client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
      defaultHeaders: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      }
    });

    console.log('✅ Azure OpenAI client initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize Azure OpenAI client:', error.message);
    return null;
  }
};

const azureOpenAIClient = initializeAzureOpenAI();

/**
 * AI Chatbot System for Mental Health Support
 * Provides greeting, assessment, crisis detection, and coping strategies
 */

/**
 * Intent Recognition System
 */
const INTENTS = {
  // Greetings and initial contact
  greeting: {
    patterns: [
      /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
      /^(greetings|what's up|how are you)/i
    ],
    confidence: 0.9
  },
  
  // Crisis and emergency
  crisis: {
    patterns: [
      /(suicide|kill myself|want to die|end it all|hurt myself)/i,
      /(emergency|urgent|help me|crisis|can't go on)/i,
      /(overdose|cutting|self harm|jumping|pills)/i
    ],
    confidence: 0.95
  },
  
  // Mental health assessment
  assessment: {
    patterns: [
      /(assessment|screening|questionnaire|evaluate|test)/i,
      /(depression test|anxiety test|mental health check)/i,
      /(phq|gad|mood|feeling)/i
    ],
    confidence: 0.8
  },
  
  // Emotional states
  depression: {
    patterns: [
      /(depressed|sad|down|hopeless|empty|worthless)/i,
      /(tired|exhausted|no energy|can't sleep|sleeping too much)/i,
      /(no interest|no pleasure|don't care|what's the point)/i
    ],
    confidence: 0.8
  },
  
  anxiety: {
    patterns: [
      /(anxious|worried|nervous|panic|scared|afraid)/i,
      /(can't relax|restless|on edge|overwhelmed)/i,
      /(racing thoughts|can't stop worrying|stressed)/i
    ],
    confidence: 0.8
  },
  
  // Coping and support
  coping: {
    patterns: [
      /(how to cope|coping strategies|what can I do|help me deal)/i,
      /(techniques|methods|ways to feel better|manage)/i,
      /(breathing|meditation|relaxation|grounding)/i
    ],
    confidence: 0.7
  },
  
  // Information seeking
  information: {
    patterns: [
      /(what is|tell me about|explain|information)/i,
      /(resources|support|help available)/i
    ],
    confidence: 0.6
  },
  
  // Escalation requests
  escalation: {
    patterns: [
      /(talk to counselor|speak to human|real person|professional)/i,
      /(not helping|need more help|this isn't working)/i
    ],
    confidence: 0.8
  }
};

/**
 * Response Templates
 */
const RESPONSES = {
  greeting: {
    initial: [
      "Hello! I'm here to provide support and help you through whatever you're experiencing. How are you feeling today?",
      "Hi there! I'm glad you reached out. I'm here to listen and support you. What's on your mind?",
      "Welcome! I'm a mental health support assistant. I'm here to help you feel better and find the support you need. How can I help you today?"
    ],
    returning: [
      "Welcome back! I'm here to continue supporting you. How have you been since we last talked?",
      "Good to see you again! How are you feeling today compared to our last conversation?",
      "Hello again! I'm glad you came back. What would you like to talk about today?"
    ]
  },
  
  crisis: {
    immediate: [
      "I'm really concerned about what you're going through right now. Your safety is the most important thing. Let me connect you with someone who can help immediately.",
      "Thank you for reaching out - that takes courage. I want to make sure you get immediate support. I'm alerting a crisis counselor right now.",
      "I can hear that you're in a lot of pain right now. You don't have to go through this alone. I'm getting you connected with immediate professional help."
    ],
    safety: [
      "While we're getting you connected with a counselor, please know:\n• Crisis Text Line: Text HOME to 741741\n• National Suicide Prevention Lifeline: 988\n• Emergency Services: 911",
      "If you're in immediate danger, please contact emergency services at 911. For crisis support, text HOME to 741741 or call 988.",
      "You matter and your life has value. Help is available:\n• 988 Suicide & Crisis Lifeline\n• Crisis Text Line: 741741\n• Emergency: 911"
    ]
  },
  
  assessment: {
    intro: [
      "I can help you with a mental health screening to better understand how you're feeling. Would you like to take a brief depression assessment (PHQ-9) or anxiety assessment (GAD-7)?",
      "Mental health assessments can help us understand your current state better. I can guide you through standardized screenings for depression or anxiety. Which would be helpful?",
      "I have validated screening tools that can help assess your mental health. Would you prefer to start with a depression screening or anxiety screening?"
    ],
    phq9_start: "I'll guide you through a 9-question depression screening. For each question, think about how often you've felt this way over the last 2 weeks. Rate each from 0 (not at all) to 3 (nearly every day).",
    gad7_start: "I'll guide you through a 7-question anxiety screening. Think about how often you've been bothered by these problems over the last 2 weeks. Rate each from 0 (not at all) to 3 (nearly every day)."
  },
  
  support: {
    empathy: [
      "I can hear that you're going through a difficult time. Your feelings are valid and it's okay to struggle.",
      "Thank you for sharing that with me. It takes strength to reach out when you're hurting.",
      "I want you to know that you're not alone in feeling this way. Many people experience similar struggles."
    ],
    validation: [
      "Your feelings are completely understandable given what you're experiencing.",
      "It's normal to feel overwhelmed sometimes. You're doing the best you can.",
      "Acknowledging these feelings is actually a sign of self-awareness and strength."
    ]
  },
  
  coping: {
    breathing: "Let's try a simple breathing exercise: Breathe in slowly for 4 counts, hold for 4, then breathe out for 6. This can help calm your nervous system. Would you like to try this a few times?",
    grounding: "When feeling overwhelmed, try the 5-4-3-2-1 grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This helps bring you back to the present moment.",
    selfcare: "Some immediate self-care strategies: Take a warm shower, listen to calming music, go for a short walk, or reach out to a trusted friend. What feels most manageable for you right now?"
  },
  
  escalation: {
    offer: [
      "I understand you'd like to speak with a human counselor. Let me see who's available to help you right now.",
      "Of course! I can connect you with a professional counselor who can provide more personalized support.",
      "That's completely understandable. I'll help you get connected with a trained mental health professional."
    ]
  },
  
  resources: {
    crisis: "Crisis Resources:\n• 988 Suicide & Crisis Lifeline (24/7)\n• Crisis Text Line: Text HOME to 741741\n• SAMHSA Helpline: 1-800-662-4357\n• Emergency: 911",
    general: "Mental Health Resources:\n• National Alliance on Mental Illness: nami.org\n• Mental Health America: mhanational.org\n• Psychology Today therapist finder\n• Your local community mental health center"
  }
};

/**
 * Supportive responses for simple intent-based responses
 */
const SUPPORTIVE_RESPONSES = {
  greeting: [
    "Hello! I'm here to listen and support you. How are you feeling today?",
    "Hi there! I'm glad you reached out. What's on your mind?",
    "Welcome! I'm here to help you feel better. How can I support you today?"
  ],
  crisis: [
    "I'm really concerned about what you're going through. Please reach out to crisis support: Call 988 or text HOME to 741741.",
    "Your safety is important. Please contact the Crisis Lifeline at 988 or emergency services at 911 if you're in immediate danger.",
    "Thank you for sharing this with me. Please get immediate support: 988 for crisis help or 911 for emergencies."
  ],
  anxiety: [
    "I understand that anxiety can feel overwhelming. You're not alone in this.",
    "Anxiety is really difficult to deal with. Have you tried any breathing exercises or grounding techniques?",
    "It's completely normal to feel anxious sometimes. What's been causing you the most worry lately?"
  ],
  depression: [
    "I hear that you're going through a really tough time. Your feelings are valid.",
    "Depression can make everything feel harder. You're brave for reaching out.",
    "You don't have to go through this alone. Have you been able to talk to anyone else about how you're feeling?"
  ],
  stress: [
    "It sounds like you're dealing with a lot of stress right now. That's really challenging.",
    "Stress can be overwhelming. What's been the biggest source of pressure for you?",
    "When we're stressed, it's important to take care of ourselves. What helps you feel calmer?"
  ],
  support: [
    "I'm here to listen and support you through whatever you're going through.",
    "Thank you for trusting me with your feelings. You deserve support and care.",
    "It takes courage to ask for help. What kind of support would be most helpful right now?"
  ],
  encouragement: [
    "You're stronger than you know, even when things feel impossible.",
    "It's okay to struggle. Taking things one day at a time is perfectly fine.",
    "You've made it through difficult times before, and you can get through this too."
  ],
  coping: [
    "Learning healthy coping strategies takes time. What has helped you in the past?",
    "Some people find breathing exercises, walking, or talking to friends helpful. What resonates with you?",
    "Coping looks different for everyone. Would you like to explore some techniques together?"
  ],
  professional: [
    "Speaking with a professional counselor can be really helpful. Have you considered that option?",
    "A therapist or counselor can provide specialized support. I can help you think about how to find one.",
    "Professional support can make a real difference. Would you like help finding resources in your area?"
  ],
  default: [
    "Thank you for sharing that with me. I'm here to listen and support you.",
    "I want you to know that your feelings matter and you're not alone.",
    "It sounds like you're going through something difficult. How can I best support you?"
  ]
};

/**
 * Conversation State Management
 */
class ConversationState {
  constructor() {
    this.currentAssessment = null;
    this.assessmentResponses = {};
    this.conversationHistory = [];
    this.userProfile = {};
    this.escalationFlags = [];
  }

  addMessage(message, isUser = true) {
    this.conversationHistory.push({
      message,
      isUser,
      timestamp: new Date(),
      intent: !isUser ? null : this.detectIntent(message)
    });
  }

  detectIntent(message) {
    let bestMatch = { intent: 'unknown', confidence: 0 };
    
    Object.entries(INTENTS).forEach(([intent, config]) => {
      config.patterns.forEach(pattern => {
        if (pattern.test(message)) {
          if (config.confidence > bestMatch.confidence) {
            bestMatch = { intent, confidence: config.confidence };
          }
        }
      });
    });
    
    return bestMatch;
  }

  startAssessment(type) {
    this.currentAssessment = type;
    this.assessmentResponses = {};
  }

  addAssessmentResponse(questionId, score) {
    this.assessmentResponses[questionId] = score;
  }

  finishAssessment() {
    const assessment = this.currentAssessment;
    const responses = { ...this.assessmentResponses };
    
    this.currentAssessment = null;
    this.assessmentResponses = {};
    
    return { assessment, responses };
  }
}

/**
 * Main AI Chatbot Class
 */
class AIChatbot {
  constructor() {
    this.conversations = new Map(); // sessionId -> ConversationState
  }

  /**
   * Generate AI response for a message
   */
  async generateAIResponse(message, session, user) {
    try {
      const sessionId = session._id.toString();
      let conversation = this.conversations.get(sessionId);
      
      if (!conversation) {
        conversation = new ConversationState();
        conversation.userProfile = {
          isAnonymous: !!user.anonymousId,
          role: user.role,
          preferences: user.preferences || {}
        };
        this.conversations.set(sessionId, conversation);
      }

      conversation.addMessage(message.message, true);
      
      const intent = conversation.detectIntent(message.message);
      let response = await this.generateAIEnhancedResponse(intent, conversation, message.message);
      
      // Check if we need to escalate
      const shouldEscalate = await this.checkEscalationNeeds(intent, conversation, message.message);
      
      if (shouldEscalate) {
        response.escalate = true;
        response.escalationReason = shouldEscalate.reason;
        response.escalationUrgency = shouldEscalate.urgency;
      }

      conversation.addMessage(response.content.text, false);
      
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.generateErrorResponse();
    }
  }

  /**
   * Generate AI-enhanced response using Azure OpenAI
   */
  async generateAIEnhancedResponse(intent, conversation, messageText) {
    if (!azureOpenAIClient) {
      // Fallback to rule-based response if Azure OpenAI is not available
      return this.generateResponse(intent, conversation, messageText);
    }

    try {
      const { intent: intentType, confidence } = intent;
      
      // For crisis situations, always use immediate rule-based responses
      if (intentType === 'crisis') {
        return this.generateCrisisResponse(conversation, messageText);
      }

      // Build context for Azure OpenAI
      const systemPrompt = this.buildSystemPrompt(intentType, conversation);
      const userContext = this.buildUserContext(conversation, messageText);

      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userContext
        }
      ];

      // Add recent conversation history for context
      const recentHistory = conversation.conversationHistory.slice(-4);
      for (const historyItem of recentHistory) {
        if (historyItem.isUser) {
          messages.push({
            role: "user",
            content: historyItem.message
          });
        } else {
          messages.push({
            role: "assistant", 
            content: historyItem.message
          });
        }
      }

      const response = await azureOpenAIClient.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
      });

      const aiResponse = response.choices[0]?.message?.content;
      
      if (!aiResponse) {
        return this.generateResponse(intent, conversation, messageText);
      }

      // Check if the AI response needs crisis escalation
      const needsEscalation = this.checkResponseForEscalation(aiResponse, messageText);

      return {
        content: {
          text: aiResponse,
          type: 'ai-enhanced'
        },
        metadata: {
          intent: intentType,
          confidence: confidence,
          aiGenerated: true,
          model: 'azure-openai',
          escalate: needsEscalation,
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error('Azure OpenAI API error:', error);
      // Fallback to rule-based response
      return this.generateResponse(intent, conversation, messageText);
    }
  }

  /**
   * Build system prompt for Azure OpenAI based on intent
   */
  buildSystemPrompt(intentType, conversation) {
    const basePrompt = `You are a compassionate AI mental health support assistant for the Saneyar platform. Your primary goals are:
    1. Provide empathetic, non-judgmental support
    2. Validate feelings and experiences
    3. Offer practical coping strategies
    4. Recognize when professional help is needed
    5. NEVER provide medical diagnoses or treatment advice
    6. Always prioritize user safety

    Important guidelines:
    - Keep responses concise but warm (2-3 sentences max)
    - Use supportive, validating language
    - Offer specific, actionable suggestions when appropriate
    - If someone mentions self-harm, suicide, or crisis, direct them to crisis resources immediately
    - Encourage professional help for ongoing mental health concerns
    `;

    const intentSpecificPrompts = {
      depression: "The user seems to be experiencing depressive symptoms. Focus on validation, hope, and gentle suggestions for support.",
      anxiety: "The user appears anxious or worried. Offer calming techniques and reassurance while acknowledging their concerns.",
      coping: "The user is seeking coping strategies. Provide specific, evidence-based techniques they can try immediately.",
      assessment: "The user is interested in mental health assessment. Guide them supportively through the process.",
      escalation: "The user wants to speak with a human counselor. Be supportive of this decision and help facilitate the connection.",
      information: "The user is seeking information about mental health. Provide accurate, helpful information in an accessible way.",
      greeting: "Welcome the user warmly and help them feel comfortable sharing what's on their mind."
    };

    return basePrompt + (intentSpecificPrompts[intentType] || "Provide general emotional support and validation.");
  }

  /**
   * Build user context for Azure OpenAI
   */
  buildUserContext(conversation, messageText) {
    let context = `User message: "${messageText}"`;
    
    if (conversation.userProfile.isAnonymous) {
      context += "\nNote: This user is anonymous and may need extra reassurance about privacy.";
    }
    
    if (conversation.escalationFlags.length > 0) {
      context += "\nNote: This user has previously indicated distress. Be extra supportive.";
    }

    return context;
  }

  /**
   * Check if AI response requires escalation
   */
  checkResponseForEscalation(aiResponse, originalMessage) {
    const crisisKeywords = /(suicide|kill myself|want to die|hurt myself|end it all)/i;
    const escalationKeywords = /(emergency|crisis|urgent|can't go on|help me)/i;
    
    return crisisKeywords.test(originalMessage) || escalationKeywords.test(originalMessage);
  }

  /**
   * Generate response based on intent (fallback method)
   */
  async generateResponse(intent, conversation, messageText) {
    const { intent: intentType, confidence } = intent;
    
    switch (intentType) {
      case 'greeting':
        return this.generateGreetingResponse(conversation);
        
      case 'crisis':
        return this.generateCrisisResponse(conversation, messageText);
        
      case 'assessment':
        return this.generateAssessmentResponse(conversation, messageText);
        
      case 'depression':
      case 'anxiety':
        return this.generateEmotionalSupportResponse(intentType, conversation, messageText);
        
      case 'coping':
        return this.generateCopingResponse(conversation, messageText);
        
      case 'escalation':
        return this.generateEscalationResponse(conversation);
        
      case 'information':
        return this.generateInformationResponse(conversation, messageText);
        
      default:
        return this.generateGeneralSupportResponse(conversation, messageText);
    }
  }

  /**
   * Generate greeting response
   */
  generateGreetingResponse(conversation) {
    const isReturningUser = conversation.conversationHistory.length > 2;
    const responses = isReturningUser ? RESPONSES.greeting.returning : RESPONSES.greeting.initial;
    
    return {
      content: {
        text: this.selectRandomResponse(responses),
        type: 'text'
      },
      metadata: {
        intent: 'greeting',
        isWelcome: true,
        suggestedActions: [
          'Start mental health assessment',
          'Talk about how you\'re feeling',
          'Learn coping strategies'
        ]
      }
    };
  }

  /**
   * Generate crisis response
   */
  generateCrisisResponse(conversation, messageText) {
    const immediateResponse = this.selectRandomResponse(RESPONSES.crisis.immediate);
    const safetyInfo = this.selectRandomResponse(RESPONSES.crisis.safety);
    
    // Add crisis flag
    conversation.escalationFlags.push({
      type: 'crisis',
      message: messageText,
      timestamp: new Date(),
      severity: 'critical'
    });

    return {
      content: {
        text: `${immediateResponse}\n\n${safetyInfo}`,
        type: 'crisis'
      },
      metadata: {
        intent: 'crisis',
        requiresImmediate: true,
        escalate: true,
        escalationReason: 'crisis-keywords-detected',
        crisisResources: {
          'Crisis Text Line': '741741',
          'Suicide Prevention Lifeline': '988',
          'Emergency Services': '911'
        }
      },
      urgency: 'critical'
    };
  }

  /**
   * Generate assessment response
   */
  generateAssessmentResponse(conversation, messageText) {
    if (!conversation.currentAssessment) {
      // Offer assessment options
      return {
        content: {
          text: this.selectRandomResponse(RESPONSES.assessment.intro),
          type: 'assessment-offer'
        },
        metadata: {
          intent: 'assessment',
          assessmentOptions: [
            { id: 'phq9', name: 'Depression Screening (PHQ-9)', duration: '5 minutes' },
            { id: 'gad7', name: 'Anxiety Screening (GAD-7)', duration: '3 minutes' }
          ]
        }
      };
    } else {
      // Continue current assessment
      return this.continueAssessment(conversation, messageText);
    }
  }

  /**
   * Continue assessment process
   */
  continueAssessment(conversation, messageText) {
    const assessmentType = conversation.currentAssessment;
    const questions = assessmentType === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
    const currentQuestionIndex = Object.keys(conversation.assessmentResponses).length;
    
    // Parse user response for previous question
    if (currentQuestionIndex > 0) {
      const score = this.parseAssessmentScore(messageText);
      if (score !== null) {
        const questionId = questions[currentQuestionIndex - 1].id;
        conversation.addAssessmentResponse(questionId, score);
      }
    }
    
    // Check if assessment is complete
    if (currentQuestionIndex >= questions.length) {
      const { assessment, responses } = conversation.finishAssessment();
      return this.generateAssessmentResults(assessment, responses);
    }
    
    // Ask next question
    const currentQuestion = questions[currentQuestionIndex];
    const progressText = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    const scaleText = "Rate from 0 (not at all) to 3 (nearly every day):";
    
    return {
      content: {
        text: `${progressText}\n\n${currentQuestion.text}\n\n${scaleText}`,
        type: 'assessment-question'
      },
      metadata: {
        intent: 'assessment',
        questionId: currentQuestion.id,
        questionIndex: currentQuestionIndex,
        totalQuestions: questions.length,
        scale: { min: 0, max: 3 }
      }
    };
  }

  /**
   * Parse assessment score from user input
   */
  parseAssessmentScore(text) {
    const scoreMatch = text.match(/\b([0-3])\b/);
    return scoreMatch ? parseInt(scoreMatch[1]) : null;
  }

  /**
   * Generate assessment results
   */
  generateAssessmentResults(assessmentType, responses) {
    try {
      let results;
      if (assessmentType === 'phq9') {
        results = calculatePHQ9Score(responses);
      } else if (assessmentType === 'gad7') {
        results = calculateGAD7Score(responses);
      }

      const severityText = {
        minimal: 'minimal',
        mild: 'mild',
        moderate: 'moderate',
        'moderately severe': 'moderately severe',
        severe: 'severe'
      }[results.severity] || results.severity;

      const resultText = `Assessment Results:\n\n` +
        `Your ${assessmentType.toUpperCase()} score is ${results.totalScore} out of ${results.maxScore}, ` +
        `indicating ${severityText} ${assessmentType === 'phq9' ? 'depression' : 'anxiety'} symptoms.\n\n` +
        `Recommendation: ${results.recommendation}`;

      const response = {
        content: {
          text: resultText,
          type: 'assessment-results'
        },
        metadata: {
          intent: 'assessment-results',
          assessmentType,
          results,
          followUpSuggestions: this.getFollowUpSuggestions(results)
        }
      };

      // Check if escalation is needed
      if (results.requiresImmediateAttention) {
        response.escalate = true;
        response.escalationReason = 'high-risk-assessment-score';
        response.escalationUrgency = 'high';
      }

      return response;
    } catch (error) {
      return {
        content: {
          text: "I had trouble calculating your assessment results. Let me connect you with a counselor who can help interpret your responses.",
          type: 'error'
        },
        metadata: {
          intent: 'assessment-error',
          error: error.message
        }
      };
    }
  }

  /**
   * Get follow-up suggestions based on assessment results
   */
  getFollowUpSuggestions(results) {
    const suggestions = [];
    
    if (results.severity === 'minimal') {
      suggestions.push('Continue monitoring your mental health');
      suggestions.push('Practice self-care and stress management');
    } else if (results.severity === 'mild') {
      suggestions.push('Learn coping strategies and relaxation techniques');
      suggestions.push('Consider talking to a counselor');
    } else if (results.severity === 'moderate') {
      suggestions.push('Speak with a mental health professional');
      suggestions.push('Explore therapy options');
    } else {
      suggestions.push('Seek immediate professional help');
      suggestions.push('Connect with a crisis counselor');
    }
    
    return suggestions;
  }

  /**
   * Generate emotional support response
   */
  generateEmotionalSupportResponse(emotionType, conversation, messageText) {
    const empathy = this.selectRandomResponse(RESPONSES.support.empathy);
    const validation = this.selectRandomResponse(RESPONSES.support.validation);
    
    let specificSupport = '';
    if (emotionType === 'depression') {
      specificSupport = "\n\nDepression can make everything feel overwhelming, but you don't have to face this alone. Small steps can make a big difference.";
    } else if (emotionType === 'anxiety') {
      specificSupport = "\n\nAnxiety can be exhausting, but there are effective ways to manage these feelings. Let's work on some strategies together.";
    }

    return {
      content: {
        text: `${empathy} ${validation}${specificSupport}\n\nWould you like to try some coping strategies or take a mental health assessment?`,
        type: 'emotional-support'
      },
      metadata: {
        intent: 'emotional-support',
        emotionType,
        suggestedActions: [
          'Try coping strategies',
          'Take mental health assessment',
          'Talk to a counselor'
        ]
      }
    };
  }

  /**
   * Generate coping response
   */
  generateCopingResponse(conversation, messageText) {
    const strategies = [
      RESPONSES.coping.breathing,
      RESPONSES.coping.grounding,
      RESPONSES.coping.selfcare
    ];
    
    const selectedStrategy = this.selectRandomResponse(strategies);
    
    return {
      content: {
        text: `Here's a helpful coping strategy:\n\n${selectedStrategy}\n\nWould you like to try this, or would you prefer a different type of strategy?`,
        type: 'coping-strategy'
      },
      metadata: {
        intent: 'coping',
        strategyType: selectedStrategy.includes('breathing') ? 'breathing' : 
                     selectedStrategy.includes('grounding') ? 'grounding' : 'selfcare',
        additionalStrategies: [
          'Progressive muscle relaxation',
          'Mindfulness meditation',
          'Journaling exercises'
        ]
      }
    };
  }

  /**
   * Generate escalation response
   */
  generateEscalationResponse(conversation) {
    const response = this.selectRandomResponse(RESPONSES.escalation.offer);
    
    return {
      content: {
        text: response,
        type: 'escalation'
      },
      metadata: {
        intent: 'escalation',
        escalate: true,
        escalationReason: 'user-requested-human-support',
        escalationUrgency: 'normal'
      }
    };
  }

  /**
   * Generate information response
   */
  generateInformationResponse(conversation, messageText) {
    let resourceText = RESPONSES.resources.general;
    
    if (messageText.toLowerCase().includes('crisis') || messageText.toLowerCase().includes('emergency')) {
      resourceText = RESPONSES.resources.crisis;
    }

    return {
      content: {
        text: `Here are some helpful resources:\n\n${resourceText}\n\nIs there anything specific you'd like to know more about?`,
        type: 'information'
      },
      metadata: {
        intent: 'information',
        resourceType: messageText.toLowerCase().includes('crisis') ? 'crisis' : 'general'
      }
    };
  }

  /**
   * Generate general support response
   */
  generateGeneralSupportResponse(conversation, messageText) {
    const supportText = "I'm here to listen and support you. It sounds like you're going through something difficult. " +
      "Would you like to talk about how you're feeling, try some coping strategies, or take a mental health assessment?";

    return {
      content: {
        text: supportText,
        type: 'general-support'
      },
      metadata: {
        intent: 'general-support',
        suggestedActions: [
          'Share your feelings',
          'Try coping strategies',
          'Take assessment',
          'Speak with counselor'
        ]
      }
    };
  }

  /**
   * Generate error response
   */
  generateErrorResponse() {
    return {
      content: {
        text: "I'm having trouble understanding right now. Let me connect you with a human counselor who can better assist you.",
        type: 'error'
      },
      metadata: {
        intent: 'error',
        escalate: true,
        escalationReason: 'system-error'
      }
    };
  }

  /**
   * Check if escalation is needed
   */
  async checkEscalationNeeds(intent, conversation, messageText) {
    // Crisis keywords detected
    if (intent.intent === 'crisis') {
      return {
        reason: 'crisis-keywords-detected',
        urgency: 'critical'
      };
    }

    // User specifically requested human help
    if (intent.intent === 'escalation') {
      return {
        reason: 'user-requested-human-support',
        urgency: 'normal'
      };
    }

    // Multiple failed interactions
    const recentMessages = conversation.conversationHistory.slice(-6);
    const unknownIntents = recentMessages.filter(m => m.intent?.intent === 'unknown').length;
    if (unknownIntents >= 3) {
      return {
        reason: 'repeated-failed-interactions',
        urgency: 'normal'
      };
    }

    // High-risk assessment results are handled in generateAssessmentResults

    return null;
  }

  /**
   * Utility function to select random response
   */
  selectRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Clean up old conversations
   */
  cleanupOldConversations() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [sessionId, conversation] of this.conversations.entries()) {
      const lastMessage = conversation.conversationHistory[conversation.conversationHistory.length - 1];
      if (lastMessage && lastMessage.timestamp.getTime() < cutoffTime) {
        this.conversations.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
const aiChatbot = new AIChatbot();

// Clean up old conversations every hour
setInterval(() => {
  aiChatbot.cleanupOldConversations();
}, 60 * 60 * 1000);

// Also export the main aiChatbot instance as default
// module.exports = aiChatbot;

// Keywords and patterns for intent detection
const INTENT_PATTERNS = {
  greeting: /\b(hi|hello|hey|good morning|good afternoon|good evening)\b/i,
  crisis: /\b(suicide|kill myself|end my life|hurt myself|want to die|can't go on|hopeless|worthless)\b/i,
  anxiety: /\b(anxious|anxiety|worried|panic|nervous|stressed|overwhelmed|afraid|scared)\b/i,
  depression: /\b(depressed|depression|sad|empty|numb|hopeless|worthless|tired|exhausted|lonely)\b/i,
  stress: /\b(stress|stressed|pressure|overwhelmed|busy|deadline|work|school)\b/i,
  support: /\b(help|support|talk|listen|understand|alone|isolated)\b/i,
  encouragement: /\b(difficult|hard|tough|struggle|can't cope|giving up)\b/i,
  coping: /\b(cope|coping|manage|handle|deal with|strategies|techniques)\b/i,
  professional: /\b(therapist|counselor|professional|therapy|treatment|medication)\b/i
};

// Simple Azure OpenAI chat function for direct use
const generateAzureOpenAIResponse = async (userMessage, context = {}) => {
  if (!azureOpenAIClient) {
    throw new Error('Azure OpenAI client not initialized');
  }

  try {
    const intent = analyzeIntent(userMessage);
    
    const systemPrompt = `You are a compassionate AI mental health support assistant. 
    Provide empathetic, supportive responses that validate feelings and offer hope.
    Keep responses concise (2-3 sentences) and appropriate for someone seeking mental health support.
    If the user mentions self-harm or crisis, direct them to crisis resources immediately.
    Current context: User intent appears to be "${intent}".`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await azureOpenAIClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: messages,
      max_tokens: 200,
      temperature: 0.7,
      top_p: 0.9
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from Azure OpenAI');
    }

    return {
      response: aiResponse,
      intent: intent,
      metadata: {
        model: 'azure-openai',
        timestamp: new Date()
      }
    };

  } catch (error) {
    console.error('Azure OpenAI error:', error);
    throw error;
  }
};

// Analyze message intent
const analyzeIntent = (message) => {
  const text = message.toLowerCase();
  
  // Check for crisis indicators first (highest priority)
  if (INTENT_PATTERNS.crisis.test(text)) {
    return 'crisis';
  }
  
  // Check other intents
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(text)) {
      return intent;
    }
  }
  
  return 'default';
};

// Generate AI response based on intent
const generateResponse = (intent, userMessage) => {
  const responses = SUPPORTIVE_RESPONSES[intent] || SUPPORTIVE_RESPONSES.default;
  
  // Add some randomization to avoid repetitive responses
  const randomIndex = Math.floor(Math.random() * responses.length);
  let response = responses[randomIndex];
  
  // Add personalization for certain intents
  if (intent === 'crisis') {
    response += "\n\nA counselor will be notified about your message to provide additional support.";
  }
  
  if (intent === 'greeting') {
    const timeOfDay = getTimeOfDay();
    response = response.replace(/Hello!|Hi there!/, `Good ${timeOfDay}!`);
  }
  
  return response;
};

// Get time of day for personalized greetings
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

// Check if AI should respond to a message
const shouldRespondToMessage = (message, sessionParticipants) => {
  const text = message.content.text.toLowerCase();
  
  // Respond if:
  // 1. Message contains AI trigger words
  // 2. It's a crisis situation
  // 3. User is alone in session
  // 4. Message asks for help/support
  
  const aiTriggers = /\b(bot|ai|help|support|anyone there|hello|hi)\b/i;
  const crisisIndicators = INTENT_PATTERNS.crisis;
  const helpRequest = /\b(help|support|talk|listen|anyone)\b/i;
  
  const isAloneInSession = sessionParticipants.length <= 1;
  const hasTriggerWords = aiTriggers.test(text);
  const isCrisis = crisisIndicators.test(text);
  const isHelpRequest = helpRequest.test(text);
  
  return isAloneInSession || hasTriggerWords || isCrisis || isHelpRequest;
};

// Generate contextual AI response
const generateAIResponse = async (userMessage, session, user) => {
  try {
    const intent = analyzeIntent(userMessage.content.text);
    const response = generateResponse(intent, userMessage.content.text);
    
    // Create AI response message
    const aiMessage = {
      session: session._id,
      sender: user._id, // In production, this would be an AI bot user
      content: {
        text: response,
        type: 'ai-response'
      },
      metadata: {
        aiGenerated: true,
        intent: intent,
        confidence: getConfidenceScore(intent, userMessage.content.text)
      }
    };
    
    return aiMessage;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      session: session._id,
      sender: user._id,
      content: {
        text: "I'm having trouble responding right now, but I want you to know that your feelings matter. Consider reaching out to a counselor for personalized support.",
        type: 'ai-response'
      },
      metadata: {
        aiGenerated: true,
        intent: 'error',
        confidence: 1.0
      }
    };
  }
};

// Calculate confidence score for intent detection
const getConfidenceScore = (intent, text) => {
  if (intent === 'crisis') return 0.95;
  if (intent === 'default') return 0.3;
  
  const pattern = INTENT_PATTERNS[intent];
  if (pattern && pattern.test(text)) {
    return 0.8;
  }
  
  return 0.5;
};

// Get mental health resources
const getMentalHealthResources = () => {
  return {
    crisis: {
      "Suicide & Crisis Lifeline": "988",
      "Crisis Text Line": "Text HOME to 741741",
      "International Association for Suicide Prevention": "https://www.iasp.info/resources/Crisis_Centres/"
    },
    support: {
      "National Alliance on Mental Illness (NAMI)": "https://www.nami.org",
      "Mental Health America": "https://www.mhanational.org",
      "Psychology Today Therapist Finder": "https://www.psychologytoday.com"
    },
    coping: {
      "Mindfulness Apps": "Headspace, Calm, Insight Timer",
      "Self-Care Activities": "Exercise, journaling, creative hobbies, connecting with friends",
      "Breathing Exercises": "4-7-8 technique, box breathing, progressive muscle relaxation"
    }
  };
};

module.exports = {
  analyzeIntent,
  generateResponse,
  generateAIResponse,
  generateAzureOpenAIResponse,
  shouldRespondToMessage,
  getMentalHealthResources,
  SUPPORTIVE_RESPONSES,
  INTENT_PATTERNS,
  aiChatbot
};