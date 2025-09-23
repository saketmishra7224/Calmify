/**
 * Auto-Alert Crisis Response System
 * Automated counselor notification with priority-based routing
 */

const { User, Session, CrisisAlert } = require('../models');
const { analyzeAdvancedCrisis, calculateSessionPriority } = require('./advancedCrisisDetection');
const NotificationService = require('./notificationService');

class AutoAlertSystem {
  constructor(io) {
    this.io = io;
    this.activeAlerts = new Map();
    this.counselorQueues = new Map();
    this.escalationTimers = new Map();
    
    // Initialize counselor availability tracking
    this.initializeCounselorTracking();
  }
  
  /**
   * Initialize counselor availability tracking
   */
  async initializeCounselorTracking() {
    try {
      const counselors = await User.find({ 
        role: { $in: ['counselor', 'therapist', 'crisis_counselor'] },
        isActive: true 
      });
      
      counselors.forEach(counselor => {
        this.counselorQueues.set(counselor._id.toString(), {
          id: counselor._id,
          name: counselor.name,
          role: counselor.role,
          specializations: counselor.specializations || [],
          currentLoad: 0,
          maxCapacity: counselor.maxSessionCapacity || 5,
          isAvailable: counselor.availability?.isOnline || false,
          lastActivity: counselor.lastActivity || new Date(),
          currentSessions: [],
          crisisExperience: counselor.crisisExperience || 'beginner',
          responseTime: counselor.averageResponseTime || 300, // seconds
          rating: counselor.rating || 4.0,
          languages: counselor.languages || ['en']
        });
      });
      
      console.log(`Initialized tracking for ${counselors.length} counselors`);
    } catch (error) {
      console.error('Error initializing counselor tracking:', error);
    }
  }
  
  /**
   * Main crisis alert processing function
   */
  async processCrisisAlert(messageData, userProfile) {
    try {
      // Analyze crisis severity
      const crisisAnalysis = analyzeAdvancedCrisis(messageData.content, userProfile.history);
      
      if (!crisisAnalysis.requiresImmediate) {
        return { alertTriggered: false, analysis: crisisAnalysis };
      }
      
      // Calculate session priority
      const sessionPriority = calculateSessionPriority(crisisAnalysis, userProfile);
      
      // Create crisis alert record
      const crisisAlert = await this.createCrisisAlert({
        userId: userProfile._id,
        messageId: messageData._id,
        sessionId: messageData.sessionId,
        analysis: crisisAnalysis,
        priority: sessionPriority,
        triggeredAt: new Date()
      });
      
      // Find and notify appropriate counselors
      const notificationResult = await this.notifyCounselors(crisisAlert, crisisAnalysis, sessionPriority);
      
      // Set up escalation if needed
      if (crisisAnalysis.riskLevel === 'critical') {
        this.setupEscalation(crisisAlert);
      }
      
      // Start monitoring
      this.startCrisisMonitoring(crisisAlert);
      
      return {
        alertTriggered: true,
        crisisAlert,
        analysis: crisisAnalysis,
        priority: sessionPriority,
        notifications: notificationResult
      };
      
    } catch (error) {
      console.error('Error processing crisis alert:', error);
      throw error;
    }
  }
  
  /**
   * Create crisis alert record
   */
  async createCrisisAlert(alertData) {
    try {
      const crisisAlert = new CrisisAlert({
        user: alertData.userId,
        message: alertData.messageId,
        session: alertData.sessionId,
        severity: alertData.analysis.riskLevel,
        confidence: alertData.analysis.confidence,
        categories: Object.keys(alertData.analysis.categoryScores)
          .filter(cat => alertData.analysis.categoryScores[cat].score > 0),
        keywords: alertData.analysis.matchedKeywords.map(k => k.keyword),
        riskFactors: alertData.analysis.riskFactors,
        priority: alertData.priority.level,
        priorityScore: alertData.priority.score,
        status: 'active',
        triggeredAt: alertData.triggeredAt,
        recommendations: alertData.analysis.recommendations
      });
      
      await crisisAlert.save();
      this.activeAlerts.set(crisisAlert._id.toString(), crisisAlert);
      
      return crisisAlert;
    } catch (error) {
      console.error('Error creating crisis alert:', error);
      throw error;
    }
  }
  
