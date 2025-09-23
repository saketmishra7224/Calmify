const { CrisisAlert, Message, User } = require('../models');

// Crisis keywords with confidence weights
const CRISIS_KEYWORDS = {
  // Immediate danger - High confidence
  'suicide': 0.95,
  'kill myself': 0.95,
  'end my life': 0.95,
  'hurt myself': 0.90,
  'self harm': 0.90,
  'want to die': 0.90,
  'better off dead': 0.85,
  'ending it all': 0.85,
  'no point living': 0.80,
  
  // Self-harm indicators - Medium-High confidence
  'cutting myself': 0.85,
  'overdose': 0.80,
  'pills': 0.65,
  'razor': 0.70,
  'bleeding': 0.60,
  
  // Mental health crisis - Medium confidence
  'can\'t go on': 0.75,
  'give up': 0.60,
  'hopeless': 0.70,
  'worthless': 0.65,
  'nobody cares': 0.60,
  'hate myself': 0.65,
  'can\'t take it': 0.70,
  'too much pain': 0.65,
  
  // Emergency situations - High confidence
  'emergency': 0.80,
  'help me': 0.55,
  'urgent': 0.60,
  'crisis': 0.85,
  'scared': 0.50,
  'panic': 0.65,
  
  // Substance abuse crisis - Medium confidence
  'overdosed': 0.90,
  'too many pills': 0.85,
  'drinking too much': 0.60,
  'can\'t stop drinking': 0.70,
  'drug problem': 0.65
};

