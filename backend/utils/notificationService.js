/**
 * Real-time Notification System for Urgent Alerts
 * Handles crisis alerts, session notifications, and emergency communications
 */

const EventEmitter = require('events');
const CrisisAlert = require('../models/CrisisAlert');
const User = require('../models/User');
const Session = require('../models/Session');

class NotificationService extends EventEmitter {
  constructor(io) {
    super();
    this.io = io; // Socket.io instance
    this.activeNotifications = new Map();
    this.notificationQueue = [];
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for various notification types
   */
  setupEventHandlers() {
    // Crisis alert events
    this.on('crisis-alert', this.handleCrisisAlert.bind(this));
    this.on('crisis-resolved', this.handleCrisisResolved.bind(this));
    
    // Session events
    this.on('session-escalated', this.handleSessionEscalated.bind(this));
    this.on('session-matched', this.handleSessionMatched.bind(this));
    this.on('helper-unavailable', this.handleHelperUnavailable.bind(this));
    
    // User events
    this.on('user-status-change', this.handleUserStatusChange.bind(this));
    this.on('emergency-broadcast', this.handleEmergencyBroadcast.bind(this));
  }

  /**
   * Crisis Alert Notifications
   */
  async handleCrisisAlert(alertData) {
    try {
      const { alert, priority = 'high', targetRoles = ['counselor', 'admin'] } = alertData;
      
      console.log(`🚨 Processing crisis alert: ${alert._id} (${alert.severity})`);

      // Get target recipients
      const recipients = await this.getNotificationRecipients(targetRoles, {
        isOnline: priority === 'critical',
        isActive: true
      });

      const notification = {
        id: `crisis_${alert._id}`,
        type: 'crisis-alert',
        priority: priority,
        title: `Crisis Alert - ${alert.severity.toUpperCase()}`,
        message: this.formatCrisisMessage(alert),
        data: {
          alertId: alert._id,
          userId: alert.user._id,
          sessionId: alert.session,
          severity: alert.severity,
          confidence: alert.confidence,
          keywords: alert.triggerContent?.keywords || []
        },
        actions: [
          {
            id: 'respond',
            label: 'Respond Now',
            type: 'primary',
            action: 'join-crisis-session'
          },
          {
            id: 'view-details',
            label: 'View Details',
            type: 'secondary',
            action: 'view-crisis-alert'
          }
        ],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

      // Send notifications
      await this.sendNotification(notification, recipients);

      // For critical alerts, also send emergency broadcasts
      if (alert.severity === 'critical') {
        await this.sendEmergencyBroadcast({
          message: `CRITICAL: Immediate attention required for user ${alert.user.username || alert.user.anonymousId}`,
          sessionId: alert.session,
          alertId: alert._id
        });
      }

      // Store active notification
      this.activeNotifications.set(notification.id, {
        ...notification,
        recipients: recipients.map(r => r._id)
      });

      // Schedule follow-up if no response
      this.scheduleFollowUp(notification.id, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
      console.error('Error handling crisis alert:', error);
    }
  }

  /**
   * Format crisis alert message
   */
  formatCrisisMessage(alert) {
    const userDisplay = alert.user.username || alert.user.anonymousId || 'Anonymous User';
    const confidenceText = alert.confidence ? ` (${Math.round(alert.confidence * 100)}% confidence)` : '';
    
    return `Crisis detected for ${userDisplay}${confidenceText}. Immediate attention may be required.`;
  }

  /**
   * Handle crisis resolved
   */
  async handleCrisisResolved(resolutionData) {
    try {
      const { alertId, resolvedBy, resolution } = resolutionData;
      
      const notificationId = `crisis_${alertId}`;
      const activeNotification = this.activeNotifications.get(notificationId);
      
      if (activeNotification) {
        // Notify all recipients that crisis was resolved
        const updateNotification = {
          id: `crisis_resolved_${alertId}`,
          type: 'crisis-resolved',
          priority: 'medium',
          title: 'Crisis Alert Resolved',
          message: `Crisis alert has been resolved by ${resolvedBy.username}`,
          data: {
            originalAlertId: alertId,
            resolvedBy: resolvedBy._id,
            resolution: resolution
          },
          timestamp: new Date()
        };

        const recipients = await User.find({
          _id: { $in: activeNotification.recipients }
        });

        await this.sendNotification(updateNotification, recipients);
        
        // Remove from active notifications
        this.activeNotifications.delete(notificationId);
      }
    } catch (error) {
      console.error('Error handling crisis resolved:', error);
    }
  }

  /**
   * Handle session escalation
   */
  async handleSessionEscalated(escalationData) {
    try {
      const { session, escalatedBy, newSeverity, reason } = escalationData;
      
      // Determine target roles based on new severity
      let targetRoles = ['counselor', 'admin'];
      if (newSeverity === 'critical') {
        targetRoles = ['admin']; // Only admins for critical escalations
      }

      const recipients = await this.getNotificationRecipients(targetRoles, {
        isActive: true
      });

      const notification = {
        id: `escalation_${session._id}`,
        type: 'session-escalated',
        priority: newSeverity === 'critical' ? 'high' : 'medium',
        title: `Session Escalated to ${newSeverity.toUpperCase()}`,
        message: `Session escalated by ${escalatedBy.username}. Reason: ${reason}`,
        data: {
          sessionId: session._id,
          escalatedBy: escalatedBy._id,
          newSeverity,
          reason,
          patientId: session.patientId
        },
        actions: [
          {
            id: 'takeover',
            label: 'Take Over Session',
            type: 'primary',
            action: 'takeover-session'
          },
          {
            id: 'support',
            label: 'Provide Support',
            type: 'secondary',
            action: 'support-session'
          }
        ],
        timestamp: new Date()
      };

      await this.sendNotification(notification, recipients);
    } catch (error) {
      console.error('Error handling session escalation:', error);
    }
  }

  /**
   * Handle session matched notification
   */
  async handleSessionMatched(matchData) {
    try {
      const { session, helper, patient, matchScore } = matchData;
      
      // Notify the helper
      const helperNotification = {
        id: `match_helper_${session._id}`,
        type: 'session-match',
        priority: 'high',
        title: 'New Session Assignment',
        message: `You've been matched with a patient for a ${session.helperType} session`,
        data: {
          sessionId: session._id,
          patientDisplay: patient.username || patient.anonymousId,
          severity: session.severity,
          matchScore,
          estimatedDuration: '45-60 minutes'
        },
        actions: [
          {
            id: 'accept',
            label: 'Accept Session',
            type: 'primary',
            action: 'accept-session'
          },
          {
            id: 'decline',
            label: 'Decline',
            type: 'secondary',
            action: 'decline-session'
          }
        ],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes to respond
      };

      await this.sendNotification(helperNotification, [helper]);

      // Notify the patient
      const patientNotification = {
        id: `match_patient_${session._id}`,
        type: 'session-match',
        priority: 'medium',
        title: 'Helper Found',
        message: `A ${session.helperType} has been found for your session`,
        data: {
          sessionId: session._id,
          helperType: session.helperType,
          estimatedStartTime: 'within 5 minutes'
        },
        timestamp: new Date()
      };

      await this.sendNotification(patientNotification, [patient]);

    } catch (error) {
      console.error('Error handling session match:', error);
    }
  }

  /**
   * Handle helper unavailable
   */
  async handleHelperUnavailable(unavailableData) {
    try {
      const { sessionId, helperId, reason, patient } = unavailableData;
      
      // Notify patient about helper unavailability
      const notification = {
        id: `helper_unavailable_${sessionId}`,
        type: 'helper-unavailable',
        priority: 'medium',
        title: 'Finding New Helper',
        message: 'Your assigned helper is no longer available. We\'re finding you another helper.',
        data: {
          sessionId,
          reason,
          status: 'searching'
        },
        timestamp: new Date()
      };

      await this.sendNotification(notification, [patient]);

      // Emit event to trigger re-matching
      this.emit('rematch-required', { sessionId, reason });

    } catch (error) {
      console.error('Error handling helper unavailable:', error);
    }
  }

  /**
   * Handle user status changes
   */
  async handleUserStatusChange(statusData) {
    try {
      const { userId, newStatus, previousStatus } = statusData;
      
      // If user goes offline during active sessions
      if (previousStatus === 'online' && newStatus === 'offline') {
        const activeSessions = await Session.find({
          $or: [
            { patientId: userId },
            { helperId: userId }
          ],
          status: { $in: ['active', 'waiting'] }
        }).populate('patientId helperId', 'username anonymousId role');

        for (const session of activeSessions) {
          const isHelper = session.helperId?._id.toString() === userId;
          const otherParticipant = isHelper ? session.patientId : session.helperId;
          
          if (otherParticipant) {
            const notification = {
              id: `participant_offline_${session._id}`,
              type: 'participant-offline',
              priority: 'medium',
              title: `${isHelper ? 'Helper' : 'Patient'} Disconnected`,
              message: `The ${isHelper ? 'helper' : 'patient'} has gone offline. They may return shortly.`,
              data: {
                sessionId: session._id,
                participantRole: isHelper ? 'helper' : 'patient'
              },
              timestamp: new Date()
            };

            await this.sendNotification(notification, [otherParticipant]);
          }
        }
      }
    } catch (error) {
      console.error('Error handling user status change:', error);
    }
  }

  /**
   * Handle emergency broadcast
   */
  async handleEmergencyBroadcast(broadcastData) {
    try {
      const { message, targetRoles = ['counselor', 'admin'], priority = 'critical' } = broadcastData;
      
      const recipients = await this.getNotificationRecipients(targetRoles, {
        isActive: true
      });

      const notification = {
        id: `emergency_${Date.now()}`,
        type: 'emergency-broadcast',
        priority: priority,
        title: 'Emergency Alert',
        message: message,
        data: broadcastData,
        timestamp: new Date(),
        requiresAcknowledgment: true
      };

      await this.sendNotification(notification, recipients);

      // Also send to crisis responders room via Socket.io
      this.io.to('crisis_responders').emit('emergency-broadcast', notification);

    } catch (error) {
      console.error('Error handling emergency broadcast:', error);
    }
  }

  /**
   * Send notification to recipients
   */
  async sendNotification(notification, recipients) {
    try {
      const recipientIds = recipients.map(r => r._id.toString());
      
      // Send via Socket.io to online users
      recipientIds.forEach(userId => {
        this.io.to(`user_${userId}`).emit('notification', notification);
      });

      // Store notification in database for offline users
      await this.storeNotification(notification, recipientIds);

      // Send push notifications for high priority alerts
      if (notification.priority === 'high' || notification.priority === 'critical') {
        await this.sendPushNotifications(notification, recipients);
      }

      console.log(`📢 Notification sent to ${recipients.length} recipients: ${notification.title}`);

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Get notification recipients based on criteria
   */
  async getNotificationRecipients(targetRoles, additionalCriteria = {}) {
    try {
      const criteria = {
        role: { $in: targetRoles },
        isActive: true,
        ...additionalCriteria
      };

      return await User.find(criteria)
        .select('_id username email role preferences isOnline')
        .lean();
    } catch (error) {
      console.error('Error getting notification recipients:', error);
      return [];
    }
  }

  /**
   * Store notification in database
   */
  async storeNotification(notification, recipientIds) {
    try {
      // In production, implement a Notification model to store notifications
      // For now, log the notification
      console.log('Storing notification:', {
        id: notification.id,
        type: notification.type,
        recipients: recipientIds.length,
        timestamp: notification.timestamp
      });
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  /**
   * Send push notifications (placeholder for production implementation)
   */
  async sendPushNotifications(notification, recipients) {
    try {
      // In production, integrate with push notification services like:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNs)
      // - Web Push API
      
      console.log(`📱 Would send push notification to ${recipients.length} devices: ${notification.title}`);
      
      // Example implementation structure:
      /*
      const pushPromises = recipients.map(recipient => {
        if (recipient.preferences?.pushNotifications) {
          return sendPushToDevice(recipient.deviceToken, {
            title: notification.title,
            body: notification.message,
            data: notification.data
          });
        }
      });
      
      await Promise.allSettled(pushPromises);
      */
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  /**
   * Schedule follow-up notification
   */
  scheduleFollowUp(notificationId, delay) {
    setTimeout(async () => {
      const activeNotification = this.activeNotifications.get(notificationId);
      
      if (activeNotification && !activeNotification.acknowledged) {
        // Send follow-up notification
        const followUp = {
          ...activeNotification,
          id: `${notificationId}_followup`,
          title: `Follow-up: ${activeNotification.title}`,
          message: `This alert requires attention: ${activeNotification.message}`,
          priority: 'critical'
        };

        const recipients = await User.find({
          _id: { $in: activeNotification.recipients }
        });

        await this.sendNotification(followUp, recipients);
      }
    }, delay);
  }

  /**
   * Send emergency broadcast to all crisis responders
   */
  async sendEmergencyBroadcast(broadcastData) {
    this.emit('emergency-broadcast', {
      ...broadcastData,
      priority: 'critical'
    });
  }

  /**
   * Mark notification as acknowledged
   */
  acknowledgeNotification(notificationId, userId) {
    const notification = this.activeNotifications.get(notificationId);
    if (notification) {
      notification.acknowledged = true;
      notification.acknowledgedBy = userId;
      notification.acknowledgedAt = new Date();
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(timeframe = '24h') {
    try {
      const timeMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };

      const hours = timeMap[timeframe] || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // In production, query from Notification model
      const stats = {
        totalSent: 0,
        byType: {},
        byPriority: {},
        acknowledgmentRate: 0,
        avgResponseTime: 0
      };

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return null;
    }
  }
}

module.exports = NotificationService;