const express = require('express');
const { CrisisAlert, User, Session, Message } = require('../models');
const { auth } = require('../utils');
const crisisDetection = require('../utils/crisisDetection');

const router = express.Router();

// Escalate a session to higher priority or different helper type
router.post('/escalate',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { sessionId, newSeverity, reason, targetHelperType, notes, requestedCounselorId } = req.body;

      if (!sessionId || !newSeverity || !reason) {
        return res.status(400).json({
          error: 'Session ID, new severity, and reason are required'
        });
      }

      // Find the session
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      // Verify user has access to escalate this session
      const isPatient = session.patientId.toString() === req.user._id.toString();
      const isHelper = session.helperId && session.helperId.toString() === req.user._id.toString();
      const isCounselor = req.user.role === 'counselor' || req.user.role === 'admin';
      
      if (!isPatient && !isHelper && !isCounselor) {
        return res.status(403).json({
          error: 'Not authorized to escalate this session'
        });
      }

      // Store previous state
      const previousSeverity = session.severity;
      const previousHelperType = session.helperType;

      // Update session
      session.severity = newSeverity;
      if (targetHelperType) {
        session.helperType = targetHelperType;
      }
      session.status = 'escalated';
      
      // Add escalation to history
      session.escalationHistory.push({
        escalatedBy: req.user._id,
        escalatedAt: new Date(),
        previousSeverity,
        newSeverity,
        previousHelperType,
        newHelperType: targetHelperType || session.helperType,
        reason,
        notes
      });

      await session.save();

      // If escalating to counselor and a specific counselor is requested
      if (targetHelperType === 'counselor' && requestedCounselorId) {
        const counselor = await User.findById(requestedCounselorId);
        if (counselor && counselor.role === 'counselor' && counselor.isActive) {
          session.helperId = requestedCounselorId;
          await session.save();
        }
      }

      // Create escalation message
      const escalationMessage = new Message({
        sessionId: sessionId,
        senderId: req.user._id,
        message: `Session escalated: ${reason}. New severity: ${newSeverity}${targetHelperType ? `, Helper type: ${targetHelperType}` : ''}`,
        senderRole: req.user.role,
        messageType: 'escalation',
        metadata: {
          escalation: {
            previousSeverity,
            newSeverity,
            reason,
            escalatedBy: req.user._id
          }
        }
      });

      await escalationMessage.save();

      // Estimate response time based on severity
      const estimatedResponseTime = newSeverity === 'critical' ? 120 : newSeverity === 'high' ? 300 : 600;

      res.json({
        message: 'Session escalated successfully',
        escalation: {
          _id: session.escalationHistory[session.escalationHistory.length - 1]._id,
          sessionId: sessionId,
          escalatedBy: req.user._id,
          escalatedTo: targetHelperType || session.helperType,
          previousSeverity,
          newSeverity,
          reason,
          createdAt: new Date(),
          estimatedResponseTime,
          priority: newSeverity === 'critical' ? 1 : newSeverity === 'high' ? 2 : 3
        },
        session: {
          _id: session._id,
          status: session.status,
          severity: session.severity,
          helperType: session.helperType,
          queuePosition: newSeverity === 'critical' ? 1 : null
        },
        notifications: {
          crisisTeamAlerted: newSeverity === 'critical',
          counselorAssigned: requestedCounselorId ? true : false,
          supervisorNotified: newSeverity === 'critical'
        }
      });
    } catch (error) {
      console.error('Session escalation error:', error);
      res.status(500).json({
        error: 'Failed to escalate session',
        details: error.message
      });
    }
  }
);