  /**
   * Find and notify appropriate counselors
   */
  async notifyCounselors(crisisAlert, crisisAnalysis, sessionPriority) {
    const notifications = [];
    
    try {
      // Get available counselors sorted by suitability
      const suitableCounselors = await this.findSuitableCounselors(crisisAlert, crisisAnalysis);
      
      if (suitableCounselors.length === 0) {
        // No counselors available - escalate to emergency protocols
        return await this.handleNoCounselorsAvailable(crisisAlert);
      }
      
      // Notify counselors based on priority level
      const notificationStrategy = this.getNotificationStrategy(sessionPriority.level);
      
      for (let i = 0; i < Math.min(notificationStrategy.count, suitableCounselors.length); i++) {
        const counselor = suitableCounselors[i];
        
        const notification = await this.sendCounselorNotification(
          counselor,
          crisisAlert,
          crisisAnalysis,
          sessionPriority,
          i === 0 // isPrimary
        );
        
        notifications.push(notification);
        
        // For critical cases, notify multiple counselors immediately
        if (sessionPriority.level === 'emergency' && i < 2) {
          continue;
        }
        
        // For other cases, stagger notifications
        if (notificationStrategy.staggered && i < suitableCounselors.length - 1) {
          setTimeout(() => {
            if (this.activeAlerts.has(crisisAlert._id.toString())) {
              this.sendCounselorNotification(
                suitableCounselors[i + 1],
                crisisAlert,
                crisisAnalysis,
                sessionPriority,
                false
              );
            }
          }, notificationStrategy.delay * 1000);
        }
      }
      
      // Notify administrators for high-priority cases
      if (['emergency', 'urgent'].includes(sessionPriority.level)) {
        await this.notifyAdministrators(crisisAlert, crisisAnalysis);
      }
      
      return notifications;
      
    } catch (error) {
      console.error('Error notifying counselors:', error);
      throw error;
    }
  }
  
  /**
   * Find suitable counselors for crisis response
   */
  async findSuitableCounselors(crisisAlert, crisisAnalysis) {
    const availableCounselors = Array.from(this.counselorQueues.values())
      .filter(counselor => 
        counselor.isAvailable && 
        counselor.currentLoad < counselor.maxCapacity
      );
    
    if (availableCounselors.length === 0) {
      return [];
    }
    
    // Score each counselor based on suitability
    const scoredCounselors = availableCounselors.map(counselor => {
      let suitabilityScore = 0;
      
      // Crisis experience weight (40%)
      const experienceScores = {
        'expert': 40,
        'advanced': 30,
        'intermediate': 20,
        'beginner': 10
      };
      suitabilityScore += experienceScores[counselor.crisisExperience] || 10;
      
      // Current load weight (20%) - lower load is better
      const loadScore = ((counselor.maxCapacity - counselor.currentLoad) / counselor.maxCapacity) * 20;
      suitabilityScore += loadScore;
      
      // Response time weight (15%) - faster is better
      const responseScore = Math.max(0, 15 - (counselor.responseTime / 60)); // Convert to minutes
      suitabilityScore += responseScore;
      
      // Rating weight (15%)
      suitabilityScore += (counselor.rating / 5) * 15;
      
      // Specialization match weight (10%)
      const relevantSpecializations = [
        'crisis_intervention', 'suicide_prevention', 'trauma', 'depression',
        'anxiety', 'substance_abuse', 'self_harm', 'violence_prevention'
      ];
      
      const matchingSpecs = counselor.specializations.filter(spec => 
        relevantSpecializations.includes(spec)
      ).length;
      suitabilityScore += (matchingSpecs / relevantSpecializations.length) * 10;
      
      // Crisis category specific matching
      if (crisisAnalysis.categoryScores.suicide.score > 0 && 
          counselor.specializations.includes('suicide_prevention')) {
        suitabilityScore += 5;
      }
      
      if (crisisAnalysis.categoryScores.violence.score > 0 && 
          counselor.specializations.includes('violence_prevention')) {
        suitabilityScore += 5;
      }
      
      if (crisisAnalysis.categoryScores.substance.score > 0 && 
          counselor.specializations.includes('substance_abuse')) {
        suitabilityScore += 5;
      }
      
      return {
        ...counselor,
        suitabilityScore
      };
    });
    
    // Sort by suitability score (descending)
    return scoredCounselors.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }
  
