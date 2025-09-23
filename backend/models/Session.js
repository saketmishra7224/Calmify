const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  helperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Null until session is accepted by a helper
    default: null
  },
  helperType: {
    type: String,
    enum: ['chatbot', 'peer', 'counselor'],
    required: true
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe', 'critical'],
    default: 'mild'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'escalated', 'closed'],
    default: 'waiting'
  },
  sessionNotes: {
    type: String,
    maxlength: 2000
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: 1000
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  maxParticipants: {
    type: Number,
    default: 2, // Patient + Helper
    min: 2,
    max: 10
  },
  tags: [{
    type: String,
    trim: true
  }],
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  acceptedAt: {
    type: Date // When helper accepted the session
  },
  waitingTime: {
    type: Number // Minutes spent waiting before acceptance
  },
  metadata: {
    emergencyContacted: {
      type: Boolean,
      default: false
    },
    escalationReason: {
      type: String
    },
    estimatedDuration: {
      type: Number // in minutes
    },
    declines: [{
      helperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      helperRole: String,
      reason: String,
      declinedAt: Date
    }],
    helperSearchAttempts: {
      type: Number,
      default: 0
    },
    lastHelperSearchAt: {
      type: Date
    },
    // Analytics and reporting fields
    responseTime: {
      type: Number // Helper's first response time in minutes
      // Remove default: null to allow undefined instead of null
    },
    averageResponseTime: {
      type: Number // Average time between messages in minutes
      // Remove default: null to allow undefined instead of null
    },
    messageCount: {
      type: Number, // Total messages exchanged
      default: 0
    },
    helperUtilization: {
      type: Number // Percentage of session time helper was active
      // Remove default: null to allow undefined instead of null
    },
    outcomeCategory: {
      type: String,
      enum: ['resolved', 'referred', 'escalated', 'discontinued', 'timeout']
      // Remove default: null to allow undefined instead of null
    },
    patientSatisfactionScore: {
      type: Number,
      min: 1,
      max: 5
      // Remove default: null to allow undefined instead of null
    }
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt
  toJSON: { virtuals: true }, // Include virtual fields in JSON output
  toObject: { virtuals: true } // Include virtual fields in object output
});

// Indexes for efficient queries
sessionSchema.index({ patientId: 1 });
sessionSchema.index({ helperId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ helperType: 1 });
sessionSchema.index({ severity: 1 });
sessionSchema.index({ createdAt: -1 });
sessionSchema.index({ status: 1, helperType: 1 }); // Compound index for finding available sessions
sessionSchema.index({ status: 1, helperId: 1 }); // For finding sessions without helpers
sessionSchema.index({ endedAt: -1 }); // For recent completed sessions
sessionSchema.index({ 'metadata.outcomeCategory': 1 }); // For outcome analytics
sessionSchema.index({ rating: -1 }); // For satisfaction metrics

// Static method to find pending sessions for helpers
sessionSchema.statics.findPendingSessions = function(helperType = null, severity = null, limit = 20) {
  const query = {
    status: 'waiting',
    helperId: null // Only sessions without assigned helpers
  };
  
  if (helperType) {
    query.helperType = helperType;
  }
  
  if (severity) {
    query.severity = severity;
  }
  
  return this.find(query)
    .populate('patientId', 'username profile anonymousId')
    .sort({ 
      severity: -1, // Higher severity first (critical, severe, moderate, mild)
      createdAt: 1  // Older sessions first within same severity
    })
    .limit(limit);
};

// Static method to find helper's active sessions
sessionSchema.statics.findHelperActiveSessions = function(helperId) {
  return this.find({
    helperId: helperId,
    status: { $in: ['active', 'escalated'] }
  })
  .populate('patientId', 'username profile anonymousId')
  .sort({ startedAt: -1 });
};

// Static method for session analytics
sessionSchema.statics.getSessionAnalytics = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgWaitingTime: { $avg: '$waitingTime' },
        avgDuration: { $avg: { $subtract: ['$endedAt', '$startedAt'] } },
        avgRating: { $avg: '$rating' },
        avgMessageCount: { $avg: '$metadata.messageCount' },
        avgResponseTime: { $avg: '$metadata.responseTime' },
        completionRate: {
          $avg: {
            $cond: [{ $eq: ['$status', 'closed'] }, 1, 0]
          }
        },
        escalationRate: {
          $avg: {
            $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0]
          }
        },
        outcomeDistribution: {
          $push: '$metadata.outcomeCategory'
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get sessions needing attention
sessionSchema.statics.getSessionsNeedingAttention = function() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
  const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000);
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  
  return this.find({
    status: 'waiting',
    $or: [
      { severity: 'critical', createdAt: { $lte: fiveMinutesAgo } },
      { severity: 'severe', createdAt: { $lte: fifteenMinutesAgo } },
      { severity: { $in: ['moderate', 'mild'] }, createdAt: { $lte: oneHourAgo } }
    ]
  })
  .populate('patientId', 'username profile anonymousId')
  .sort({ severity: -1, createdAt: 1 });
};