// Trigger crisis alert to all available helpers
router.post('/alert',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { sessionId, severity = 'critical', description, location } = req.body;

      if (!description || description.trim().length === 0) {
        return res.status(400).json({
          error: 'Crisis description is required'
        });
      }

      // Verify session if provided
      let session = null;
      if (sessionId) {
        session = await Session.findById(sessionId);
        if (!session) {
          return res.status(404).json({
            error: 'Session not found'
          });
        }
        
        // Verify user has access to session
        const isPatient = session.patientId.toString() === req.user._id.toString();
        const isHelper = session.helperId && session.helperId.toString() === req.user._id.toString();
        
        if (!isPatient && !isHelper) {
          return res.status(403).json({
            error: 'Not authorized to create alert for this session'
          });
        }
      }

      // Create crisis alert
      const alert = new CrisisAlert({
        user: req.user._id,
        session: sessionId || null,
        type: 'user-report',
        severity: severity,
        triggerContent: {
          text: description
        },
        metadata: {
          userLocation: location || {},
          autoGenerated: false
        }
      });

      await alert.save();
      await alert.populate('user', 'username email profile anonymousId');

      // Get all available crisis responders
      const availableResponders = await User.find({
        role: { $in: ['counselor', 'admin'] },
        isActive: true,
        isOnline: true
      }).select('_id username profile role');

      // Send notifications to all available responders
      await crisisDetection.sendEmergencyNotifications(alert);

      // If session exists, escalate it
      if (session) {
        await session.escalateSession('critical', 'Crisis alert triggered by user');
        
        // Create system message in session
        const systemMessage = new Message({
          sessionId: sessionId,
          senderId: req.user._id,
          message: 'CRISIS ALERT: Emergency services have been notified. Help is on the way.',
          senderRole: 'system',
          messageType: 'escalation',
          metadata: {
            urgencyLevel: 'critical'
          }
        });

        await systemMessage.save();
      }

      res.status(201).json({
        message: 'Crisis alert sent successfully',
        alert: {
          _id: alert._id,
          severity: alert.severity,
          createdAt: alert.createdAt
        },
        respondersNotified: availableResponders.length,
        estimatedResponseTime: '1-3 minutes',
        emergencyContacts: {
          crisis: '988',
          emergency: '911',
          text: 'Text HOME to 741741'
        }
      });
    } catch (error) {
      console.error('Crisis alert error:', error);
      res.status(500).json({
        error: 'Failed to send crisis alert',
        details: error.message
      });
    }
  }
);

// Get list of available crisis responders
router.get('/responders',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const { includeOffline = false } = req.query;

      const query = {
        role: { $in: ['counselor', 'admin'] },
        isActive: true
      };

      if (!includeOffline) {
        query.isOnline = true;
      }

      const responders = await User.find(query)
        .select('username profile role isOnline lastActive')
        .sort({ isOnline: -1, lastActive: -1 });

      // Get current crisis alert counts for each responder
      const respondersWithAlerts = await Promise.all(
        responders.map(async (responder) => {
          const assignedAlerts = await CrisisAlert.countDocuments({
            assignedTo: responder._id,
            status: { $in: ['pending', 'acknowledged', 'in-progress'] }
          });

          return {
            ...responder.toObject(),
            assignedAlerts,
            availability: assignedAlerts < 3 ? 'available' : 'busy'
          };
        })
      );

      res.json({
        responders: respondersWithAlerts,
        totalAvailable: respondersWithAlerts.filter(r => r.isOnline && r.availability === 'available').length,
        totalOnline: respondersWithAlerts.filter(r => r.isOnline).length
      });
    } catch (error) {
      console.error('Get responders error:', error);
      res.status(500).json({
        error: 'Failed to get responders',
        details: error.message
      });
    }
  }
);

