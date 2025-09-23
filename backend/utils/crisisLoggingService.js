/**
 * Crisis Logging and Reporting System
 * Comprehensive crisis session logging, reporting, and compliance tracking
 */

const { CrisisAlert, Session, User, Message, CrisisReport } = require('../models');
const fs = require('fs').promises;
const path = require('path');

class CrisisLoggingService {
  constructor() {
    this.logDirectory = path.join(process.cwd(), 'logs', 'crisis');
    this.reportsDirectory = path.join(process.cwd(), 'reports', 'crisis');
    this.complianceDirectory = path.join(process.cwd(), 'compliance', 'crisis');
    
    this.initializeLogging();
  }
  
  /**
   * Initialize logging directories and configuration
   */
  async initializeLogging() {
    try {
      // Create directories if they don't exist
      await this.ensureDirectoryExists(this.logDirectory);
      await this.ensureDirectoryExists(this.reportsDirectory);
      await this.ensureDirectoryExists(this.complianceDirectory);
      
      console.log('Crisis logging service initialized');
    } catch (error) {
      console.error('Error initializing crisis logging:', error);
    }
  }
  
  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
  
  /**
   * Log crisis event
   */
  async logCrisisEvent(eventType, eventData, metadata = {}) {
    try {
      const logEntry = {
        timestamp: new Date(),
        eventType,
        eventId: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: this.sanitizeLogData(eventData),
        metadata: {
          ...metadata,
          source: 'crisis_logging_service',
          version: '1.0.0'
        },
        severity: this.determinLogSeverity(eventType, eventData),
        compliance: {
          dataClassification: this.classifyData(eventData),
          retentionPolicy: this.getRetentionPolicy(eventType),
          encryptionRequired: this.requiresEncryption(eventData)
        }
      };
      
      // Write to log file
      await this.writeLogEntry(logEntry);
      
      // Save to database
      await this.saveLogToDatabase(logEntry);
      
      // Check for compliance requirements
      await this.handleComplianceLogging(logEntry);
      
      return logEntry.eventId;
      
    } catch (error) {
      console.error('Error logging crisis event:', error);
      throw error;
    }
  }
  
  /**
   * Sanitize log data to remove sensitive information
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'password', 'ssn', 'creditCard', 'personalDetails',
      'fullName', 'address', 'phone', 'email'
    ];
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sanitizeObject = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitizeObject(value);
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }
  
  /**
   * Determine log severity
   */
  determinLogSeverity(eventType, eventData) {
    const criticalEvents = [
      'suicide_attempt', 'violence_threat', 'emergency_services_contacted',
      'crisis_escalation', 'safety_breach'
    ];
    
    const highEvents = [
      'crisis_alert_triggered', 'counselor_assigned', 'safety_plan_activated',
      'emergency_contact_notified'
    ];
    
    if (criticalEvents.includes(eventType)) return 'critical';
    if (highEvents.includes(eventType)) return 'high';
    if (eventData?.riskLevel === 'critical') return 'critical';
    if (eventData?.riskLevel === 'high') return 'high';
    
    return 'medium';
  }
  
  /**
   * Classify data for compliance
   */
  classifyData(data) {
    if (!data) return 'public';
    
    // Check for personal health information
    const phiIndicators = ['medical', 'diagnosis', 'treatment', 'medication', 'therapy'];
    const dataString = JSON.stringify(data).toLowerCase();
    
    if (phiIndicators.some(indicator => dataString.includes(indicator))) {
      return 'phi'; // Protected Health Information
    }
    
    // Check for personal identifiable information
    if (data.userId || data.user || data.personalInfo) {
      return 'pii'; // Personal Identifiable Information
    }
    
    // Crisis data is always sensitive
    if (data.crisisLevel || data.severity || data.riskFactors) {
      return 'sensitive';
    }
    
    return 'internal';
  }
  
  /**
   * Get retention policy based on event type
   */
  getRetentionPolicy(eventType) {
    const retentionPolicies = {
      crisis_alert_triggered: '7_years',
      suicide_attempt: '10_years',
      violence_threat: '10_years',
      emergency_services_contacted: '10_years',
      counselor_assigned: '3_years',
      session_completed: '3_years',
      safety_plan_created: '5_years',
      compliance_audit: '7_years'
    };
    
    return retentionPolicies[eventType] || '3_years';
  }
  
  /**
   * Check if encryption is required
   */
  requiresEncryption(data) {
    const classification = this.classifyData(data);
    return ['phi', 'pii', 'sensitive'].includes(classification);
  }
  
