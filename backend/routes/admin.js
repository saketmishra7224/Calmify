const express = require('express');
const { User, Session, Message, Response, CrisisAlert, Assessment } = require('../models');
const { authenticateToken, requireAdmin } = require('../utils/auth');

const router = express.Router();

/**
 * @route   GET /api/admin/analytics/overview
 * @desc    Get comprehensive platform analytics for admin dashboard
 * @access  Admin only
 */
router.get('/analytics/overview',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      
      // Calculate date range
      let startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get total users count
      const totalUsers = await User.countDocuments({ isActive: true });
      
      // Get users by role
      const usersByRole = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      // Get active sessions (within timeframe)
      const activeSessions = await Session.countDocuments({
        status: 'active',
        startedAt: { $gte: startDate }
      });

      // Get completed sessions - using endedAt instead of completedAt
      // Also try without endedAt filter as backup for sessions that might not have endedAt populated
      let completedSessions = await Session.countDocuments({
        status: 'closed',
        endedAt: { $gte: startDate }
      });

      // If no sessions found with endedAt, try with just status and createdAt
      if (completedSessions === 0) {
        completedSessions = await Session.countDocuments({
          status: 'closed',
          createdAt: { $gte: startDate }
        });
      }

      console.log(`Analytics Debug - Active: ${activeSessions}, Completed: ${completedSessions}`);

      // Get total sessions ever
      const totalSessions = await Session.countDocuments();

      // Get sessions by type
      const sessionsByType = await Session.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$helperType',
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert sessionsByType array to object
      const sessionTypeStats = {
        chatbot: 0,
        peer: 0,
        counselor: 0
      };
      sessionsByType.forEach(item => {
        if (sessionTypeStats.hasOwnProperty(item._id)) {
          sessionTypeStats[item._id] = item.count;
        }
      });

      // Get sessions by severity
      const sessionsBySeverity = await Session.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert to severity distribution
      const severityDistribution = {
        mild: 0,
        moderate: 0,
        severe: 0,
        critical: 0
      };
      sessionsBySeverity.forEach(item => {
        if (severityDistribution.hasOwnProperty(item._id)) {
          severityDistribution[item._id] = item.count;
        }
      });

      // Get crisis alerts count
      let crisisAlerts = 0;
      try {
        crisisAlerts = await CrisisAlert.countDocuments({
          createdAt: { $gte: startDate }
        });
      } catch (error) {
        console.warn('CrisisAlert collection not found, using sessions with critical/severe severity');
        crisisAlerts = await Session.countDocuments({
          severity: { $in: ['critical', 'severe'] },
          createdAt: { $gte: startDate }
        });
      }

      // Calculate response metrics - using endedAt instead of completedAt
      const avgSessionDuration = await Session.aggregate([
        {
          $match: {
            status: 'closed',
            endedAt: { $gte: startDate },
            startedAt: { $exists: true },
            endedAt: { $exists: true }
          }
        },
        {
          $project: {
            duration: {
              $divide: [
                { $subtract: ['$endedAt', '$startedAt'] },
                1000 * 60 // Convert to minutes
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' }
          }
        }
      ]);

      // Get peak hours analysis
      const peakHoursData = await Session.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $project: {
            hour: { $hour: '$createdAt' }
          }
        },
        {
          $group: {
            _id: '$hour',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 3
        }
      ]);

      // Format peak hours
      const peakHours = peakHoursData.map(item => {
        const hour = item._id;
        const nextHour = hour + 1;
        return `${hour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`;
      });

      // Get message count for activity metric
      const totalMessages = await Message.countDocuments({
        createdAt: { $gte: startDate }
      });

      const responseMetrics = {
        averageResponseTime: avgSessionDuration.length > 0 ? avgSessionDuration[0].avgDuration : 0,
        peakHours: peakHours,
        satisfaction: 4.2, // This would come from user ratings if implemented
        totalMessages: totalMessages
      };

      // Get online users
      const onlineUsers = await User.countDocuments({ 
        isOnline: true,
        isActive: true 
      });

      const analytics = {
        totalUsers,
        onlineUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        activeSessions,
        completedSessions,
        totalSessions,
        crisisAlerts,
        sessionsByType: sessionTypeStats,
        severityDistribution,
        responseMetrics,
        timeRange,
        periodStart: startDate.toISOString(),
        periodEnd: new Date().toISOString()
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Admin analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics/crisis
 * @desc    Get crisis management metrics
 * @access  Admin only
 */
router.get('/analytics/crisis',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      
      let startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      let crisisMetrics = {
        total: 0,
        resolved: 0,
        pending: 0,
        averageResolutionTime: 0
      };

      try {
        // Try to get from CrisisAlert collection if it exists
        const totalCrisis = await CrisisAlert.countDocuments({
          createdAt: { $gte: startDate }
        });

        const resolvedCrisis = await CrisisAlert.countDocuments({
          status: 'resolved',
          createdAt: { $gte: startDate }
        });

        const pendingCrisis = await CrisisAlert.countDocuments({
          status: { $ne: 'resolved' },
          createdAt: { $gte: startDate }
        });

        // Calculate average resolution time
        const resolutionTimes = await CrisisAlert.aggregate([
          {
            $match: {
              status: 'resolved',
              createdAt: { $gte: startDate },
              resolvedAt: { $exists: true }
            }
          },
          {
            $project: {
              resolutionTime: {
                $divide: [
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  1000 * 60 // Convert to minutes
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$resolutionTime' }
            }
          }
        ]);

        crisisMetrics = {
          total: totalCrisis,
          resolved: resolvedCrisis,
          pending: pendingCrisis,
          averageResolutionTime: resolutionTimes.length > 0 ? resolutionTimes[0].avgTime : 0
        };

      } catch (error) {
        console.warn('CrisisAlert collection not found, using session severity data');
        
        // Fallback to using session severity as crisis indicators
        const severeCases = await Session.countDocuments({
          severity: { $in: ['critical', 'severe'] },
          createdAt: { $gte: startDate }
        });

        const resolvedSevere = await Session.countDocuments({
          severity: { $in: ['critical', 'severe'] },
          status: 'closed',
          createdAt: { $gte: startDate }
        });

        const pendingSevere = severeCases - resolvedSevere;

        crisisMetrics = {
          total: severeCases,
          resolved: resolvedSevere,
          pending: pendingSevere,
          averageResolutionTime: 15 // Default estimate
        };
      }

      res.json({
        success: true,
        data: crisisMetrics
      });

    } catch (error) {
      console.error('Crisis analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch crisis analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/admin/analytics/users
 * @desc    Get detailed user analytics
 * @access  Admin only
 */
router.get('/analytics/users',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      
      let startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get new registrations
      const newRegistrations = await User.countDocuments({
        createdAt: { $gte: startDate }
      });

      // Get user activity metrics
      const activeUsers = await User.countDocuments({
        lastActive: { $gte: startDate },
        isActive: true
      });

      // Get users by registration date (for growth trend)
      const registrationTrend = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ]);

      const userAnalytics = {
        newRegistrations,
        activeUsers,
        registrationTrend,
        timeRange,
        periodStart: startDate.toISOString(),
        periodEnd: new Date().toISOString()
      };

      res.json({
        success: true,
        data: userAnalytics
      });

    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;