// Analyze message content for crisis indicators
const analyzeMessageForCrisis = (messageText) => {
  const text = messageText.toLowerCase();
  const foundKeywords = [];
  let maxConfidence = 0;
  let totalConfidence = 0;
  let keywordCount = 0;

  // Check for exact keyword matches
  Object.entries(CRISIS_KEYWORDS).forEach(([keyword, confidence]) => {
    if (text.includes(keyword)) {
      foundKeywords.push({ keyword, confidence });
      maxConfidence = Math.max(maxConfidence, confidence);
      totalConfidence += confidence;
      keywordCount++;
    }
  });

  // Additional pattern matching for variations
  const patterns = [
    { pattern: /\b(kill|end|hurt)\s+(myself|me)\b/i, confidence: 0.90 },
    { pattern: /\b(want|need|going)\s+to\s+die\b/i, confidence: 0.85 },
    { pattern: /\b(can't|cannot)\s+(take|handle|deal)\s+it\b/i, confidence: 0.70 },
    { pattern: /\b(thinking\s+about|planning)\s+(suicide|killing\s+myself)\b/i, confidence: 0.95 },
    { pattern: /\b(nobody|no\s+one)\s+(cares|loves|understands)\b/i, confidence: 0.60 }
  ];

  patterns.forEach(({ pattern, confidence }) => {
    if (pattern.test(text)) {
      foundKeywords.push({ keyword: pattern.source, confidence });
      maxConfidence = Math.max(maxConfidence, confidence);
      totalConfidence += confidence;
      keywordCount++;
    }
  });

  // Calculate overall confidence
  const avgConfidence = keywordCount > 0 ? totalConfidence / keywordCount : 0;
  const finalConfidence = Math.min(maxConfidence + (avgConfidence * 0.3), 1.0);

  return {
    isCrisis: finalConfidence >= 0.5,
    confidence: finalConfidence,
    keywords: foundKeywords,
    severity: getSeverityLevel(finalConfidence)
  };
};

// Determine severity level based on confidence
const getSeverityLevel = (confidence) => {
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
};

// Create crisis alert
const createCrisisAlert = async (messageId, userId, sessionId, analysis) => {
  try {
    const alert = new CrisisAlert({
      user: userId,
      session: sessionId,
      message: messageId,
      type: 'keyword-detection',
      severity: analysis.severity,
      triggerContent: {
        keywords: analysis.keywords.map(k => k.keyword),
        confidence: analysis.confidence
      }
    });

    await alert.save();
    
    // Populate user data for notification
    await alert.populate('user', 'username email profile preferences');
    
    return alert;
  } catch (error) {
    console.error('Error creating crisis alert:', error);
    throw error;
  }
};

// Send emergency notifications
const sendEmergencyNotifications = async (alert) => {
  try {
    // Log for emergency responders (in production, this would trigger real notifications)
    console.log('🚨 CRISIS ALERT:', {
      alertId: alert._id,
      userId: alert.user._id,
      severity: alert.severity,
      confidence: alert.triggerContent.confidence,
      keywords: alert.triggerContent.keywords,
      timestamp: new Date()
    });

    // In production, implement:
    // 1. Email notifications to crisis team
    // 2. SMS alerts for critical cases
    // 3. Push notifications to counselors
    // 4. Integration with emergency services API
    
    // For now, we'll create a system message in the session
    if (alert.session) {
      const systemMessage = new Message({
        session: alert.session,
        sender: alert.user._id, // Will be overridden as system message
        content: {
          text: `Crisis alert triggered. A counselor has been notified and will reach out soon. If this is an immediate emergency, please contact emergency services at 911 or the crisis hotline at 988.`,
          type: 'system'
        },
        metadata: {
          urgencyLevel: 'critical'
        }
      });

      await systemMessage.save();
    }

    // Notify all available counselors
    await notifyCounselors(alert);
    
  } catch (error) {
    console.error('Error sending emergency notifications:', error);
  }
};

// Notify available counselors
const notifyCounselors = async (alert) => {
  try {
    const availableCounselors = await User.find({
      role: { $in: ['counselor', 'admin'] },
      status: 'active',
      isOnline: true
    });

    // In production, this would send real-time notifications via Socket.io
    console.log(`Notifying ${availableCounselors.length} available counselors about crisis alert ${alert._id}`);
    
    // Store notification metadata
    alert.metadata = alert.metadata || {};
    alert.metadata.counselorsNotified = availableCounselors.length;
    alert.metadata.notifiedAt = new Date();
    await alert.save();
    
  } catch (error) {
    console.error('Error notifying counselors:', error);
  }
};

// Process message for crisis detection
const processMessageForCrisis = async (message) => {
  try {
    const analysis = analyzeMessageForCrisis(message.content.text);
    
    if (analysis.isCrisis) {
      // Update message metadata
      message.metadata.crisisKeywords = analysis.keywords;
      message.metadata.sentiment = 'crisis';
      message.metadata.urgencyLevel = analysis.severity;
      await message.save();

      // Create crisis alert
      const alert = await createCrisisAlert(
        message._id,
        message.sender,
        message.session,
        analysis
      );

      // Send notifications for high severity alerts
      if (analysis.severity === 'critical' || analysis.severity === 'high') {
        await sendEmergencyNotifications(alert);
      }

      return { alert, analysis };
    }

    return { alert: null, analysis };
  } catch (error) {
    console.error('Error processing message for crisis:', error);
    throw error;
  }
};

// Get crisis statistics for admin dashboard
const getCrisisStatistics = async (timeframe = '24h') => {
  try {
    const timeMap = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };

    const hours = timeMap[timeframe] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await CrisisAlert.aggregate([
      {
        $match: {
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAlerts = await CrisisAlert.countDocuments({
      createdAt: { $gte: since }
    });

    const resolvedAlerts = await CrisisAlert.countDocuments({
      createdAt: { $gte: since },
      status: 'resolved'
    });

    return {
      totalAlerts,
      resolvedAlerts,
      pendingAlerts: totalAlerts - resolvedAlerts,
      severityBreakdown: stats,
      timeframe
    };
  } catch (error) {
    console.error('Error getting crisis statistics:', error);
    throw error;
  }
};

module.exports = {
  analyzeMessageForCrisis,
  createCrisisAlert,
  processMessageForCrisis,
  sendEmergencyNotifications,
  getCrisisStatistics,
  CRISIS_KEYWORDS
};