  /**
   * Write log entry to file
   */
  async writeLogEntry(logEntry) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFileName = `crisis_log_${date}.jsonl`;
      const logFilePath = path.join(this.logDirectory, logFileName);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(logFilePath, logLine, 'utf8');
      
    } catch (error) {
      console.error('Error writing log entry to file:', error);
      throw error;
    }
  }
  
  /**
   * Save log to database
   */
  async saveLogToDatabase(logEntry) {
    try {
      // Create a database model for crisis logs if it doesn't exist
      const CrisisLog = require('../models/CrisisLog');
      
      const dbLogEntry = new CrisisLog({
        eventId: logEntry.eventId,
        eventType: logEntry.eventType,
        timestamp: logEntry.timestamp,
        severity: logEntry.severity,
        data: logEntry.data,
        metadata: logEntry.metadata,
        compliance: logEntry.compliance
      });
      
      await dbLogEntry.save();
      
    } catch (error) {
      console.error('Error saving log to database:', error);
      // Don't throw error to prevent logging failures from affecting main operations
    }
  }
  
  /**
   * Handle compliance-specific logging
   */
  async handleComplianceLogging(logEntry) {
    try {
      if (logEntry.compliance.dataClassification === 'phi' ||
          logEntry.severity === 'critical') {
        
        await this.createComplianceRecord(logEntry);
      }
      
    } catch (error) {
      console.error('Error handling compliance logging:', error);
    }
  }
  
  /**
   * Create compliance record
   */
  async createComplianceRecord(logEntry) {
    try {
      const complianceRecord = {
        recordId: `compliance_${logEntry.eventId}`,
        timestamp: logEntry.timestamp,
        eventType: logEntry.eventType,
        dataClassification: logEntry.compliance.dataClassification,
        retentionPolicy: logEntry.compliance.retentionPolicy,
        accessLog: [{
          action: 'created',
          timestamp: new Date(),
          user: 'system',
          reason: 'automatic_compliance_logging'
        }],
        auditTrail: {
          created: new Date(),
          createdBy: 'crisis_logging_service',
          lastModified: new Date(),
          modifiedBy: 'crisis_logging_service'
        }
      };
      
      const date = new Date().toISOString().split('T')[0];
      const complianceFileName = `compliance_${date}.jsonl`;
      const complianceFilePath = path.join(this.complianceDirectory, complianceFileName);
      
      const complianceLine = JSON.stringify(complianceRecord) + '\n';
      await fs.appendFile(complianceFilePath, complianceLine, 'utf8');
      
    } catch (error) {
      console.error('Error creating compliance record:', error);
    }
  }
  
  /**
   * Generate crisis session report
   */
  async generateSessionReport(sessionId, includePersonalInfo = false) {
    try {
      const session = await Session.findById(sessionId)
        .populate('user', includePersonalInfo ? 'name email age' : '_id createdAt')
        .populate('helper', 'name role specializations')
        .populate('crisisAlert');
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Get session messages
      const messages = await Message.find({ session: sessionId })
        .sort({ createdAt: 1 });
      
      // Get crisis events for this session
      const crisisEvents = await this.getCrisisEventsBySession(sessionId);
      
      const report = {
        reportId: `session_report_${sessionId}_${Date.now()}`,
        generatedAt: new Date(),
        session: {
          id: session._id,
          type: session.type,
          status: session.status,
          crisisLevel: session.crisisLevel,
          startTime: session.createdAt,
          endTime: session.endedAt,
          duration: session.duration,
          outcome: session.outcome
        },
        participants: {
          user: includePersonalInfo ? session.user : { id: session.user._id },
          helper: session.helper
        },
        crisisAnalysis: session.crisisAlert ? {
          severity: session.crisisAlert.severity,
          confidence: session.crisisAlert.confidence,
          categories: session.crisisAlert.categories,
          riskFactors: session.crisisAlert.riskFactors,
          interventions: session.crisisAlert.interventions || []
        } : null,
        timeline: this.buildSessionTimeline(session, messages, crisisEvents),
        interventions: this.extractInterventions(session, crisisEvents),
        outcome: this.analyzeSessionOutcome(session, crisisEvents),
        followUp: session.followUpPlanned || null,
        complianceNotes: {
          dataClassification: this.classifyData(session),
          retentionPolicy: this.getRetentionPolicy('session_completed'),
          reportClassification: includePersonalInfo ? 'restricted' : 'internal'
        }
      };
      
      // Save report
      await this.saveReport(report, 'session');
      
      return report;
      
    } catch (error) {
      console.error('Error generating session report:', error);
      throw error;
    }
  }
  
  /**
   * Get crisis events by session
   */
  async getCrisisEventsBySession(sessionId) {
    try {
      const logFiles = await fs.readdir(this.logDirectory);
      const events = [];
      
      for (const file of logFiles) {
        if (file.endsWith('.jsonl')) {
          const filePath = path.join(this.logDirectory, file);
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const logEntry = JSON.parse(line);
              if (logEntry.data?.sessionId === sessionId ||
                  logEntry.data?.session === sessionId) {
                events.push(logEntry);
              }
            } catch (parseError) {
              // Skip invalid log entries
              continue;
            }
          }
        }
      }
      
      return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
    } catch (error) {
      console.error('Error getting crisis events by session:', error);
      return [];
    }
  }
  
  /**
   * Build session timeline
   */
  buildSessionTimeline(session, messages, crisisEvents) {
    const timeline = [];
    
    // Add session events
    timeline.push({
      timestamp: session.createdAt,
      type: 'session_started',
      description: `${session.type} session started`,
      source: 'session'
    });
    
    if (session.endedAt) {
      timeline.push({
        timestamp: session.endedAt,
        type: 'session_ended',
        description: `Session ended - ${session.outcome || 'completed'}`,
        source: 'session'
      });
    }
    
    // Add crisis events
    crisisEvents.forEach(event => {
      timeline.push({
        timestamp: new Date(event.timestamp),
        type: event.eventType,
        description: this.getEventDescription(event),
        severity: event.severity,
        source: 'crisis_log'
      });
    });
    
    // Add message events (summarized)
    const messageGroups = this.groupMessagesByTime(messages);
    messageGroups.forEach(group => {
      timeline.push({
        timestamp: group.startTime,
        type: 'message_exchange',
        description: `${group.messageCount} messages exchanged`,
        details: {
          messageCount: group.messageCount,
          duration: group.duration,
          averageLength: group.averageLength
        },
        source: 'messages'
      });
    });
    
    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * Extract interventions from session data
   */
  extractInterventions(session, crisisEvents) {
    const interventions = [];
    
    // Extract interventions from crisis events
    crisisEvents.forEach(event => {
      if (event.eventType.includes('intervention') ||
          event.eventType.includes('safety') ||
          event.eventType.includes('emergency')) {
        
        interventions.push({
          timestamp: new Date(event.timestamp),
          type: event.eventType,
          description: this.getEventDescription(event),
          effectiveness: this.assessInterventionEffectiveness(event, crisisEvents),
          outcome: event.data?.outcome || 'unknown'
        });
      }
    });
    
    return interventions;
  }
  
  /**
   * Analyze session outcome
   */
  analyzeSessionOutcome(session, crisisEvents) {
    const outcome = {
      status: session.outcome || 'completed',
      crisisResolved: false,
      interventionsUsed: crisisEvents.filter(e => e.eventType.includes('intervention')).length,
      escalationsRequired: crisisEvents.filter(e => e.eventType.includes('escalation')).length,
      safetyMeasuresImplemented: crisisEvents.filter(e => e.eventType.includes('safety')).length,
      followUpRequired: session.followUpPlanned || false,
      riskLevel: {
        initial: session.crisisAlert?.severity || 'unknown',
        final: this.determineFinalRiskLevel(crisisEvents)
      }
    };
    
    // Determine if crisis was resolved
    const lastCrisisEvent = crisisEvents
      .filter(e => e.eventType.includes('crisis'))
      .slice(-1)[0];
    
    if (lastCrisisEvent && lastCrisisEvent.data?.status === 'resolved') {
      outcome.crisisResolved = true;
    }
    
    return outcome;
  }
  
  /**
   * Generate compliance audit report
   */
  async generateComplianceAuditReport(startDate, endDate) {
    try {
      const report = {
        reportId: `compliance_audit_${Date.now()}`,
        generatedAt: new Date(),
        period: { startDate, endDate },
        summary: {
          totalCrisisEvents: 0,
          phiEvents: 0,
          criticalEvents: 0,
          complianceViolations: [],
          dataRetentionStatus: {},
          accessAudit: {}
        },
        details: {
          eventsByType: {},
          severityDistribution: {},
          retentionCompliance: {},
          accessPatterns: {}
        },
        recommendations: []
      };
      
      // Get all crisis logs in the period
      const logs = await this.getCrisisLogsByDateRange(startDate, endDate);
      
      report.summary.totalCrisisEvents = logs.length;
      
      // Analyze logs
      logs.forEach(log => {
        // Count PHI events
        if (log.compliance?.dataClassification === 'phi') {
          report.summary.phiEvents++;
        }
        
        // Count critical events
        if (log.severity === 'critical') {
          report.summary.criticalEvents++;
        }
        
        // Group by event type
        report.details.eventsByType[log.eventType] = 
          (report.details.eventsByType[log.eventType] || 0) + 1;
        
        // Group by severity
        report.details.severityDistribution[log.severity] = 
          (report.details.severityDistribution[log.severity] || 0) + 1;
      });
      
      // Check compliance
      await this.checkComplianceViolations(report, logs);
      
      // Generate recommendations
      report.recommendations = this.generateComplianceRecommendations(report);
      
      // Save compliance report
      await this.saveReport(report, 'compliance_audit');
      
      return report;
      
    } catch (error) {
      console.error('Error generating compliance audit report:', error);
      throw error;
    }
  }
  
  /**
   * Get crisis logs by date range
   */
  async getCrisisLogsByDateRange(startDate, endDate) {
    try {
      const logs = [];
      const logFiles = await fs.readdir(this.logDirectory);
      
      for (const file of logFiles) {
        if (file.endsWith('.jsonl')) {
          const filePath = path.join(this.logDirectory, file);
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const logEntry = JSON.parse(line);
              const logDate = new Date(logEntry.timestamp);
              
              if (logDate >= startDate && logDate <= endDate) {
                logs.push(logEntry);
              }
            } catch (parseError) {
              continue;
            }
          }
        }
      }
      
      return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
    } catch (error) {
      console.error('Error getting crisis logs by date range:', error);
      return [];
    }
  }
  
  /**
   * Save report to file system
   */
  async saveReport(report, reportType) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const reportFileName = `${reportType}_${report.reportId}_${date}.json`;
      const reportFilePath = path.join(this.reportsDirectory, reportFileName);
      
      await fs.writeFile(reportFilePath, JSON.stringify(report, null, 2), 'utf8');
      
      console.log(`Report saved: ${reportFileName}`);
      
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }
  
  /**
   * Get real-time crisis statistics
   */
  async getRealTimeCrisisStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      
      const stats = {
        last24Hours: {
          totalEvents: 0,
          criticalEvents: 0,
          interventions: 0,
          escalations: 0,
          resolutions: 0
        },
        currentStatus: {
          activeAlerts: 0,
          activeSessions: 0,
          availableCounselors: 0,
          systemLoad: 0
        },
        trends: {
          eventFrequency: 'stable',
          severityTrend: 'stable',
          responseTime: 'normal'
        }
      };
      
      // Get recent logs
      const recentLogs = await this.getCrisisLogsByDateRange(oneDayAgo, now);
      
      stats.last24Hours.totalEvents = recentLogs.length;
      
      recentLogs.forEach(log => {
        if (log.severity === 'critical') {
          stats.last24Hours.criticalEvents++;
        }
        
        if (log.eventType.includes('intervention')) {
          stats.last24Hours.interventions++;
        }
        
        if (log.eventType.includes('escalation')) {
          stats.last24Hours.escalations++;
        }
        
        if (log.eventType.includes('resolution')) {
          stats.last24Hours.resolutions++;
        }
      });
      
      // Get current system status
      stats.currentStatus.activeAlerts = await CrisisAlert.countDocuments({ status: 'active' });
      stats.currentStatus.activeSessions = await Session.countDocuments({ 
        status: 'active', 
        endedAt: null 
      });
      
      return stats;
      
    } catch (error) {
      console.error('Error getting real-time crisis stats:', error);
      throw error;
    }
  }
  
  /**
   * Archive old logs based on retention policy
   */
  async archiveOldLogs() {
    try {
      const archiveDate = new Date();
      archiveDate.setFullYear(archiveDate.getFullYear() - 1); // Archive logs older than 1 year
      
      const logFiles = await fs.readdir(this.logDirectory);
      let archivedFiles = 0;
      
      for (const file of logFiles) {
        if (file.endsWith('.jsonl')) {
          const filePath = path.join(this.logDirectory, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < archiveDate) {
            // Move to archive directory
            const archiveDir = path.join(this.logDirectory, 'archive');
            await this.ensureDirectoryExists(archiveDir);
            
            const archivePath = path.join(archiveDir, file);
            await fs.rename(filePath, archivePath);
            archivedFiles++;
          }
        }
      }
      
      console.log(`Archived ${archivedFiles} old log files`);
      
    } catch (error) {
      console.error('Error archiving old logs:', error);
    }
  }
}

module.exports = CrisisLoggingService;