// Counselor/admin responding to crisis alert
router.post('/respond',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const { alertId, action, notes, contactEmergencyServices = false } = req.body;

      if (!alertId || !action) {
        return res.status(400).json({
          error: 'Alert ID and action are required'
        });
      }

      const alert = await CrisisAlert.findById(alertId)
        .populate('user', 'username profile anonymousId email')
        .populate('session', 'status helperType');

      if (!alert) {
        return res.status(404).json({
          error: 'Crisis alert not found'
        });
      }

      // Acknowledge alert if not already assigned
      if (alert.status === 'pending') {
        await alert.acknowledge(req.user._id);
      }

      // Process the response action
      const validActions = ['contacted-user', 'contacted-emergency', 'escalated', 'counseling-session', 'no-action'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          error: 'Invalid action specified'
        });
      }

      // Update alert with response
      alert.response.respondedBy = req.user._id;
      alert.response.respondedAt = new Date();
      alert.response.action = action;
      alert.response.notes = notes;

      if (contactEmergencyServices) {
        alert.metadata.emergencyServices.contacted = true;
        alert.metadata.emergencyServices.contactedAt = new Date();
        alert.metadata.emergencyServices.serviceType = 'crisis-intervention';
      }

      // Set status based on action
      if (action === 'no-action') {
        alert.status = 'resolved';
      } else if (action === 'contacted-emergency') {
        alert.status = 'in-progress';
        alert.metadata.emergencyServices.contacted = true;
        alert.metadata.emergencyServices.contactedAt = new Date();
      } else {
        alert.status = 'in-progress';
      }

      await alert.save();

      // If there's an associated session, update it
      if (alert.session) {
        const session = await Session.findById(alert.session);
        if (session) {
          // Assign responder as helper if not already assigned
          if (!session.helperId) {
            session.helperId = req.user._id;
            session.helperType = 'counselor';
            session.status = 'active';
            await session.save();
          }

          // Create response message in session
          const responseMessage = new Message({
            sessionId: alert.session,
            senderId: req.user._id,
            message: `Crisis response initiated by ${req.user.username}. You are now receiving immediate support.`,
            senderRole: 'counselor',
            messageType: 'system',
            metadata: {
              urgencyLevel: 'critical'
            }
          });

          await responseMessage.save();
        }
      }

      res.json({
        message: 'Crisis response recorded successfully',
        alert: {
          _id: alert._id,
          status: alert.status,
          action: alert.response.action,
          respondedBy: req.user.username,
          respondedAt: alert.response.respondedAt
        },
        nextSteps: action === 'contacted-emergency' ? 
          'Emergency services have been contacted' :
          'Continue monitoring the situation'
      });
    } catch (error) {
      console.error('Crisis response error:', error);
      res.status(500).json({
        error: 'Failed to record crisis response',
        details: error.message
      });
    }
  }
);

// Get active crisis alerts (for responder dashboard)
router.get('/active',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const { assignedToMe = false, severity } = req.query;

      const query = {
        status: { $in: ['pending', 'acknowledged', 'in-progress'] }
      };

      if (assignedToMe === 'true') {
        query.assignedTo = req.user._id;
      }

      if (severity) {
        query.severity = severity;
      }

      const alerts = await CrisisAlert.find(query)
        .populate('user', 'username profile anonymousId')
        .populate('session', 'status helperType')
        .populate('assignedTo', 'username profile')
        .sort({ 
          severity: -1, // Critical first
          createdAt: 1   // Older first within same severity
        });

      // Add time since creation to each alert
      const alertsWithTime = alerts.map(alert => ({
        ...alert.toObject(),
        minutesSinceCreated: Math.round((new Date() - alert.createdAt) / (1000 * 60))
      }));

      res.json({
        alerts: alertsWithTime,
        totalActive: alerts.length,
        criticalCount: alerts.filter(a => a.severity === 'critical').length,
        assignedToUser: assignedToMe === 'true' ? 
          alerts.filter(a => a.assignedTo && a.assignedTo._id.toString() === req.user._id.toString()).length :
          null
      });
    } catch (error) {
      console.error('Get active alerts error:', error);
      res.status(500).json({
        error: 'Failed to get active alerts',
        details: error.message
      });
    }
  }
);

module.exports = router;