  /**
   * Get notification strategy based on priority
   */
  getNotificationStrategy(priorityLevel) {
    const strategies = {
      emergency: { count: 3, staggered: false, delay: 0 },
      urgent: { count: 2, staggered: true, delay: 30 },
      high: { count: 2, staggered: true, delay: 60 },
      normal: { count: 1, staggered: true, delay: 120 },
      low: { count: 1, staggered: true, delay: 300 }
    };
    
    return strategies[priorityLevel] || strategies.normal;
  }
  
  /**
   * Send notification to specific counselor
   */
  async sendCounselorNotification(counselor, crisisAlert, crisisAnalysis, sessionPriority, isPrimary) {
    try {
      const notification = {
        type: 'crisis_alert',
        counselorId: counselor.id,
        alertId: crisisAlert._id,
        priority: sessionPriority.level,
        isPrimary,
        severity: crisisAnalysis.riskLevel,
        categories: Object.keys(crisisAnalysis.categoryScores)
          .filter(cat => crisisAnalysis.categoryScores[cat].score > 0),
        estimatedWaitTime: sessionPriority.estimatedWaitTime,
        userProfile: {
          isMinor: crisisAlert.user?.isMinor,
          hasHistory: crisisAlert.user?.hasHistory,
          preferredLanguage: crisisAlert.user?.preferredLanguage
        },
        timestamp: new Date()
      };
      
      // Send real-time notification via Socket.IO
      this.io.to(`counselor_${counselor.id}`).emit('crisis_alert', notification);
      
      // Send push notification if counselor has push tokens
      if (counselor.pushTokens && counselor.pushTokens.length > 0) {
        await this.sendPushNotification(counselor, notification);
      }
      
      // Send SMS for critical cases
      if (sessionPriority.level === 'emergency' && counselor.phoneNumber) {
        await this.sendSMSNotification(counselor, notification);
      }
      
      // Log notification
      console.log(`Crisis alert sent to counselor ${counselor.name} (${counselor.id})`);
      
      return notification;
      
    } catch (error) {
      console.error(`Error sending notification to counselor ${counselor.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle case when no counselors are available
   */
  async handleNoCounselorsAvailable(crisisAlert) {
    console.warn(`No counselors available for crisis alert ${crisisAlert._id}`);
    
    // Immediately escalate to emergency protocols
    await this.escalateToEmergency(crisisAlert, 'no_counselors_available');
    
    // Notify all offline counselors
    await this.notifyOfflineCounselors(crisisAlert);
    
    // Trigger external emergency response if critical
    if (crisisAlert.severity === 'critical') {
      await this.triggerExternalEmergencyResponse(crisisAlert);
    }
    
    return {
      strategy: 'emergency_escalation',
      reason: 'no_counselors_available',
      actions: ['emergency_protocols', 'offline_notifications', 'external_response']
    };
  }
  
  /**
   * Notify administrators of high-priority crisis
   */
  async notifyAdministrators(crisisAlert, crisisAnalysis) {
    try {
      const admins = await User.find({ 
        role: { $in: ['admin', 'supervisor', 'crisis_manager'] },
        isActive: true 
      });
      
      const adminNotification = {
        type: 'admin_crisis_alert',
        alertId: crisisAlert._id,
        severity: crisisAnalysis.riskLevel,
        userId: crisisAlert.user,
        categories: Object.keys(crisisAnalysis.categoryScores)
          .filter(cat => crisisAnalysis.categoryScores[cat].score > 0),
        riskFactors: crisisAnalysis.riskFactors,
        timestamp: new Date()
      };
      
      // Send to admin dashboard
      this.io.to('admin_room').emit('crisis_admin_alert', adminNotification);
      
      // Email notifications for critical cases
      if (crisisAnalysis.riskLevel === 'critical') {
        for (const admin of admins) {
          if (admin.emailNotifications?.crisis) {
            await this.sendEmailNotification(admin, adminNotification);
          }
        }
      }
      
      console.log(`Admin notification sent for crisis alert ${crisisAlert._id}`);
      
    } catch (error) {
      console.error('Error notifying administrators:', error);
    }
  }
  
  /**
   * Setup escalation timer for unresponded alerts
   */
  setupEscalation(crisisAlert) {
    const escalationTime = this.getEscalationTime(crisisAlert.severity);
    
    const escalationTimer = setTimeout(async () => {
      if (this.activeAlerts.has(crisisAlert._id.toString()) && 
          crisisAlert.status === 'active') {
        
        console.log(`Escalating unresponded crisis alert ${crisisAlert._id}`);
        await this.escalateUnrespondedAlert(crisisAlert);
      }
    }, escalationTime * 1000);
    
    this.escalationTimers.set(crisisAlert._id.toString(), escalationTimer);
  }
  
  /**
   * Get escalation time based on severity
   */
  getEscalationTime(severity) {
    const escalationTimes = {
      critical: 60,    // 1 minute
      high: 180,       // 3 minutes
      medium: 300,     // 5 minutes
      low: 600         // 10 minutes
    };
    
    return escalationTimes[severity] || 300;
  }
  
  /**
   * Handle counselor response to crisis alert
   */
  async handleCounselorResponse(alertId, counselorId, response) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }
      
      if (response.action === 'accept') {
        // Counselor accepted the crisis session
        await this.assignCrisisSession(alert, counselorId);
        
        // Cancel escalation timer
        if (this.escalationTimers.has(alertId)) {
          clearTimeout(this.escalationTimers.get(alertId));
          this.escalationTimers.delete(alertId);
        }
        
        // Update counselor load
        const counselor = this.counselorQueues.get(counselorId);
        if (counselor) {
          counselor.currentLoad++;
          counselor.currentSessions.push({
            sessionId: alert.session,
            type: 'crisis',
            startTime: new Date()
          });
        }
        
        // Notify user that help is coming
        this.io.to(`user_${alert.user}`).emit('crisis_response', {
          status: 'counselor_assigned',
          counselorName: counselor?.name,
          estimatedTime: '1-2 minutes'
        });
        
        console.log(`Crisis alert ${alertId} accepted by counselor ${counselorId}`);
        
      } else if (response.action === 'decline') {
        // Counselor declined - try next available
        await this.handleCounselorDecline(alert, counselorId, response.reason);
      }
      
    } catch (error) {
      console.error('Error handling counselor response:', error);
      throw error;
    }
  }
  
  /**
   * Start crisis monitoring
   */
  startCrisisMonitoring(crisisAlert) {
    // Real-time monitoring for crisis escalation
    const monitoringInterval = setInterval(async () => {
      try {
        if (!this.activeAlerts.has(crisisAlert._id.toString())) {
          clearInterval(monitoringInterval);
          return;
        }
        
        // Check for new messages from user
        const recentMessages = await this.getRecentUserMessages(crisisAlert.user, 5);
        
        if (recentMessages.length > 0) {
          const latestMessage = recentMessages[0];
          const newAnalysis = analyzeAdvancedCrisis(latestMessage.content);
          
          // Check if crisis has escalated
          if (this.hasEscalated(crisisAlert.analysis, newAnalysis)) {
            console.log(`Crisis escalation detected for alert ${crisisAlert._id}`);
            await this.handleCrisisEscalation(crisisAlert, newAnalysis);
          }
        }
        
      } catch (error) {
        console.error('Error in crisis monitoring:', error);
      }
    }, 30000); // Check every 30 seconds
    
    // Clean up after 2 hours
    setTimeout(() => {
      clearInterval(monitoringInterval);
    }, 2 * 60 * 60 * 1000);
  }
  
  /**
   * Update counselor availability
   */
  updateCounselorAvailability(counselorId, availability) {
    const counselor = this.counselorQueues.get(counselorId);
    if (counselor) {
      counselor.isAvailable = availability.isOnline;
      counselor.lastActivity = new Date();
      
      console.log(`Updated availability for counselor ${counselorId}: ${availability.isOnline}`);
    }
  }
  
  /**
   * Get system status for monitoring
   */
  getSystemStatus() {
    const totalCounselors = this.counselorQueues.size;
    const availableCounselors = Array.from(this.counselorQueues.values())
      .filter(c => c.isAvailable).length;
    const activeAlerts = this.activeAlerts.size;
    
    return {
      totalCounselors,
      availableCounselors,
      activeAlerts,
      systemLoad: activeAlerts / Math.max(availableCounselors, 1),
      timestamp: new Date()
    };
  }
}

module.exports = AutoAlertSystem;