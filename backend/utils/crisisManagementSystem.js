/**
 * Crisis Management System Integration
 * Main orchestrator for all crisis management components
 */

const { analyzeAdvancedCrisis } = require('./advancedCrisisDetection');
const AutoAlertSystem = require('./autoAlertSystem');
const EmergencyContactSystem = require('./emergencyContactSystem');
const UrgentResponseWorkflow = require('./urgentResponseWorkflow');
const CrisisDashboardService = require('./crisisDashboardService');
const CrisisLoggingService = require('./crisisLoggingService');

class CrisisManagementSystem {
  constructor(io) {
    this.io = io;
    this.autoAlertSystem = new AutoAlertSystem(io);
    this.emergencyContactSystem = new EmergencyContactSystem();
    this.urgentResponseWorkflow = new UrgentResponseWorkflow(io);
    this.dashboardService = new CrisisDashboardService(io);
    this.loggingService = new CrisisLoggingService();
    
    this.isInitialized = false;
    this.processingQueue = [];
    this.systemMetrics = {
      alertsProcessed: 0,
      responseTime: [],
      systemUptime: new Date()
    };
    
    this.initialize();
  }
  
  /**
   * Initialize the crisis management system
   */
  async initialize() {
    try {
      console.log('Initializing Crisis Management System...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize system monitoring
      this.startSystemMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Crisis Management System initialized successfully');
      
      // Log system startup
      await this.loggingService.logCrisisEvent('system_startup', {
        timestamp: new Date(),
        components: ['detection', 'alerts', 'emergency', 'workflow', 'dashboard', 'logging'],
        status: 'operational'
      });
      
    } catch (error) {
      console.error('❌ Error initializing Crisis Management System:', error);
      throw error;
    }
  }
  
  /**
   * Main crisis processing function
   */
  async processCrisisMessage(messageData, userProfile, sessionData = {}) {
    const startTime = Date.now();
    const processId = `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`🚨 Processing crisis message: ${processId}`);
      
      // Step 1: Advanced Crisis Detection
      const crisisAnalysis = analyzeAdvancedCrisis(messageData.content, userProfile.history);
      
      await this.loggingService.logCrisisEvent('crisis_analysis_completed', {
        processId,
        messageId: messageData._id,
        userId: userProfile._id,
        analysis: crisisAnalysis
      });
      
      // Step 2: Check if immediate response is required
      if (!crisisAnalysis.requiresImmediate) {
        console.log(`ℹ️  No immediate crisis detected: ${processId}`);
        return {
          processId,
          requiresResponse: false,
          analysis: crisisAnalysis,
          responseTime: Date.now() - startTime
        };
      }
      
      console.log(`🔥 Crisis detected - Level: ${crisisAnalysis.riskLevel}: ${processId}`);
      
      // Step 3: Trigger Auto-Alert System
      const alertResult = await this.autoAlertSystem.processCrisisAlert(messageData, userProfile);
      
      if (alertResult.alertTriggered) {
        // Step 4: Determine Emergency Response
        const emergencyResponse = await this.emergencyContactSystem.determineEmergencyResponse(
          alertResult.crisisAlert,
          crisisAnalysis
        );
        
        // Step 5: Initiate Urgent Response Workflow
        const workflowResult = await this.urgentResponseWorkflow.initiateUrgentResponse(
          alertResult.crisisAlert,
          crisisAnalysis,
          userProfile
        );
        
        // Step 6: Execute Emergency Response if required
        let emergencyResult = null;
        if (emergencyResponse.level === 'critical') {
          emergencyResult = await this.emergencyContactSystem.executeEmergencyResponse(
            alertResult.crisisAlert,
            emergencyResponse
          );
        }
        
        // Step 7: Update Dashboard
        this.dashboardService.broadcastCrisisAlert(alertResult.crisisAlert, crisisAnalysis);
        
        // Step 8: Comprehensive Logging
        await this.loggingService.logCrisisEvent('crisis_response_completed', {
          processId,
          crisisAlert: alertResult.crisisAlert._id,
          workflowId: workflowResult.workflowId,
          emergencyResponse: emergencyResponse.level,
          responseTime: Date.now() - startTime,
          outcome: 'response_initiated'
        });
        
        // Step 9: Update System Metrics
        this.updateSystemMetrics(Date.now() - startTime);
        
        const response = {
          processId,
          requiresResponse: true,
          crisisLevel: crisisAnalysis.riskLevel,
          alert: {
            id: alertResult.crisisAlert._id,
            severity: alertResult.crisisAlert.severity,
            priority: alertResult.priority.level
          },
          workflow: {
            id: workflowResult.workflowId,
            protocol: workflowResult.protocol,
            estimatedDuration: workflowResult.estimatedDuration
          },
          emergency: {
            level: emergencyResponse.level,
            protocols: emergencyResponse.protocols.length,
            contacts: emergencyResponse.contacts.length,
            executed: !!emergencyResult
          },
          counselor: {
            notified: alertResult.notifications.length,
            assigned: alertResult.notifications[0]?.counselorId || null
          },
          responseTime: Date.now() - startTime,
          resources: this.getEmergencyResources(userProfile.location)
        };
        
        console.log(`✅ Crisis response completed: ${processId} (${Date.now() - startTime}ms)`);
        return response;
        
      } else {
        // No counselors available or other alert failure
        console.log(`⚠️  Alert system failed: ${processId}`);
        
        // Emergency fallback
        await this.triggerEmergencyFallback(crisisAnalysis, userProfile, messageData);
        
        return {
          processId,
          requiresResponse: true,
          fallbackTriggered: true,
          crisisLevel: crisisAnalysis.riskLevel,
          responseTime: Date.now() - startTime
        };
      }
      
    } catch (error) {
      console.error(`❌ Error processing crisis message ${processId}:`, error);
      
      // Log error
      await this.loggingService.logCrisisEvent('crisis_processing_error', {
        processId,
        error: error.message,
        stack: error.stack,
        messageId: messageData._id,
        userId: userProfile._id
      });
      
      // Emergency fallback for system errors
      await this.triggerSystemErrorFallback(userProfile, error);
      
      throw error;
    }
  }
  
  /**
   * Setup event listeners for system coordination
   */
  setupEventListeners() {
    // Listen for counselor responses
    this.io.on('connection', (socket) => {
      
      // Counselor accepts crisis alert
      socket.on('counselor_crisis_response', async (data) => {
        try {
          await this.autoAlertSystem.handleCounselorResponse(
            data.alertId,
            data.counselorId,
            data.response
          );
          
          await this.loggingService.logCrisisEvent('counselor_response', {
            alertId: data.alertId,
            counselorId: data.counselorId,
            response: data.response.action,
            timestamp: new Date()
          });
          
        } catch (error) {
          console.error('Error handling counselor response:', error);
        }
      });
      
      // Dashboard client connection
      socket.on('dashboard_connect', (data) => {
        this.dashboardService.registerDashboardClient(
          socket.id,
          data.userId,
          data.role
        );
      });
      
      // Dashboard client disconnection
      socket.on('disconnect', () => {
        this.dashboardService.unregisterDashboardClient(socket.id);
      });
      
      // Counselor availability updates
      socket.on('counselor_availability_update', (data) => {
        this.autoAlertSystem.updateCounselorAvailability(
          data.counselorId,
          data.availability
        );
      });
      
      // Emergency override (admin only)
      socket.on('emergency_override', async (data) => {
        if (data.userRole === 'admin') {
          await this.handleEmergencyOverride(data);
        }
      });
    });
  }
  
  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    setInterval(async () => {
      try {
        // Get system status
        const systemStatus = this.getSystemStatus();
        
        // Broadcast to dashboard
        this.io.to('admin_room').emit('system_status_update', systemStatus);
        
        // Log system metrics
        if (systemStatus.systemLoad > 80) {
          await this.loggingService.logCrisisEvent('high_system_load', {
            systemLoad: systemStatus.systemLoad,
            activeAlerts: systemStatus.activeAlerts,
            availableCounselors: systemStatus.availableCounselors
          });
        }
        
      } catch (error) {
        console.error('Error in system monitoring:', error);
      }
    }, 60000); // Every minute
  }
  
  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    const autoAlertStatus = this.autoAlertSystem.getSystemStatus();
    
    return {
      timestamp: new Date(),
      isOperational: this.isInitialized,
      uptime: Date.now() - this.systemMetrics.systemUptime.getTime(),
      components: {
        detection: { status: 'operational' },
        alerts: { 
          status: 'operational',
          ...autoAlertStatus
        },
        emergency: { status: 'operational' },
        workflow: { status: 'operational' },
        dashboard: { 
          status: 'operational',
          connectedClients: this.dashboardService.dashboardClients?.size || 0
        },
        logging: { status: 'operational' }
      },
      metrics: {
        alertsProcessed: this.systemMetrics.alertsProcessed,
        averageResponseTime: this.getAverageResponseTime(),
        systemLoad: this.calculateSystemLoad()
      },
      queue: {
        processing: this.processingQueue.length,
        pending: 0
      }
    };
  }
  
  /**
   * Get emergency resources for user location
   */
  getEmergencyResources(userLocation) {
    return this.emergencyContactSystem.getEmergencyResources(userLocation);
  }
  
  /**
   * Trigger emergency fallback when normal systems fail
   */
  async triggerEmergencyFallback(crisisAnalysis, userProfile, messageData) {
    try {
      console.log('🚨 Triggering emergency fallback');
      
      // Direct emergency contact
      if (crisisAnalysis.riskLevel === 'critical') {
        const emergencyResponse = await this.emergencyContactSystem.determineEmergencyResponse(
          { user: userProfile._id, severity: crisisAnalysis.riskLevel },
          crisisAnalysis
        );
        
        await this.emergencyContactSystem.executeEmergencyResponse(
          { user: userProfile._id, severity: crisisAnalysis.riskLevel },
          emergencyResponse
        );
      }
      
      // Notify all available admins
      this.io.to('admin_room').emit('emergency_fallback_triggered', {
        userId: userProfile._id,
        crisisLevel: crisisAnalysis.riskLevel,
        reason: 'system_failure',
        timestamp: new Date()
      });
      
      // Send crisis resources to user
      this.io.to(`user_${userProfile._id}`).emit('emergency_resources', {
        message: 'We are experiencing technical difficulties. Please use these emergency resources:',
        resources: this.getEmergencyResources(userProfile.location),
        timestamp: new Date()
      });
      
      await this.loggingService.logCrisisEvent('emergency_fallback_triggered', {
        userId: userProfile._id,
        crisisLevel: crisisAnalysis.riskLevel,
        reason: 'no_counselors_available',
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error in emergency fallback:', error);
    }
  }
  
  /**
   * Handle system error fallback
   */
  async triggerSystemErrorFallback(userProfile, error) {
    try {
      // Send emergency resources to user
      this.io.to(`user_${userProfile._id}`).emit('system_error_fallback', {
        message: 'We are experiencing technical difficulties. Please contact emergency services immediately if you are in danger.',
        emergencyNumbers: {
          'Emergency Services': '911',
          'Suicide Prevention Lifeline': '988',
          'Crisis Text Line': 'Text HOME to 741741'
        },
        timestamp: new Date()
      });
      
      // Alert all admins
      this.io.to('admin_room').emit('system_error_alert', {
        userId: userProfile._id,
        error: error.message,
        timestamp: new Date(),
        severity: 'critical'
      });
      
    } catch (fallbackError) {
      console.error('Error in system error fallback:', fallbackError);
    }
  }
  
  /**
   * Update system metrics
   */
  updateSystemMetrics(responseTime) {
    this.systemMetrics.alertsProcessed++;
    this.systemMetrics.responseTime.push(responseTime);
    
    // Keep only last 100 response times for memory efficiency
    if (this.systemMetrics.responseTime.length > 100) {
      this.systemMetrics.responseTime.shift();
    }
  }
  
  /**
   * Get average response time
   */
  getAverageResponseTime() {
    if (this.systemMetrics.responseTime.length === 0) return 0;
    
    const sum = this.systemMetrics.responseTime.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.systemMetrics.responseTime.length);
  }
  
  /**
   * Calculate system load
   */
  calculateSystemLoad() {
    const queueLoad = (this.processingQueue.length / 10) * 100; // Max 10 items in queue
    const memoryUsage = process.memoryUsage();
    const memoryLoad = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    return Math.min(Math.max(queueLoad, memoryLoad), 100);
  }
  
  /**
   * Generate system health report
   */
  async generateSystemHealthReport() {
    try {
      const status = this.getSystemStatus();
      const crisisStats = await this.loggingService.getRealTimeCrisisStats();
      
      const healthReport = {
        reportId: `health_${Date.now()}`,
        generatedAt: new Date(),
        systemStatus: status,
        crisisStatistics: crisisStats,
        performance: {
          averageResponseTime: this.getAverageResponseTime(),
          systemLoad: this.calculateSystemLoad(),
          uptime: status.uptime,
          alertsProcessed: this.systemMetrics.alertsProcessed
        },
        recommendations: this.generateHealthRecommendations(status, crisisStats)
      };
      
      return healthReport;
      
    } catch (error) {
      console.error('Error generating system health report:', error);
      throw error;
    }
  }
  
  /**
   * Generate health recommendations
   */
  generateHealthRecommendations(status, crisisStats) {
    const recommendations = [];
    
    if (status.metrics.systemLoad > 80) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'System load is high. Consider scaling resources.'
      });
    }
    
    if (status.components.alerts.availableCounselors < 3) {
      recommendations.push({
        type: 'staffing',
        priority: 'medium',
        message: 'Low counselor availability. Consider adding more staff.'
      });
    }
    
    if (status.metrics.averageResponseTime > 300000) { // 5 minutes
      recommendations.push({
        type: 'response_time',
        priority: 'high',
        message: 'Response times are high. Investigate bottlenecks.'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Shutdown crisis management system
   */
  async shutdown() {
    try {
      console.log('Shutting down Crisis Management System...');
      
      // Log system shutdown
      await this.loggingService.logCrisisEvent('system_shutdown', {
        timestamp: new Date(),
        uptime: Date.now() - this.systemMetrics.systemUptime.getTime(),
        alertsProcessed: this.systemMetrics.alertsProcessed
      });
      
      // Clean up dashboard
      this.dashboardService.cleanup();
      
      console.log('✅ Crisis Management System shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

module.exports = CrisisManagementSystem;