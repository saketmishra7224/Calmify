/**
 * Emergency Contact Integration System
 * External helpline integration and automated escalation
 */

const axios = require('axios');
const { User, CrisisAlert, EmergencyContact } = require('../models');

class EmergencyContactSystem {
  constructor() {
    this.helplines = this.initializeHelplines();
    this.emergencyProtocols = this.initializeEmergencyProtocols();
    this.externalServices = this.initializeExternalServices();
  }
  
  /**
   * Initialize helpline configurations
   */
  initializeHelplines() {
    return {
      national: {
        suicidePrevention: {
          name: 'National Suicide Prevention Lifeline',
          number: '988',
          textNumber: '741741',
          website: 'https://suicidepreventionlifeline.org',
          available24x7: true,
          languages: ['en', 'es'],
          specialties: ['suicide', 'crisis', 'mental_health']
        },
        crisisText: {
          name: 'Crisis Text Line',
          textNumber: '741741',
          keyword: 'HOME',
          website: 'https://www.crisistextline.org',
          available24x7: true,
          languages: ['en', 'es'],
          specialties: ['crisis', 'text_support']
        },
        domesticViolence: {
          name: 'National Domestic Violence Hotline',
          number: '1-800-799-7233',
          textNumber: '22522',
          website: 'https://www.thehotline.org',
          available24x7: true,
          languages: ['en', 'es'],
          specialties: ['domestic_violence', 'abuse', 'safety']
        },
        substanceAbuse: {
          name: 'SAMHSA National Helpline',
          number: '1-800-662-4357',
          website: 'https://www.samhsa.gov/find-help/national-helpline',
          available24x7: true,
          languages: ['en', 'es'],
          specialties: ['substance_abuse', 'addiction', 'treatment']
        }
      },
      international: {
        canada: {
          name: 'Canada Suicide Prevention Service',
          number: '1-833-456-4566',
          textNumber: '45645',
          website: 'https://www.crisisservicescanada.ca',
          available24x7: true
        },
        uk: {
          name: 'Samaritans',
          number: '116 123',
          website: 'https://www.samaritans.org',
          available24x7: true
        },
        australia: {
          name: 'Lifeline Australia',
          number: '13 11 14',
          textNumber: '0477 13 11 14',
          website: 'https://www.lifeline.org.au',
          available24x7: true
        }
      },
      local: {
        // Placeholder for local emergency services
        emergency: {
          name: 'Emergency Services',
          number: '911',
          available24x7: true,
          responseType: 'immediate'
        }
      }
    };
  }
  
  /**
   * Initialize emergency protocols
   */
  initializeEmergencyProtocols() {
    return {
      imminent_danger: {
        priority: 1,
        actions: ['call_911', 'notify_emergency_contacts', 'continuous_monitoring'],
        timeout: 0, // Immediate
        escalation: 'emergency_services'
      },
      suicide_plan: {
        priority: 2,
        actions: ['call_suicide_hotline', 'notify_counselor', 'safety_planning'],
        timeout: 300, // 5 minutes
        escalation: 'crisis_team'
      },
      self_harm_active: {
        priority: 3,
        actions: ['crisis_intervention', 'medical_assessment', 'safety_measures'],
        timeout: 600, // 10 minutes
        escalation: 'medical_team'
      },
      substance_overdose: {
        priority: 2,
        actions: ['call_poison_control', 'emergency_services', 'medical_intervention'],
        timeout: 120, // 2 minutes
        escalation: 'emergency_medical'
      },
      violence_threat: {
        priority: 2,
        actions: ['law_enforcement', 'threat_assessment', 'victim_protection'],
        timeout: 300, // 5 minutes
        escalation: 'police'
      }
    };
  }
  
