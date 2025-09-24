const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  // The counselor who wrote the note
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // The patient the note is about
  patient: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and string for test patients
    required: true,
    index: true
  },
  
  // Associated session (optional - notes can be general)
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: false,
    index: true
  },
  
  // Main note content
  title: {
    type: String,
    required: true,
    maxLength: 200,
    trim: true
  },
  
  content: {
    type: String,
    required: true,
    maxLength: 5000,
    trim: true
  },
  
  // Note type/category
  type: {
    type: String,
    enum: [
      'session_note',
      'assessment',
      'treatment_plan',
      'progress_note',
      'risk_assessment',
      'general',
      'follow_up',
      'referral'
    ],
    default: 'general',
    index: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxLength: 50
  }],
  
  // Privacy settings
  confidential: {
    type: Boolean,
    default: true
  },
  
  // Note status
  status: {
    type: String,
    enum: ['draft', 'finalized', 'archived'],
    default: 'draft',
    index: true
  },
  
  // Follow-up information
  followUpRequired: {
    type: Boolean,
    default: false
  },
  
  followUpDate: {
    type: Date
  },
  
  followUpNotes: {
    type: String,
    maxLength: 1000
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Track last modified
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
noteSchema.index({ counselor: 1, createdAt: -1 });
noteSchema.index({ patient: 1, createdAt: -1 });
noteSchema.index({ counselor: 1, patient: 1 });
noteSchema.index({ type: 1, priority: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ followUpRequired: 1, followUpDate: 1 });

// Update the lastModified field on save
noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastModified = new Date();
  next();
});

// Virtual for formatted creation date
noteSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Virtual for days since creation
noteSchema.virtual('daysSinceCreated').get(function() {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Static method to get notes by counselor
noteSchema.statics.findByCounselor = function(counselorId, options = {}) {
  const {
    patientId,
    type,
    priority,
    status = 'finalized',
    tags,
    fromDate,
    toDate,
    limit = 50,
    skip = 0
  } = options;

  const query = { counselor: counselorId };
  
  if (patientId) query.patient = patientId;
  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (status) query.status = status;
  if (tags && tags.length > 0) query.tags = { $in: tags };
  
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  return this.find(query)
    .populate('patient', 'username email profile.firstName profile.lastName')
    .populate('session', 'title type createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get notes by patient
noteSchema.statics.findByPatient = function(patientId, counselorId = null) {
  const query = { patient: patientId };
  if (counselorId) query.counselor = counselorId;
  
  return this.find(query)
    .populate('counselor', 'username profile.firstName profile.lastName')
    .populate('session', 'title type createdAt')
    .sort({ createdAt: -1 });
};

// Instance method to add tags
noteSchema.methods.addTags = function(newTags) {
  if (Array.isArray(newTags)) {
    newTags.forEach(tag => {
      if (!this.tags.includes(tag)) {
        this.tags.push(tag);
      }
    });
  }
  return this.save();
};

// Instance method to remove tags
noteSchema.methods.removeTags = function(tagsToRemove) {
  if (Array.isArray(tagsToRemove)) {
    this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  }
  return this.save();
};

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;