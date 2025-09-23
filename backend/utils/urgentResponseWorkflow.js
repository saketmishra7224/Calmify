/**
 * Urgent Response Workflow System
 * Immediate crisis response protocols with safety checks and escalation
 */

const { User, Session, CrisisAlert, SafetyPlan } = require('../models');
const AutoAlertSystem = require('./autoAlertSystem');
const EmergencyContactSystem = require('./emergencyContactSystem');
const { analyzeAdvancedCrisis } = require('./advancedCrisisDetection');

class UrgentResponseWorkflow {
  constructor(io) {
    this.io = io;
    this.autoAlertSystem = new AutoAlertSystem(io);
    this.emergencyContactSystem = new EmergencyContactSystem();
    this.activeWorkflows = new Map();
    this.safetyProtocols = this.initializeSafetyProtocols();
  }
  
  /**
   * Initialize safety protocols
   */
  initializeSafetyProtocols() {
    return {
      immediate_safety: {
        priority: 1,
        timeframe: '0-5 minutes',
        actions: [
          'assess_immediate_danger',
          'implement_safety_measures',
          'contact_emergency_services',
          'continuous_monitoring'
        ],
        triggers: ['imminent_self_harm', 'suicide_attempt', 'violence_threat'],
        escalation: 'emergency_services'
      },
      crisis_intervention: {
        priority: 2,
        timeframe: '5-15 minutes',
        actions: [
          'counselor_intervention',
          'safety_planning',
          'risk_assessment',
          'support_mobilization'
        ],
        triggers: ['high_suicide_risk', 'severe_crisis', 'escalating_situation'],
        escalation: 'crisis_team'
      },
      stabilization: {
        priority: 3,
        timeframe: '15-30 minutes',
        actions: [
          'emotional_stabilization',
          'coping_strategy_deployment',
          'support_network_activation',
          'follow_up_planning'
        ],
        triggers: ['moderate_crisis', 'emotional_overwhelm', 'support_needed'],
        escalation: 'clinical_team'
      },
      monitoring: {
        priority: 4,
        timeframe: '30+ minutes',
        actions: [
          'regular_check_ins',
          'progress_monitoring',
          'resource_provision',
          'long_term_planning'
        ],
        triggers: ['low_risk', 'stable_but_concerning', 'ongoing_support'],
        escalation: 'regular_care'
      }
    };
  }
  
  /**
   * Initialize urgent response workflow
   */
  async initiateUrgentResponse(crisisAlert, crisisAnalysis, userProfile) {
    try {
      const workflowId = `workflow_${crisisAlert._id}_${Date.now()}`;
      
      // Create workflow instance
      const workflow = {
        id: workflowId,
        crisisAlert,
        crisisAnalysis,
        userProfile,
        status: 'active',
        startTime: new Date(),
        currentPhase: 'assessment',
        completedActions: [],
        escalationLevel: 0,
        safetyMeasures: [],
        assignedTeam: [],
        timeline: []
      };
      
      this.activeWorkflows.set(workflowId, workflow);
      
      // Determine appropriate protocol
      const protocol = this.selectSafetyProtocol(crisisAnalysis);
      workflow.protocol = protocol;
      
      // Start immediate assessment
      await this.performImmediateAssessment(workflow);
      
      // Execute protocol actions
      await this.executeProtocolActions(workflow);
      
      // Set up monitoring and escalation
      this.setupWorkflowMonitoring(workflow);
      
      return {
        workflowId,
        protocol: protocol.name,
        status: 'initiated',
        timeline: workflow.timeline,
        estimatedDuration: protocol.timeframe
      };
      
    } catch (error) {
      console.error('Error initiating urgent response workflow:', error);
      throw error;
    }
  }
  