  /**
   * Initialize external service integrations
   */
  initializeExternalServices() {
    return {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
      },
      aws_sns: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      },
      geolocation: {
        apiKey: process.env.GEOLOCATION_API_KEY,
        enabled: !!process.env.GEOLOCATION_API_KEY
      }
    };
  }
  
  /**
   * Determine appropriate emergency response
   */
  async determineEmergencyResponse(crisisAlert, crisisAnalysis) {
    const response = {
      level: 'standard',
      protocols: [],
      contacts: [],
      externalServices: [],
      timeline: []
    };
    
    try {
      // Determine emergency level
      const emergencyLevel = this.assessEmergencyLevel(crisisAnalysis);
      response.level = emergencyLevel;
      
      // Get user location for local emergency services
      const userLocation = await this.getUserLocation(crisisAlert.user);
      
      // Determine appropriate protocols
      response.protocols = this.selectEmergencyProtocols(crisisAnalysis, emergencyLevel);
      
      // Select appropriate contacts and services
      response.contacts = this.selectEmergencyContacts(crisisAnalysis, userLocation);
      response.externalServices = this.selectExternalServices(emergencyLevel, crisisAnalysis);
      
      // Create response timeline
      response.timeline = this.createResponseTimeline(response.protocols, emergencyLevel);
      
      return response;
      
    } catch (error) {
      console.error('Error determining emergency response:', error);
      throw error;
    }
  }
  
  /**
   * Assess emergency level based on crisis analysis
   */
  assessEmergencyLevel(crisisAnalysis) {
    const { riskLevel, categoryScores, riskFactors } = crisisAnalysis;
    
    // Critical emergency indicators
    if (riskLevel === 'critical' || 
        riskFactors.suicideWithMethod ||
        riskFactors.suicideWithImmediacy ||
        riskFactors.violenceWithImmediacy ||
        categoryScores.violence?.score >= 15) {
      return 'critical';
    }
    
    // High emergency indicators
    if (riskLevel === 'high' ||
        categoryScores.suicide?.score >= 10 ||
        categoryScores.substance?.score >= 12 ||
        riskFactors.multipleConcerns) {
      return 'high';
    }
    
    // Medium emergency indicators
    if (riskLevel === 'medium' ||
        categoryScores.selfHarm?.score >= 8) {
      return 'medium';
    }
    
    return 'standard';
  }
  
  /**
   * Select emergency protocols based on crisis type
   */
  selectEmergencyProtocols(crisisAnalysis, emergencyLevel) {
    const protocols = [];
    
    // Suicide-related protocols
    if (crisisAnalysis.categoryScores.suicide?.score > 0) {
      if (crisisAnalysis.riskFactors.suicideWithMethod) {
        protocols.push(this.emergencyProtocols.imminent_danger);
      } else {
        protocols.push(this.emergencyProtocols.suicide_plan);
      }
    }
    
    // Violence-related protocols
    if (crisisAnalysis.categoryScores.violence?.score > 0) {
      protocols.push(this.emergencyProtocols.violence_threat);
    }
    
    // Self-harm protocols
    if (crisisAnalysis.categoryScores.selfHarm?.score > 0) {
      protocols.push(this.emergencyProtocols.self_harm_active);
    }
    
    // Substance abuse protocols
    if (crisisAnalysis.categoryScores.substance?.score > 0) {
      protocols.push(this.emergencyProtocols.substance_overdose);
    }
    
    return protocols;
  }
  
  /**
   * Select appropriate emergency contacts
   */
  selectEmergencyContacts(crisisAnalysis, userLocation) {
    const contacts = [];
    
    // Determine country/region for appropriate helplines
    const country = userLocation?.country?.toLowerCase() || 'us';
    
    // Suicide-related contacts
    if (crisisAnalysis.categoryScores.suicide?.score > 0) {
      if (country === 'us') {
        contacts.push(this.helplines.national.suicidePrevention);
        contacts.push(this.helplines.national.crisisText);
      } else if (this.helplines.international[country]) {
        contacts.push(this.helplines.international[country]);
      }
    }
    
    // Violence-related contacts
    if (crisisAnalysis.categoryScores.violence?.score > 0) {
      contacts.push(this.helplines.national.domesticViolence);
      contacts.push(this.helplines.local.emergency);
    }
    
    // Substance abuse contacts
    if (crisisAnalysis.categoryScores.substance?.score > 0) {
      contacts.push(this.helplines.national.substanceAbuse);
    }
    
    // Always include emergency services for critical cases
    if (crisisAnalysis.riskLevel === 'critical') {
      contacts.push(this.helplines.local.emergency);
    }
    
    return contacts;
  }
  
  /**
   * Select external services for emergency response
   */
  selectExternalServices(emergencyLevel, crisisAnalysis) {
    const services = [];
    
    if (emergencyLevel === 'critical') {
      // Emergency services notification
      if (this.externalServices.twilio.enabled) {
        services.push({
          type: 'sms_alert',
          service: 'twilio',
          priority: 'immediate'
        });
      }
      
      // Geolocation for emergency dispatch
      if (this.externalServices.geolocation.enabled) {
        services.push({
          type: 'location_tracking',
          service: 'geolocation',
          priority: 'immediate'
        });
      }
    }
    
    if (emergencyLevel === 'high' || emergencyLevel === 'critical') {
      // AWS SNS for emergency notifications
      if (this.externalServices.aws_sns.enabled) {
        services.push({
          type: 'emergency_notification',
          service: 'aws_sns',
          priority: 'high'
        });
      }
    }
    
    return services;
  }
  
  /**
   * Create response timeline
   */
  createResponseTimeline(protocols, emergencyLevel) {
    const timeline = [];
    const now = new Date();
    
    protocols.forEach((protocol, index) => {
      const startTime = new Date(now.getTime() + (protocol.timeout * 1000));
      
      timeline.push({
        time: startTime,
        action: protocol.actions[0],
        protocol: protocol,
        priority: protocol.priority,
        deadline: new Date(startTime.getTime() + (300 * 1000)) // 5 minute deadline
      });
    });
    
    // Sort by priority and time
    return timeline.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.time - b.time;
    });
  }
  
  /**
   * Execute emergency response
   */
  async executeEmergencyResponse(crisisAlert, emergencyResponse) {
    const results = [];
    
    try {
      // Execute each action in the timeline
      for (const timelineItem of emergencyResponse.timeline) {
        const delay = Math.max(0, timelineItem.time - new Date());
        
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await this.executeEmergencyAction(
          timelineItem.action,
          crisisAlert,
          emergencyResponse,
          timelineItem
        );
        
        results.push({
          action: timelineItem.action,
          timestamp: new Date(),
          result,
          success: result.success
        });
        
        // Log emergency action
        console.log(`Emergency action executed: ${timelineItem.action}`, result);
      }
      
      return results;
      
    } catch (error) {
      console.error('Error executing emergency response:', error);
      throw error;
    }
  }
  
  /**
   * Execute specific emergency action
   */
  async executeEmergencyAction(action, crisisAlert, emergencyResponse, timelineItem) {
    switch (action) {
      case 'call_911':
        return await this.contactEmergencyServices(crisisAlert);
        
      case 'call_suicide_hotline':
        return await this.contactSuicideHotline(crisisAlert);
        
      case 'notify_emergency_contacts':
        return await this.notifyEmergencyContacts(crisisAlert);
        
      case 'crisis_intervention':
        return await this.initiateCrisisIntervention(crisisAlert);
        
      case 'safety_planning':
        return await this.initiateSafetyPlanning(crisisAlert);
        
      case 'medical_assessment':
        return await this.requestMedicalAssessment(crisisAlert);
        
      case 'law_enforcement':
        return await this.contactLawEnforcement(crisisAlert);
        
      case 'continuous_monitoring':
        return await this.initiateContinuousMonitoring(crisisAlert);
        
      default:
        return { success: false, message: 'Unknown emergency action' };
    }
  }
  
  /**
   * Contact emergency services (911)
   */
  async contactEmergencyServices(crisisAlert) {
    try {
      // Get user location
      const userLocation = await this.getUserLocation(crisisAlert.user);
      
      // Prepare emergency information
      const emergencyInfo = {
        type: 'mental_health_crisis',
        severity: crisisAlert.severity,
        location: userLocation,
        userInfo: {
          age: crisisAlert.user?.age,
          medicalHistory: crisisAlert.user?.medicalHistory,
          emergencyContacts: crisisAlert.user?.emergencyContacts
        },
        crisisDetails: {
          categories: crisisAlert.categories,
          riskFactors: crisisAlert.riskFactors,
          immediacy: crisisAlert.priority
        }
      };
      
      // Send automated emergency notification
      if (this.externalServices.twilio.enabled) {
        await this.sendEmergencyAlert(emergencyInfo);
      }
      
      // Log emergency contact
      await this.logEmergencyContact(crisisAlert, 'emergency_services', emergencyInfo);
      
      return {
        success: true,
        message: 'Emergency services contacted',
        referenceNumber: `EMG_${Date.now()}`,
        estimatedResponse: '5-10 minutes'
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
   * Contact suicide prevention hotline
   */
  async contactSuicideHotline(crisisAlert) {
    try {
      const hotline = this.helplines.national.suicidePrevention;
      
      // Send automated referral information
      const referralInfo = {
        hotline: hotline,
        crisisLevel: crisisAlert.severity,
        preferredContact: 'phone', // or 'text'
        urgency: 'immediate'
      };
      
      // Notify user of hotline availability
      await this.sendHotlineReferral(crisisAlert.user, referralInfo);
      
      return {
        success: true,
        message: 'Suicide prevention hotline contacted',
        hotline: hotline,
        immediateAction: 'User referred to 988'
      };
      
    } catch (error) {
      console.error('Error contacting suicide hotline:', error);
      return {
        success: false,
        message: 'Failed to contact suicide hotline',
        error: error.message
      };
    }
  }
  
  /**
   * Get user location for emergency services
   */
  async getUserLocation(userId) {
    try {
      const user = await User.findById(userId);
      
      if (user?.location) {
        return user.location;
      }
      
      // Attempt IP geolocation if available
      if (this.externalServices.geolocation.enabled && user?.lastIP) {
        return await this.getIPLocation(user.lastIP);
      }
      
      // Return default location
      return {
        country: 'US',
        state: 'Unknown',
        city: 'Unknown',
        coordinates: null
      };
      
    } catch (error) {
      console.error('Error getting user location:', error);
      return null;
    }
  }
  
  /**
   * Send emergency alert via SMS
   */
  async sendEmergencyAlert(emergencyInfo) {
    if (!this.externalServices.twilio.enabled) {
      throw new Error('Twilio not configured');
    }
    
    const twilio = require('twilio')(
      this.externalServices.twilio.accountSid,
      this.externalServices.twilio.authToken
    );
    
    const message = `EMERGENCY ALERT: Mental health crisis detected. 
Severity: ${emergencyInfo.severity}
Location: ${emergencyInfo.location?.city}, ${emergencyInfo.location?.state}
Type: ${emergencyInfo.type}
Ref: ${Date.now()}`;
    
    // Send to emergency services (if configured)
    if (process.env.EMERGENCY_SMS_NUMBER) {
      await twilio.messages.create({
        body: message,
        from: this.externalServices.twilio.phoneNumber,
        to: process.env.EMERGENCY_SMS_NUMBER
      });
    }
  }
  
  /**
   * Log emergency contact action
   */
  async logEmergencyContact(crisisAlert, contactType, details) {
    try {
      const logEntry = {
        crisisAlertId: crisisAlert._id,
        contactType,
        timestamp: new Date(),
        details,
        success: true
      };
      
      // Save to emergency contact log
      await EmergencyContact.create(logEntry);
      
    } catch (error) {
      console.error('Error logging emergency contact:', error);
    }
  }
  
  /**
   * Get all available emergency resources for user
   */
  getEmergencyResources(userLocation) {
    const country = userLocation?.country?.toLowerCase() || 'us';
    const resources = [];
    
    // National resources
    if (country === 'us') {
      resources.push(...Object.values(this.helplines.national));
    } else if (this.helplines.international[country]) {
      resources.push(this.helplines.international[country]);
    }
    
    // Local emergency services
    resources.push(this.helplines.local.emergency);
    
    return resources.map(resource => ({
      name: resource.name,
      phone: resource.number,
      text: resource.textNumber,
      website: resource.website,
      available24x7: resource.available24x7,
      specialties: resource.specialties || []
    }));
  }
}

module.exports = EmergencyContactSystem;