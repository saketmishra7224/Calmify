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
    required: false // Can be null for chatbot sessions
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
    }
  }
}, {
  timestamps: true // This adds createdAt and updatedAt
});

// Indexes for efficient queries
sessionSchema.index({ patientId: 1 });
sessionSchema.index({ helperId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ helperType: 1 });
sessionSchema.index({ severity: 1 });
sessionSchema.index({ createdAt: -1 });

// Method to start session
sessionSchema.methods.startSession = function(helperId = null) {
  this.status = 'active';
  this.startedAt = new Date();
  if (helperId) {
    this.helperId = helperId;
  }
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

module.exports = mongoose.model('Session', sessionSchema);