  /**
   * Select appropriate safety protocol
   */
  selectSafetyProtocol(crisisAnalysis) {
    const { riskLevel, categoryScores, riskFactors } = crisisAnalysis;
    
    // Immediate safety protocol
    if (riskLevel === 'critical' ||
        riskFactors.suicideWithMethod ||
        riskFactors.violenceWithImmediacy ||
        categoryScores.violence?.score >= 15) {
      return {
        name: 'immediate_safety',
        ...this.safetyProtocols.immediate_safety
      };
    }
    
    // Crisis intervention protocol
    if (riskLevel === 'high' ||
        categoryScores.suicide?.score >= 10 ||
        riskFactors.suicideWithImmediacy) {
      return {
        name: 'crisis_intervention',
        ...this.safetyProtocols.crisis_intervention
      };
    }
    
    // Stabilization protocol
    if (riskLevel === 'medium' ||
        categoryScores.selfHarm?.score >= 8) {
      return {
        name: 'stabilization',
        ...this.safetyProtocols.stabilization
      };
    }
    
    // Monitoring protocol
    return {
      name: 'monitoring',
      ...this.safetyProtocols.monitoring
    };
  }
  
  /**
   * Perform immediate safety assessment
   */
  async performImmediateAssessment(workflow) {
    try {
      const assessment = {
        timestamp: new Date(),
        assessor: 'system',
        type: 'immediate_safety',
        findings: {},
        recommendations: [],
        safetyLevel: 'unknown'
      };
      
      // Assess immediate danger indicators
      const dangerIndicators = this.assessImmediateDanger(workflow.crisisAnalysis);
      assessment.findings.dangerIndicators = dangerIndicators;
      
      // Check user availability and responsiveness
      const userStatus = await this.checkUserStatus(workflow.userProfile._id);
      assessment.findings.userStatus = userStatus;
      
      // Assess environmental safety
      const environmentalFactors = await this.assessEnvironmentalSafety(workflow.userProfile);
      assessment.findings.environmentalFactors = environmentalFactors;
      
      // Determine overall safety level
      assessment.safetyLevel = this.determineSafetyLevel(assessment.findings);
      
      // Generate immediate recommendations
      assessment.recommendations = this.generateImmediateRecommendations(assessment);
      
      workflow.assessment = assessment;
      workflow.timeline.push({
        timestamp: new Date(),
        action: 'immediate_assessment_completed',
        details: assessment,
        phase: 'assessment'
      });
      
      console.log(`Immediate assessment completed for workflow ${workflow.id}: ${assessment.safetyLevel}`);
      
    } catch (error) {
      console.error('Error performing immediate assessment:', error);
      throw error;
    }
  }
  
  /**
   * Assess immediate danger indicators
   */
  assessImmediateDanger(crisisAnalysis) {
    const indicators = {
      imminent: [],
      high: [],
      moderate: [],
      score: 0
    };
    
    // Check for imminent danger keywords
    const imminentKeywords = ['right now', 'doing it now', 'have the gun', 'taking the pills'];
    crisisAnalysis.matchedKeywords.forEach(keyword => {
      if (imminentKeywords.includes(keyword.keyword)) {
        indicators.imminent.push(keyword.keyword);
        indicators.score += 25;
      }
    });
    
    // Check risk factor combinations
    if (crisisAnalysis.riskFactors.suicideWithMethod) {
      indicators.imminent.push('suicide_method_available');
      indicators.score += 30;
    }
    
    if (crisisAnalysis.riskFactors.violenceWithImmediacy) {
      indicators.imminent.push('violence_imminent');
      indicators.score += 30;
    }
    
    // High danger indicators
    if (crisisAnalysis.categoryScores.suicide?.score >= 10) {
      indicators.high.push('high_suicide_risk');
      indicators.score += 15;
    }
    
    if (crisisAnalysis.categoryScores.violence?.score >= 10) {
      indicators.high.push('high_violence_risk');
      indicators.score += 15;
    }
    
    return indicators;
  }
  
  /**
   * Check user status and responsiveness
   */
  async checkUserStatus(userId) {
    try {
      const user = await User.findById(userId);
      const now = new Date();
      
      const status = {
        isOnline: false,
        lastSeen: user.lastActivity,
        responseTime: null,
        location: user.location,
        emergencyContacts: user.emergencyContacts || [],
        currentSession: null
      };
      
      // Check if user is currently online
      const lastActivity = user.lastActivity || new Date(0);
      const timeSinceActivity = now - lastActivity;
      status.isOnline = timeSinceActivity < 5 * 60 * 1000; // 5 minutes
      
      // Check for active session
      const activeSession = await Session.findOne({
        user: userId,
        status: 'active',
        endedAt: null
      });
      
      if (activeSession) {
        status.currentSession = {
          id: activeSession._id,
          type: activeSession.type,
          helper: activeSession.helper,
          startTime: activeSession.createdAt
        };
      }
      
      return status;
      
    } catch (error) {
      console.error('Error checking user status:', error);
      return { isOnline: false, error: error.message };
    }
  }
  
