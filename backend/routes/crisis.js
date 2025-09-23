const express = require('express');
const { CrisisAlert, User, Session, Message } = require('../models');
const { auth, validation } = require('../utils');
const crisisDetection = require('../utils/crisisDetection');

const router = express.Router();

// Get all crisis alerts (counselor/admin only)
router.get('/',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const { status, severity, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      if (severity && severity !== 'all') {
        query.severity = severity;
      }

      const alerts = await CrisisAlert.find(query)
        .populate('user', 'username email profile')
        .populate('session', 'title type')
        .populate('assignedTo', 'username profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await CrisisAlert.countDocuments(query);

      res.json({
        alerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get crisis alerts error:', error);
      res.status(500).json({
        error: 'Failed to get crisis alerts',
        details: error.message
      });
    }
  }
);

// Get crisis alert details
router.get('/:alertId',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const alert = await CrisisAlert.findById(req.params.alertId)
        .populate('user', 'username email profile preferences')
        .populate('session', 'title type participants')
        .populate('message', 'content createdAt')
        .populate('assignedTo', 'username profile')
        .populate('response.respondedBy', 'username profile');

      if (!alert) {
        return res.status(404).json({
          error: 'Crisis alert not found'
        });
      }

      res.json({
        alert
      });
    } catch (error) {
      console.error('Get crisis alert error:', error);
      res.status(500).json({
        error: 'Failed to get crisis alert',
        details: error.message
      });
    }
  }
);

// Acknowledge crisis alert
router.post('/:alertId/acknowledge',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const alert = await CrisisAlert.findById(req.params.alertId);
      
      if (!alert) {
        return res.status(404).json({
          error: 'Crisis alert not found'
        });
      }

      if (alert.status !== 'pending') {
        return res.status(400).json({
          error: 'Alert has already been acknowledged'
        });
      }

      await alert.acknowledge(req.user._id);

      res.json({
        message: 'Crisis alert acknowledged',
        alert
      });
    } catch (error) {
      console.error('Acknowledge alert error:', error);
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        details: error.message
      });
    }
  }
);

// Resolve crisis alert
router.post('/:alertId/resolve',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const { action, notes, followUpRequired, followUpDate } = req.body;

      if (!action) {
        return res.status(400).json({
          error: 'Action is required to resolve alert'
        });
      }

      const alert = await CrisisAlert.findById(req.params.alertId);
      
      if (!alert) {
        return res.status(404).json({
          error: 'Crisis alert not found'
        });
      }

      await alert.resolve(req.user._id, action, notes);

      if (followUpRequired && followUpDate) {
        alert.response.followUpRequired = true;
        alert.response.followUpDate = new Date(followUpDate);
        await alert.save();
      }

      res.json({
        message: 'Crisis alert resolved',
        alert
      });
    } catch (error) {
      console.error('Resolve alert error:', error);
      res.status(500).json({
        error: 'Failed to resolve alert',
        details: error.message
      });
    }
  }
);

// Escalate crisis alert
router.post('/:alertId/escalate',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const { newSeverity, reason } = req.body;

      if (!newSeverity) {
        return res.status(400).json({
          error: 'New severity level is required'
        });
      }

      const alert = await CrisisAlert.findById(req.params.alertId);
      
      if (!alert) {
        return res.status(404).json({
          error: 'Crisis alert not found'
        });
      }

      await alert.escalate(newSeverity);

      // Add escalation note
      if (reason) {
        alert.response.notes = (alert.response.notes || '') + `\nEscalated by ${req.user.username}: ${reason}`;
        await alert.save();
      }

      // Send additional notifications for critical escalations
      if (newSeverity === 'critical') {
        await crisisDetection.sendEmergencyNotifications(alert);
      }

      res.json({
        message: 'Crisis alert escalated',
        alert
      });
    } catch (error) {
      console.error('Escalate alert error:', error);
      res.status(500).json({
        error: 'Failed to escalate alert',
        details: error.message
      });
    }
  }
);

// Create manual crisis alert
router.post('/create',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  validation.validate(validation.validateCrisisAlert),
  async (req, res) => {
    try {
      const { userId, sessionId, type, severity, description } = req.body;

      const alert = new CrisisAlert({
        user: userId,
        session: sessionId,
        type: type || 'counselor-escalation',
        severity,
        triggerContent: {
          text: description
        },
        assignedTo: req.user._id
      });

      await alert.save();
      await alert.populate('user', 'username email profile');

      // Send notifications for high severity alerts
      if (severity === 'critical' || severity === 'high') {
        await crisisDetection.sendEmergencyNotifications(alert);
      }

      res.status(201).json({
        message: 'Crisis alert created',
        alert
      });
    } catch (error) {
      console.error('Create manual alert error:', error);
      res.status(500).json({
        error: 'Failed to create crisis alert',
        details: error.message
      });
    }
  }
);

// Get crisis statistics
router.get('/stats/overview',
  auth.authenticateToken,
  auth.requireCounselorOrAdmin,
  async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;
      const stats = await crisisDetection.getCrisisStatistics(timeframe);

      res.json({
        statistics: stats
      });
    } catch (error) {
      console.error('Get crisis stats error:', error);
      res.status(500).json({
        error: 'Failed to get crisis statistics',
        details: error.message
      });
    }
  }
);

// Test crisis detection (development only)
router.post('/test-detection',
  auth.authenticateToken,
  auth.requireAdmin,
  async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          error: 'Text is required for testing'
        });
      }

      const analysis = crisisDetection.analyzeMessageForCrisis(text);

      res.json({
        analysis,
        message: 'Crisis detection test completed'
      });
    } catch (error) {
      console.error('Test crisis detection error:', error);
      res.status(500).json({
        error: 'Failed to test crisis detection',
        details: error.message
      });
    }
  }
);

module.exports = router;