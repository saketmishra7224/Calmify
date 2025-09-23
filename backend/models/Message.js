const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  senderRole: {
    type: String,
    enum: ['patient', 'peer', 'counselor', 'admin', 'system', 'chatbot'],
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'escalation'],
    default: 'text'
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  crisisDetection: {
    isCrisis: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    keywords: [{
      type: String
    }],
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    flagged: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    }
  },
  metadata: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    originalMessage: {
      type: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ sessionId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ senderRole: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ 'crisisDetection.isCrisis': 1 });
messageSchema.index({ 'crisisDetection.severity': 1 });
messageSchema.index({ createdAt: -1 });

// Method to mark message as read by user
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(
    r => r.user.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    r => r.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji
  });
  
  return this.save();
};

// Method to flag message for crisis
messageSchema.methods.flagForCrisis = function(severity = 'medium', keywords = [], confidence = 0) {
  this.crisisDetection.isCrisis = true;
  this.crisisDetection.flagged = true;
  this.crisisDetection.severity = severity;
  this.crisisDetection.keywords = keywords;
  this.crisisDetection.confidence = confidence;
  return this.save();
};

// Method to review flagged message
messageSchema.methods.reviewCrisisFlag = function(reviewerId) {
  this.crisisDetection.reviewedBy = reviewerId;
  this.crisisDetection.reviewedAt = new Date();
  return this.save();
};

// Virtual for unread count
messageSchema.virtual('unreadCount').get(function() {
  return this.readBy.length;
});

// Method to soft delete message
messageSchema.methods.softDelete = function() {
  this.metadata.isDeleted = true;
  this.metadata.deletedAt = new Date();
  return this.save();
};

// Virtual to check if message needs review
messageSchema.virtual('needsReview').get(function() {
  return this.crisisDetection.flagged && !this.crisisDetection.reviewedBy;
});

module.exports = mongoose.model('Message', messageSchema);