  /**
   * Assess environmental safety factors
   */
  async assessEnvironmentalSafety(userProfile) {
    const factors = {
      livingArrangement: userProfile.livingArrangement || 'unknown',
      supportAvailability: 'unknown',
      medicalAccess: 'unknown',
      riskFactors: [],
      protectiveFactors: []
    };
    
    // Check living arrangement
    if (userProfile.livingArrangement === 'alone') {
      factors.riskFactors.push('living_alone');
    } else if (userProfile.livingArrangement === 'with_family') {
      factors.protectiveFactors.push('family_present');
    }
    
    // Check emergency contacts
    if (userProfile.emergencyContacts && userProfile.emergencyContacts.length > 0) {
      factors.protectiveFactors.push('emergency_contacts_available');
    } else {
      factors.riskFactors.push('no_emergency_contacts');
    }
    
    // Check medical history for risk factors
    if (userProfile.medicalHistory?.previousAttempts) {
      factors.riskFactors.push('previous_suicide_attempts');
    }
    
    if (userProfile.medicalHistory?.substanceAbuse) {
      factors.riskFactors.push('substance_abuse_history');
    }
    
    // Check for protective factors
    if (userProfile.treatmentHistory?.currentTherapy) {
      factors.protectiveFactors.push('active_therapy');
    }
    
    if (userProfile.socialSupport?.strongNetwork) {
      factors.protectiveFactors.push('strong_social_support');
    }
    
    return factors;
  }
  
  /**
   * Determine overall safety level
   */
  determineSafetyLevel(findings) {
    const dangerScore = findings.dangerIndicators?.score || 0;
    const riskFactors = findings.environmentalFactors?.riskFactors?.length || 0;
    const protectiveFactors = findings.environmentalFactors?.protectiveFactors?.length || 0;
    
    const totalScore = dangerScore + (riskFactors * 5) - (protectiveFactors * 3);
    
    if (totalScore >= 50 || findings.dangerIndicators?.imminent?.length > 0) {
      return 'critical';
    } else if (totalScore >= 30) {
      return 'high';
    } else if (totalScore >= 15) {
      return 'moderate';
    } else {
      return 'low';
    }
  }
  
