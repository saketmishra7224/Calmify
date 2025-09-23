const mongoose = require('mongoose');

const crisisAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  type: {
    type: String,
    enum: ['keyword-detection', 'user-report', 'counselor-escalation', 'ai-detection'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  triggerContent: {
    text: String,
    keywords: [String],
    confidence: Number
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'in-progress', 'resolved', 'false-positive'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    },
    action: {
      type: String,
      enum: ['contacted-user', 'contacted-emergency', 'escalated', 'counseling-session', 'no-action'],
    },
    notes: {
      type: String,
      maxlength: 1000
    },
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: {
      type: Date
    }
  },
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String,
    contacted: {
      type: Boolean,
      default: false
    },
    contactedAt: Date
  }],
  metadata: {
    userLocation: {
      country: String,
      state: String,
      city: String,
      timezone: String
    },
    emergencyServices: {
      contacted: {
        type: Boolean,
        default: false
      },
      contactedAt: Date,
      serviceType: String, // police, ambulance, crisis-hotline
      ticketNumber: String
    },
    autoResolved: {
      type: Boolean,
      default: false
    },
    resolvedReason: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
crisisAlertSchema.index({ user: 1 });
crisisAlertSchema.index({ status: 1 });
crisisAlertSchema.index({ severity: 1 });
crisisAlertSchema.index({ createdAt: -1 });
crisisAlertSchema.index({ assignedTo: 1 });

// Method to acknowledge alert
crisisAlertSchema.methods.acknowledge = function(userId) {
  this.status = 'acknowledged';
  this.assignedTo = userId;
  return this.save();
};

// Method to resolve alert
crisisAlertSchema.methods.resolve = function(userId, action, notes) {
  this.status = 'resolved';
  this.response.respondedBy = userId;
  this.response.respondedAt = new Date();
  this.response.action = action;
  this.response.notes = notes;
  return this.save();
};

// Method to escalate alert
crisisAlertSchema.methods.escalate = function(newSeverity) {
  this.severity = newSeverity;
  this.status = 'in-progress';
  return this.save();
};

// Static method to create alert from message
crisisAlertSchema.statics.createFromMessage = function(messageId, userId, keywords, confidence) {
  return this.create({
    user: userId,
    message: messageId,
    type: 'keyword-detection',
    severity: confidence > 0.8 ? 'critical' : confidence > 0.6 ? 'high' : 'medium',
    triggerContent: {
      keywords: keywords,
      confidence: confidence
    }
  });
};

module.exports = mongoose.model('CrisisAlert', crisisAlertSchema);