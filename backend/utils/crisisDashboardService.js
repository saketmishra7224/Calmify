/**
 * Real-time Crisis Dashboard System
 * Live monitoring, session tracking, and priority escalation interface
 */

const { CrisisAlert, Session, User, Message } = require('../models');

class CrisisDashboardService {
  constructor(io) {
    this.io = io;
    this.dashboardClients = new Map();
    this.monitoringInterval = null;
    this.alertCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    this.initializeDashboard();
  }
  
  /**
   * Initialize dashboard monitoring
   */
  initializeDashboard() {
    // Set up real-time monitoring
    this.startRealTimeMonitoring();
    
    // Initialize dashboard data
    this.updateDashboardData();
    
    console.log('Crisis Dashboard Service initialized');
  }
  
  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateDashboardData();
        await this.checkForEscalations();
        await this.updateSystemMetrics();
      } catch (error) {
        console.error('Error in dashboard monitoring:', error);
      }
    }, 30000);
    
    console.log('Real-time monitoring started');
  }
  
  /**
   * Register dashboard client
   */
  registerDashboardClient(socketId, userId, role) {
    const client = {
      socketId,
      userId,
      role,
      connectedAt: new Date(),
      permissions: this.getDashboardPermissions(role)
    };
    
    this.dashboardClients.set(socketId, client);
    
    // Send initial dashboard data
    this.sendInitialDashboardData(socketId, client.permissions);
    
    console.log(`Dashboard client registered: ${userId} (${role})`);
  }
  
  /**
   * Unregister dashboard client
   */
  unregisterDashboardClient(socketId) {
    this.dashboardClients.delete(socketId);
    console.log(`Dashboard client unregistered: ${socketId}`);
  }
  
  /**
   * Get dashboard permissions based on role
   */
  getDashboardPermissions(role) {
    const permissions = {
      admin: {
        viewAllAlerts: true,
        viewPersonalInfo: true,
        manageCounselors: true,
        accessReports: true,
        systemControls: true,
        emergencyOverride: true
      },
      supervisor: {
        viewAllAlerts: true,
        viewPersonalInfo: true,
        manageCounselors: true,
        accessReports: true,
        systemControls: false,
        emergencyOverride: true
      },
      crisis_manager: {
        viewAllAlerts: true,
        viewPersonalInfo: false,
        manageCounselors: false,
        accessReports: true,
        systemControls: false,
        emergencyOverride: true
      },
      counselor: {
        viewAllAlerts: false,
        viewPersonalInfo: false,
        manageCounselors: false,
        accessReports: false,
        systemControls: false,
        emergencyOverride: false
      }
    };
    
    return permissions[role] || permissions.counselor;
  }
  
  /**
   * Send initial dashboard data to client
   */
  async sendInitialDashboardData(socketId, permissions) {
    try {
      const dashboardData = await this.generateDashboardData(permissions);
      
      this.io.to(socketId).emit('dashboard_initial_data', {
        timestamp: new Date(),
        data: dashboardData,
        permissions
      });
      
    } catch (error) {
      console.error('Error sending initial dashboard data:', error);
    }
  }
  
  /**
   * Generate comprehensive dashboard data
   */
  async generateDashboardData(permissions) {
    const data = {};
    
    try {
      // Crisis alerts overview
      data.crisisOverview = await this.getCrisisOverview(permissions);
      
      // Active sessions
      data.activeSessions = await this.getActiveSessions(permissions);
      
      // Counselor status
      data.counselorStatus = await this.getCounselorStatus(permissions);
      
      // System metrics
      data.systemMetrics = await this.getSystemMetrics();
      
      // Recent activity
      data.recentActivity = await this.getRecentActivity(permissions);
      
      // Priority queue
      data.priorityQueue = await this.getPriorityQueue(permissions);
      
      // Response times
      data.responseMetrics = await this.getResponseMetrics();
      
      return data;
      
    } catch (error) {
      console.error('Error generating dashboard data:', error);
      throw error;
    }
  }
  
  /**
   * Get crisis alerts overview
   */
  async getCrisisOverview(permissions) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      
      const overview = {
        activeAlerts: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          total: 0
        },
        hourlyTrends: {
          lastHour: 0,
          previousHour: 0,
          trend: 'stable'
        },
        dailyStats: {
          today: 0,
          yesterday: 0,
          weekAverage: 0
        },
        categoryBreakdown: {
          suicide: 0,
          selfHarm: 0,
          violence: 0,
          substance: 0,
          other: 0
        }
      };
      
      // Get active alerts
      const activeAlerts = await CrisisAlert.find({
        status: 'active',
        createdAt: { $gte: oneDayAgo }
      });
      
      // Count by severity
      activeAlerts.forEach(alert => {
        overview.activeAlerts[alert.severity]++;
        overview.activeAlerts.total++;
        
        // Count by category
        if (alert.categories.includes('suicide')) {
          overview.categoryBreakdown.suicide++;
        } else if (alert.categories.includes('selfHarm')) {
          overview.categoryBreakdown.selfHarm++;
        } else if (alert.categories.includes('violence')) {
          overview.categoryBreakdown.violence++;
        } else if (alert.categories.includes('substance')) {
          overview.categoryBreakdown.substance++;
        } else {
          overview.categoryBreakdown.other++;
        }
      });
      
      // Calculate hourly trends
      const lastHourAlerts = await CrisisAlert.countDocuments({
        createdAt: { $gte: oneHourAgo }
      });
      
      const previousHourAlerts = await CrisisAlert.countDocuments({
        createdAt: { 
          $gte: new Date(oneHourAgo - 60 * 60 * 1000),
          $lt: oneHourAgo
        }
      });
      
      overview.hourlyTrends.lastHour = lastHourAlerts;
      overview.hourlyTrends.previousHour = previousHourAlerts;
      
      if (lastHourAlerts > previousHourAlerts) {
        overview.hourlyTrends.trend = 'increasing';
      } else if (lastHourAlerts < previousHourAlerts) {
        overview.hourlyTrends.trend = 'decreasing';
      }
      
      // Calculate daily stats
      overview.dailyStats.today = await CrisisAlert.countDocuments({
        createdAt: { $gte: oneDayAgo }
      });
      
      const yesterdayStart = new Date(oneDayAgo - 24 * 60 * 60 * 1000);
      overview.dailyStats.yesterday = await CrisisAlert.countDocuments({
        createdAt: { 
          $gte: yesterdayStart,
          $lt: oneDayAgo
        }
      });
      
      return overview;
      
    } catch (error) {
      console.error('Error getting crisis overview:', error);
      return {};
    }
  }
  
  /**
   * Get active sessions data
   */
  async getActiveSessions(permissions) {
    try {
      const activeSessions = await Session.find({
        status: 'active',
        endedAt: null
      })
      .populate('user', permissions.viewPersonalInfo ? 'name email' : '_id')
      .populate('helper', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);
      
      const sessionData = {
        total: activeSessions.length,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        byType: { crisis: 0, regular: 0, group: 0 },
        avgDuration: 0,
        sessions: []
      };
      
      let totalDuration = 0;
      
      activeSessions.forEach(session => {
        const duration = new Date() - session.createdAt;
        totalDuration += duration;
        
        // Count by type
        sessionData.byType[session.type] = (sessionData.byType[session.type] || 0) + 1;
        
        // Count by severity (if crisis session)
        if (session.crisisLevel) {
          sessionData.bySeverity[session.crisisLevel]++;
        }
        
        sessionData.sessions.push({
          id: session._id,
          type: session.type,
          severity: session.crisisLevel,
          user: permissions.viewPersonalInfo ? session.user : { _id: session.user._id },
          helper: session.helper,
          duration: Math.round(duration / 60000), // minutes
          lastActivity: session.lastActivity || session.createdAt,
          status: session.status
        });
      });
      
      sessionData.avgDuration = activeSessions.length > 0 ? 
        Math.round(totalDuration / activeSessions.length / 60000) : 0;
      
      return sessionData;
      
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return {};
    }
  }
  
  /**
   * Get counselor status data
   */
  async getCounselorStatus(permissions) {
    try {
      if (!permissions.manageCounselors) {
        return { error: 'Insufficient permissions' };
      }
      
      const counselors = await User.find({
        role: { $in: ['counselor', 'therapist', 'crisis_counselor'] },
        isActive: true
      }).select('name role availability currentLoad maxSessionCapacity lastActivity');
      
      const statusData = {
        total: counselors.length,
        available: 0,
        busy: 0,
        offline: 0,
        overloaded: 0,
        counselors: []
      };
      
      const now = new Date();
      
      counselors.forEach(counselor => {
        const lastActivity = counselor.lastActivity || new Date(0);
        const isOnline = (now - lastActivity) < 5 * 60 * 1000; // 5 minutes
        const currentLoad = counselor.currentLoad || 0;
        const maxCapacity = counselor.maxSessionCapacity || 5;
        
        let status = 'offline';
        if (isOnline) {
          if (currentLoad >= maxCapacity) {
            status = 'overloaded';
            statusData.overloaded++;
          } else if (currentLoad > 0) {
            status = 'busy';
            statusData.busy++;
          } else {
            status = 'available';
            statusData.available++;
          }
        } else {
          statusData.offline++;
        }
        
        statusData.counselors.push({
          id: counselor._id,
          name: counselor.name,
          role: counselor.role,
          status,
          currentLoad,
          maxCapacity,
          availability: counselor.availability,
          lastActivity: counselor.lastActivity,
          loadPercentage: Math.round((currentLoad / maxCapacity) * 100)
        });
      });
      
      return statusData;
      
    } catch (error) {
      console.error('Error getting counselor status:', error);
      return {};
    }
  }
  
  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      
      const metrics = {
        responseTime: {
          average: 0,
          median: 0,
          percentile95: 0
        },
        systemLoad: {
          cpu: 0,
          memory: 0,
          activeConnections: this.dashboardClients.size
        },
        alertsPerHour: 0,
        resolutionRate: 0,
        escalationRate: 0,
        timestamp: now
      };
      
      // Get recent response times
      const recentSessions = await Session.find({
        createdAt: { $gte: oneHourAgo },
        responseTime: { $exists: true }
      }).select('responseTime');
      
      if (recentSessions.length > 0) {
        const responseTimes = recentSessions.map(s => s.responseTime).sort((a, b) => a - b);
        metrics.responseTime.average = Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        );
        metrics.responseTime.median = responseTimes[Math.floor(responseTimes.length / 2)];
        metrics.responseTime.percentile95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      }
      
      // Get alerts per hour
      metrics.alertsPerHour = await CrisisAlert.countDocuments({
        createdAt: { $gte: oneHourAgo }
      });
      
      // Calculate resolution rate (resolved alerts / total alerts)
      const totalAlerts = await CrisisAlert.countDocuments({
        createdAt: { $gte: oneHourAgo }
      });
      
      const resolvedAlerts = await CrisisAlert.countDocuments({
        createdAt: { $gte: oneHourAgo },
        status: 'resolved'
      });
      
      metrics.resolutionRate = totalAlerts > 0 ? 
        Math.round((resolvedAlerts / totalAlerts) * 100) : 0;
      
      // Calculate escalation rate
      const escalatedAlerts = await CrisisAlert.countDocuments({
        createdAt: { $gte: oneHourAgo },
        escalationLevel: { $gt: 0 }
      });
      
      metrics.escalationRate = totalAlerts > 0 ? 
        Math.round((escalatedAlerts / totalAlerts) * 100) : 0;
      
      // System load (simplified)
      const memUsage = process.memoryUsage();
      metrics.systemLoad.memory = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      
      return metrics;
      
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return {};
    }
  }
  
  /**
   * Get recent activity
   */
  async getRecentActivity(permissions) {
    try {
      const activities = [];
      
      // Recent crisis alerts
      const recentAlerts = await CrisisAlert.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', permissions.viewPersonalInfo ? 'name' : '_id');
      
      recentAlerts.forEach(alert => {
        activities.push({
          type: 'crisis_alert',
          severity: alert.severity,
          user: permissions.viewPersonalInfo ? alert.user?.name : `User ${alert.user?._id}`,
          timestamp: alert.createdAt,
          status: alert.status,
          categories: alert.categories
        });
      });
      
      // Recent session starts
      const recentSessions = await Session.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', permissions.viewPersonalInfo ? 'name' : '_id')
        .populate('helper', 'name');
      
      recentSessions.forEach(session => {
        activities.push({
          type: 'session_start',
          sessionType: session.type,
          user: permissions.viewPersonalInfo ? session.user?.name : `User ${session.user?._id}`,
          helper: session.helper?.name,
          timestamp: session.createdAt,
          status: session.status
        });
      });
      
      // Sort by timestamp
      return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
      
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }
  
  /**
   * Get priority queue
   */
  async getPriorityQueue(permissions) {
    try {
      const priorityQueue = await CrisisAlert.find({
        status: 'active'
      })
      .sort({ priorityScore: -1, createdAt: 1 })
      .limit(20)
      .populate('user', permissions.viewPersonalInfo ? 'name age' : '_id')
      .populate('session', 'type helper');
      
      return priorityQueue.map(alert => ({
        id: alert._id,
        severity: alert.severity,
        priority: alert.priority,
        priorityScore: alert.priorityScore,
        user: permissions.viewPersonalInfo ? alert.user : { _id: alert.user?._id },
        categories: alert.categories,
        waitTime: Math.round((new Date() - alert.createdAt) / 60000), // minutes
        session: alert.session,
        riskFactors: alert.riskFactors,
        timestamp: alert.createdAt
      }));
      
    } catch (error) {
      console.error('Error getting priority queue:', error);
      return [];
    }
  }
  
  /**
   * Get response metrics
   */
  async getResponseMetrics() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      
      const metrics = {
        averageResponseTime: 0,
        criticalResponseTime: 0,
        counselorUtilization: 0,
        userSatisfaction: 0,
        escalationFrequency: 0
      };
      
      // Get sessions with response times
      const sessionsWithResponse = await Session.find({
        createdAt: { $gte: oneDayAgo },
        responseTime: { $exists: true }
      });
      
      if (sessionsWithResponse.length > 0) {
        const totalResponseTime = sessionsWithResponse.reduce((sum, session) => 
          sum + session.responseTime, 0);
        metrics.averageResponseTime = Math.round(totalResponseTime / sessionsWithResponse.length);
        
        // Critical sessions response time
        const criticalSessions = sessionsWithResponse.filter(s => s.crisisLevel === 'critical');
        if (criticalSessions.length > 0) {
          const criticalResponseTime = criticalSessions.reduce((sum, session) => 
            sum + session.responseTime, 0);
          metrics.criticalResponseTime = Math.round(criticalResponseTime / criticalSessions.length);
        }
      }
      
      return metrics;
      
    } catch (error) {
      console.error('Error getting response metrics:', error);
      return {};
    }
  }
  
  /**
   * Update dashboard data and broadcast to clients
   */
  async updateDashboardData() {
    try {
      const updates = {
        timestamp: new Date()
      };
      
      // Send updates to each connected client based on their permissions
      for (const [socketId, client] of this.dashboardClients) {
        try {
          const dashboardData = await this.generateDashboardData(client.permissions);
          
          this.io.to(socketId).emit('dashboard_update', {
            ...updates,
            data: dashboardData
          });
          
        } catch (error) {
          console.error(`Error sending update to client ${socketId}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Error updating dashboard data:', error);
    }
  }
  
  /**
   * Broadcast crisis alert to dashboard
   */
  broadcastCrisisAlert(alert, analysis) {
    const alertData = {
      type: 'new_crisis_alert',
      alert: {
        id: alert._id,
        severity: alert.severity,
        confidence: alert.confidence,
        categories: alert.categories,
        priority: alert.priority,
        priorityScore: alert.priorityScore,
        riskFactors: alert.riskFactors,
        timestamp: alert.createdAt
      },
      analysis: {
        riskLevel: analysis.riskLevel,
        categoryScores: analysis.categoryScores,
        requiresImmediate: analysis.requiresImmediate
      },
      timestamp: new Date()
    };
    
    // Broadcast to all dashboard clients
    this.io.to('admin_room').emit('crisis_alert_broadcast', alertData);
    
    // Update alert counts
    this.alertCounts[alert.severity]++;
    
    console.log(`Crisis alert broadcasted to dashboard: ${alert.severity} - ${alert._id}`);
  }
  
  /**
   * Broadcast session update
   */
  broadcastSessionUpdate(session, updateType) {
    const sessionData = {
      type: 'session_update',
      updateType, // 'started', 'ended', 'escalated', 'assigned'
      session: {
        id: session._id,
        type: session.type,
        status: session.status,
        severity: session.crisisLevel,
        helper: session.helper,
        duration: session.duration,
        timestamp: new Date()
      }
    };
    
    this.io.to('admin_room').emit('session_update_broadcast', sessionData);
    
    console.log(`Session update broadcasted: ${updateType} - ${session._id}`);
  }
  
  /**
   * Get dashboard statistics for reporting
   */
  async getDashboardStatistics(timeframe = '24h') {
    try {
      const now = new Date();
      let startTime;
      
      switch (timeframe) {
        case '1h':
          startTime = new Date(now - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now - 24 * 60 * 60 * 1000);
      }
      
      const stats = {
        timeframe,
        startTime,
        endTime: now,
        alerts: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byCategory: { suicide: 0, selfHarm: 0, violence: 0, substance: 0, other: 0 },
          resolved: 0,
          escalated: 0
        },
        sessions: {
          total: 0,
          crisis: 0,
          regular: 0,
          averageDuration: 0,
          completed: 0
        },
        performance: {
          averageResponseTime: 0,
          counselorUtilization: 0,
          systemUptime: 0
        }
      };
      
      // Get alert statistics
      const alerts = await CrisisAlert.find({
        createdAt: { $gte: startTime }
      });
      
      stats.alerts.total = alerts.length;
      
      alerts.forEach(alert => {
        stats.alerts.bySeverity[alert.severity]++;
        
        if (alert.status === 'resolved') stats.alerts.resolved++;
        if (alert.escalationLevel > 0) stats.alerts.escalated++;
        
        alert.categories.forEach(category => {
          if (stats.alerts.byCategory[category] !== undefined) {
            stats.alerts.byCategory[category]++;
          } else {
            stats.alerts.byCategory.other++;
          }
        });
      });
      
      // Get session statistics
      const sessions = await Session.find({
        createdAt: { $gte: startTime }
      });
      
      stats.sessions.total = sessions.length;
      
      let totalDuration = 0;
      sessions.forEach(session => {
        if (session.type === 'crisis') stats.sessions.crisis++;
        else stats.sessions.regular++;
        
        if (session.status === 'completed') {
          stats.sessions.completed++;
          if (session.duration) totalDuration += session.duration;
        }
      });
      
      stats.sessions.averageDuration = stats.sessions.completed > 0 ? 
        Math.round(totalDuration / stats.sessions.completed) : 0;
      
      return stats;
      
    } catch (error) {
      console.error('Error getting dashboard statistics:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup dashboard service
   */
  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.dashboardClients.clear();
    console.log('Crisis Dashboard Service cleaned up');
  }
}

module.exports = CrisisDashboardService;