  /**
   * Execute protocol actions based on selected protocol
   */
  async executeProtocolActions(workflow) {
    try {
      const { protocol } = workflow;
      
      for (const actionName of protocol.actions) {
        await this.executeAction(workflow, actionName);
        
        // Add delay between actions for non-critical cases
        if (workflow.assessment.safetyLevel !== 'critical') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
    } catch (error) {
      console.error('Error executing protocol actions:', error);
      throw error;
    }
  }
  
  /**
   * Execute specific workflow action
   */
  async executeAction(workflow, actionName) {
    try {
      let result;
      
      switch (actionName) {
        case 'assess_immediate_danger':
          result = await this.assessImmediateDangerAction(workflow);
          break;
          
        case 'implement_safety_measures':
          result = await this.implementSafetyMeasures(workflow);
          break;
          
        case 'contact_emergency_services':
          result = await this.contactEmergencyServices(workflow);
          break;
          
        case 'counselor_intervention':
          result = await this.initiateCounselorIntervention(workflow);
          break;
          
        case 'safety_planning':
          result = await this.initiateSafetyPlanning(workflow);
          break;
          
        case 'continuous_monitoring':
          result = await this.setupContinuousMonitoring(workflow);
          break;
          
        case 'emotional_stabilization':
          result = await this.provideEmotionalStabilization(workflow);
          break;
          
        case 'support_mobilization':
          result = await this.mobilizeSupport(workflow);
          break;
          
        case 'regular_check_ins':
          result = await this.scheduleRegularCheckIns(workflow);
          break;
          
        default:
          result = { success: false, message: 'Unknown action' };
      }
      
      // Record action completion
      workflow.completedActions.push({
        action: actionName,
        timestamp: new Date(),
        result,
        success: result.success
      });
      
      workflow.timeline.push({
        timestamp: new Date(),
        action: actionName,
        details: result,
        phase: workflow.currentPhase
      });
      
      console.log(`Action ${actionName} completed for workflow ${workflow.id}`);
      
      return result;
      
    } catch (error) {
      console.error(`Error executing action ${actionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Implement immediate safety measures
   */
  async implementSafetyMeasures(workflow) {
    try {
      const safetyMeasures = [];
      const { crisisAnalysis, userProfile } = workflow;
      
      // Remove means of self-harm if possible
      if (crisisAnalysis.categoryScores.suicide?.score > 0 ||
          crisisAnalysis.categoryScores.selfHarm?.score > 0) {
        
        safetyMeasures.push({
          measure: 'means_restriction',
          description: 'Advise removal of harmful objects',
          instructions: [
            'Remove or secure any weapons, medications, or sharp objects',
            'Ask trusted person to remove harmful items',
            'Contact emergency services if unable to secure environment'
          ],
          priority: 'immediate'
        });
      }
      
      // Activate support network
      if (userProfile.emergencyContacts?.length > 0) {
        safetyMeasures.push({
          measure: 'support_activation',
          description: 'Contact emergency support person',
          instructions: [
            'Call designated emergency contact',
            'Request immediate presence or phone support',
            'Provide crisis hotline numbers as backup'
          ],
          priority: 'immediate'
        });
        
        // Automatically notify emergency contacts for critical cases
        if (workflow.assessment.safetyLevel === 'critical') {
          await this.notifyEmergencyContacts(workflow);
        }
      }
      
      // Environmental safety
      safetyMeasures.push({
        measure: 'environment_safety',
        description: 'Ensure safe physical environment',
        instructions: [
          'Move to safe, comfortable location',
          'Ensure someone else is present if possible',
          'Keep communication devices accessible',
          'Have emergency numbers readily available'
        ],
        priority: 'high'
      });
      
      // Continuous communication
      safetyMeasures.push({
        measure: 'communication_maintenance',
        description: 'Maintain continuous communication',
        instructions: [
          'Stay connected with crisis counselor',
          'Keep phone charged and accessible',
          'Use crisis text line if voice communication difficult',
          'Do not isolate yourself'
        ],
        priority: 'high'
      });
      
      workflow.safetyMeasures = safetyMeasures;
      
      // Send safety measures to user
      this.io.to(`user_${userProfile._id}`).emit('safety_measures', {
        measures: safetyMeasures,
        urgency: workflow.assessment.safetyLevel,
        timestamp: new Date()
      });
      
      return {
        success: true,
        message: 'Safety measures implemented',
        measures: safetyMeasures.length,
        details: safetyMeasures
      };
      
    } catch (error) {
      console.error('Error implementing safety measures:', error);
      return {
        success: false,
        message: 'Failed to implement safety measures',
        error: error.message
      };
    }
  }
  
  /**
   * Contact emergency services
   */
  async contactEmergencyServices(workflow) {
    try {
      const emergencyResponse = await this.emergencyContactSystem.determineEmergencyResponse(
        workflow.crisisAlert,
        workflow.crisisAnalysis
      );
      
      const result = await this.emergencyContactSystem.executeEmergencyResponse(
        workflow.crisisAlert,
        emergencyResponse
      );
      
      // Notify user that emergency services have been contacted
      this.io.to(`user_${workflow.userProfile._id}`).emit('emergency_services_contacted', {
        message: 'Emergency services have been notified and are responding',
        estimatedArrival: '5-10 minutes',
        instructions: [
          'Stay on the line with crisis counselor',
          'Unlock your door if safe to do so',
          'Have identification ready',
          'Emergency responders are trained to help'
        ],
        timestamp: new Date()
      });
      
      return {
        success: true,
        message: 'Emergency services contacted successfully',
        response: emergencyResponse,
        actions: result
      };
      
    } catch (error) {
      console.error('Error contacting emergency services:', error);
      return {
        success: false,
        message: 'Failed to contact emergency services',
        error: error.message
      };
    }
  }
  
  /**
   * Initiate counselor intervention
   */
  async initiateCounselorIntervention(workflow) {
    try {
      // Use auto-alert system to assign counselor
      const alertResult = await this.autoAlertSystem.processCrisisAlert(
        { content: 'Crisis intervention required', _id: workflow.crisisAlert.message },
        workflow.userProfile
      );
      
      if (alertResult.alertTriggered) {
        workflow.assignedCounselor = alertResult.notifications[0]?.counselorId;
        
        // Send intervention protocol to counselor
        this.io.to(`counselor_${workflow.assignedCounselor}`).emit('crisis_intervention_protocol', {
          workflowId: workflow.id,
          crisisLevel: workflow.crisisAnalysis.riskLevel,
          safetyLevel: workflow.assessment.safetyLevel,
          interventionType: 'immediate',
          protocol: workflow.protocol,
          userInfo: {
            id: workflow.userProfile._id,
            riskFactors: workflow.crisisAnalysis.riskFactors,
            safetyMeasures: workflow.safetyMeasures
          },
          timestamp: new Date()
        });
        
        return {
          success: true,
          message: 'Counselor intervention initiated',
          counselorId: workflow.assignedCounselor,
          interventionType: 'immediate'
        };
      } else {
        throw new Error('No counselors available for intervention');
      }
      
    } catch (error) {
      console.error('Error initiating counselor intervention:', error);
      return {
        success: false,
        message: 'Failed to initiate counselor intervention',
        error: error.message
      };
    }
  }
  
  /**
   * Setup workflow monitoring
   */
  setupWorkflowMonitoring(workflow) {
    const monitoringInterval = setInterval(async () => {
      try {
        if (!this.activeWorkflows.has(workflow.id)) {
          clearInterval(monitoringInterval);
          return;
        }
        
        // Check workflow progress
        await this.checkWorkflowProgress(workflow);
        
        // Check for escalation needs
        await this.checkEscalationNeeds(workflow);
        
        // Update timeline
        workflow.timeline.push({
          timestamp: new Date(),
          action: 'monitoring_check',
          details: { status: workflow.status, phase: workflow.currentPhase },
          phase: 'monitoring'
        });
        
      } catch (error) {
        console.error('Error in workflow monitoring:', error);
      }
    }, 30000); // Check every 30 seconds
    
    // Clean up after workflow completion (2 hours max)
    setTimeout(() => {
      clearInterval(monitoringInterval);
      if (this.activeWorkflows.has(workflow.id)) {
        this.completeWorkflow(workflow.id, 'timeout');
      }
    }, 2 * 60 * 60 * 1000);
  }
  
  /**
   * Complete workflow
   */
  async completeWorkflow(workflowId, reason = 'completed') {
    try {
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) return;
      
      workflow.status = 'completed';
      workflow.endTime = new Date();
      workflow.completionReason = reason;
      
      // Generate completion report
      const report = this.generateWorkflowReport(workflow);
      
      // Save workflow to database
      await this.saveWorkflowRecord(workflow, report);
      
      // Clean up
      this.activeWorkflows.delete(workflowId);
      
      console.log(`Workflow ${workflowId} completed: ${reason}`);
      
      return report;
      
    } catch (error) {
      console.error('Error completing workflow:', error);
      throw error;
    }
  }
  
  /**
   * Generate workflow completion report
   */
  generateWorkflowReport(workflow) {
    const duration = workflow.endTime - workflow.startTime;
    
    return {
      workflowId: workflow.id,
      crisisAlertId: workflow.crisisAlert._id,
      userId: workflow.userProfile._id,
      protocol: workflow.protocol.name,
      duration: `${Math.round(duration / 60000)} minutes`,
      completedActions: workflow.completedActions.length,
      safetyLevel: workflow.assessment.safetyLevel,
      escalationLevel: workflow.escalationLevel,
      outcome: workflow.status,
      completionReason: workflow.completionReason,
      timeline: workflow.timeline,
      recommendations: this.generateFollowUpRecommendations(workflow)
    };
  }
  
  /**
   * Get active workflow status
   */
  getWorkflowStatus(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return { exists: false };
    }
    
    return {
      exists: true,
      id: workflow.id,
      status: workflow.status,
      phase: workflow.currentPhase,
      protocol: workflow.protocol.name,
      safetyLevel: workflow.assessment?.safetyLevel,
      completedActions: workflow.completedActions.length,
      totalActions: workflow.protocol.actions.length,
      timeline: workflow.timeline.slice(-5) // Last 5 events
    };
  }
}

module.exports = UrgentResponseWorkflow;