// Method to accept session by helper
sessionSchema.methods.acceptSession = function(helperId) {
  this.status = 'active';
  this.helperId = helperId;
  this.acceptedAt = new Date();
  this.startedAt = new Date();
  
  // Calculate waiting time in minutes
  if (this.createdAt) {
    this.waitingTime = Math.round((this.acceptedAt - this.createdAt) / (1000 * 60));
  }
  
  return this.save();
};

// Method to start session (updated)
sessionSchema.methods.startSession = function(helperId = null) {
  if (helperId && this.helperId !== helperId) {
    this.helperId = helperId;
    this.acceptedAt = new Date();
    
    // Calculate waiting time if transitioning from waiting
    if (this.status === 'waiting' && this.createdAt) {
      this.waitingTime = Math.round((this.acceptedAt - this.createdAt) / (1000 * 60));
    }
  }
  
  this.status = 'active';
  this.startedAt = this.startedAt || new Date();
  return this.save();
};

// Method to end session
sessionSchema.methods.endSession = function(notes = '', rating = null, feedback = '') {
  this.status = 'closed';
  this.endedAt = new Date();
  if (notes) this.sessionNotes = notes;
  if (rating) this.rating = rating;
  if (feedback) this.feedback = feedback;
  return this.save();
};

// Method to escalate session
sessionSchema.methods.escalateSession = function(newSeverity, reason = '') {
  this.severity = newSeverity;
  this.status = 'escalated';
  this.metadata.escalationReason = reason;
  return this.save();
};

// Method to update session analytics
sessionSchema.methods.updateAnalytics = function(analyticsData = {}) {
  // Ensure metadata exists
  if (!this.metadata) {
    this.metadata = {};
  }
  
  if (analyticsData.messageCount !== undefined) {
    this.metadata.messageCount = analyticsData.messageCount;
  }
  if (analyticsData.responseTime !== undefined) {
    this.metadata.responseTime = analyticsData.responseTime;
  }
  if (analyticsData.averageResponseTime !== undefined) {
    this.metadata.averageResponseTime = analyticsData.averageResponseTime;
  }
  if (analyticsData.helperUtilization !== undefined) {
    this.metadata.helperUtilization = analyticsData.helperUtilization;
  }
  if (analyticsData.outcomeCategory !== undefined) {
    this.metadata.outcomeCategory = analyticsData.outcomeCategory;
  }
  if (analyticsData.patientSatisfactionScore !== undefined) {
    this.metadata.patientSatisfactionScore = analyticsData.patientSatisfactionScore;
  }
  
  return this.save();
};

// Method to increment message count
sessionSchema.methods.incrementMessageCount = function() {
  // Ensure metadata exists
  if (!this.metadata) {
    this.metadata = {};
  }
  this.metadata.messageCount = (this.metadata.messageCount || 0) + 1;
  return this.save();
};

// Virtual for session duration in minutes
sessionSchema.virtual('durationMinutes').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / (1000 * 60));
  }
  return null;
});

// Virtual to check if session is active
sessionSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for current waiting time (for active sessions)
sessionSchema.virtual('currentWaitingMinutes').get(function() {
  if (this.status === 'waiting' && this.createdAt) {
    return Math.round((Date.now() - this.createdAt.getTime()) / (1000 * 60));
  }
  return this.waitingTime || 0;
});

// Virtual for helper efficiency score
sessionSchema.virtual('helperEfficiencyScore').get(function() {
  if (this.durationMinutes && this.metadata && this.metadata.responseTime) {
    const responseRatio = this.metadata.responseTime / this.durationMinutes;
    return Math.max(0, Math.min(100, (1 - responseRatio) * 100)); // 0-100 scale
  }
  return null;
});

// Virtual to determine if session needs escalation
sessionSchema.virtual('needsEscalation').get(function() {
  const waitingMinutes = this.currentWaitingMinutes;
  const severityThresholds = {
    'critical': 5,   // 5 minutes
    'severe': 15,    // 15 minutes
    'moderate': 45,  // 45 minutes
    'mild': 120      // 2 hours
  };
  
  return waitingMinutes > (severityThresholds[this.severity] || 120);
});

module.exports = mongoose.model('Session', sessionSchema);