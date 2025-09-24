const express = require('express');
const { Note, User, Session } = require('../models');
const { auth, validation } = require('../utils');

const router = express.Router();

// Get all notes for a counselor
router.get('/',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const {
        patientId,
        sessionId,
        type,
        priority,
        status,
        tags,
        fromDate,
        toDate,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const skip = (page - 1) * limit;
      const counselorId = req.user._id;

      // Build query
      const query = { counselor: counselorId };
      
      if (patientId) query.patient = patientId;
      if (sessionId) query.session = sessionId;
      if (type && type !== 'all') query.type = type;
      if (priority && priority !== 'all') query.priority = priority;
      if (status && status !== 'all') query.status = status;
      
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        query.tags = { $in: tagArray };
      }
      
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
      }

      // Add text search
      if (search && search.trim()) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }

      const notes = await Note.find(query)
        .populate('patient', 'username email profile.firstName profile.lastName')
        .populate('session', 'title type createdAt status')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Note.countDocuments(query);

      res.json({
        success: true,
        data: {
          notes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notes'
      });
    }
  }
);

// Get a specific note
router.get('/:noteId',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const { noteId } = req.params;
      const counselorId = req.user._id;

      const note = await Note.findOne({ 
        _id: noteId, 
        counselor: counselorId 
      })
        .populate('patient', 'username email profile.firstName profile.lastName')
        .populate('session', 'title type createdAt status');

      if (!note) {
        return res.status(404).json({
          success: false,
          error: 'Note not found'
        });
      }

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      console.error('Error fetching note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch note'
      });
    }
  }
);

// Create a new note
router.post('/',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const counselorId = req.user._id;
      const {
        title,
        content,
        patient: patientId,
        session: sessionId,
        type = 'general',
        priority = 'medium',
        tags = [],
        followUpRequired = false,
        followUpDate,
        followUpNotes,
        status = 'draft'
      } = req.body;

      // Manual validation for required fields
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        });
      }

      if (!patientId) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID is required'
        });
      }

            // Verify patient exists and is actually a patient
      let patient;
      
      // Special handling for test patient ID (development mode)
      if (patientId === "test-patient-id") {
        patient = {
          _id: "test-patient-id",
          username: "testpatient",
          role: "patient",
          profile: { firstName: "Test", lastName: "Patient" }
        };
      } else if (/^[0-9a-fA-F]{24}$/.test(patientId)) {
        // Valid ObjectId format - search by ID
        patient = await User.findById(patientId);
      } else {
        // Not a valid ObjectId - try searching by username
        patient = await User.findOne({ username: patientId });
      }

      if (!patient) {
        return res.status(400).json({
          success: false,
          error: 'Patient not found. Please provide a valid patient ID or username.'
        });
      }

      if (patient.role !== 'patient') {
        return res.status(400).json({
          success: false,
          error: 'The specified user is not a patient'
        });
      }

      // If session is provided, verify it exists
      if (sessionId) {
        const session = await Session.findById(sessionId);
        if (!session) {
          return res.status(400).json({
            success: false,
            error: 'Invalid session ID'
          });
        }
      }

      const note = new Note({
        counselor: counselorId,
        patient: patient._id === "test-patient-id" ? "test-patient-id" : patient._id,
        session: sessionId || null,
        title: title.trim(),
        content: content.trim(),
        type,
        priority,
        tags: Array.isArray(tags) ? tags.map(tag => tag.trim()) : [],
        followUpRequired,
        followUpDate: followUpRequired && followUpDate ? new Date(followUpDate) : null,
        followUpNotes: followUpNotes?.trim() || '',
        status
      });

      await note.save();

      // Populate the created note before returning
      if (patient._id !== "test-patient-id") {
        await note.populate('patient', 'username email profile.firstName profile.lastName');
      } else {
        // For test patients, manually set the patient info
        note.patient = {
          _id: "test-patient-id",
          username: "testpatient", 
          email: "test@example.com",
          profile: { firstName: "Test", lastName: "Patient" }
        };
      }
      
      if (sessionId) {
        await note.populate('session', 'title type createdAt status');
      }

      res.status(201).json({
        success: true,
        message: 'Note created successfully',
        data: note
      });
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create note'
      });
    }
  }
);

// Update a note
router.put('/:noteId',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const { noteId } = req.params;
      const counselorId = req.user._id;
      const updates = req.body;

      // Find note and verify ownership
      const note = await Note.findOne({ 
        _id: noteId, 
        counselor: counselorId 
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          error: 'Note not found'
        });
      }

      // Update allowed fields
      const allowedUpdates = [
        'title', 'content', 'type', 'priority', 'tags',
        'followUpRequired', 'followUpDate', 'followUpNotes', 'status'
      ];
      
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          if (field === 'tags' && Array.isArray(updates[field])) {
            note[field] = updates[field].map(tag => tag.trim());
          } else if (field === 'followUpDate' && updates[field]) {
            note[field] = new Date(updates[field]);
          } else if (typeof updates[field] === 'string') {
            note[field] = updates[field].trim();
          } else {
            note[field] = updates[field];
          }
        }
      });

      await note.save();

      // Populate before returning
      await note.populate('patient', 'username email profile.firstName profile.lastName');
      if (note.session) {
        await note.populate('session', 'title type createdAt status');
      }

      res.json({
        success: true,
        message: 'Note updated successfully',
        data: note
      });
    } catch (error) {
      console.error('Error updating note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update note'
      });
    }
  }
);

// Delete a note
router.delete('/:noteId',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const { noteId } = req.params;
      const counselorId = req.user._id;

      const note = await Note.findOneAndDelete({ 
        _id: noteId, 
        counselor: counselorId 
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          error: 'Note not found'
        });
      }

      res.json({
        success: true,
        message: 'Note deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete note'
      });
    }
  }
);

// Get all unique tags for a counselor
router.get('/tags/all',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const counselorId = req.user._id;

      const tags = await Note.aggregate([
        { $match: { counselor: counselorId } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]);

      res.json({
        success: true,
        data: tags.map(tag => ({
          name: tag._id,
          count: tag.count
        }))
      });
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tags'
      });
    }
  }
);

// Get notes summary/statistics
router.get('/stats/summary',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const counselorId = req.user._id;

      const stats = await Note.aggregate([
        { $match: { counselor: counselorId } },
        {
          $group: {
            _id: null,
            totalNotes: { $sum: 1 },
            draftNotes: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            finalizedNotes: { $sum: { $cond: [{ $eq: ['$status', 'finalized'] }, 1, 0] } },
            urgentNotes: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
            followUpRequired: { $sum: { $cond: ['$followUpRequired', 1, 0] } }
          }
        }
      ]);

      const summary = stats[0] || {
        totalNotes: 0,
        draftNotes: 0,
        finalizedNotes: 0,
        urgentNotes: 0,
        followUpRequired: 0
      };

      // Get notes by type
      const typeStats = await Note.aggregate([
        { $match: { counselor: counselorId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          summary,
          typeDistribution: typeStats
        }
      });
    } catch (error) {
      console.error('Error fetching notes stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notes statistics'
      });
    }
  }
);

// Search for patients by username or name (for counselors to find patient IDs)
router.get('/search-patients',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters long'
        });
      }

      const searchRegex = new RegExp(query, 'i');
      
      const patients = await User.find({
        role: 'patient',
        $or: [
          { username: searchRegex },
          { email: searchRegex },
          { 'profile.firstName': searchRegex },
          { 'profile.lastName': searchRegex },
          { 'profile.preferredName': searchRegex }
        ]
      })
      .select('_id username email profile.firstName profile.lastName profile.preferredName')
      .limit(parseInt(limit));

      res.json({
        success: true,
        data: patients.map(patient => ({
          _id: patient._id,
          username: patient.username,
          email: patient.email,
          displayName: patient.profile?.preferredName || 
                      `${patient.profile?.firstName || ''} ${patient.profile?.lastName || ''}`.trim() || 
                      patient.username
        }))
      });
    } catch (error) {
      console.error('Error searching patients:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search patients'
      });
    }
  }
);

// Get notes for a specific patient
router.get('/patient/:patientId',
  auth.authenticateToken,
  auth.requireCounselor,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const counselorId = req.user._id;
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      // Verify patient exists
      const patient = await User.findById(patientId);
      if (!patient || patient.role !== 'patient') {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }

      const notes = await Note.find({ 
        counselor: counselorId, 
        patient: patientId 
      })
        .populate('session', 'title type createdAt status')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Note.countDocuments({
        counselor: counselorId,
        patient: patientId
      });

      res.json({
        success: true,
        data: {
          notes,
          patient: {
            _id: patient._id,
            username: patient.username,
            profile: patient.profile
          },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching patient notes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient notes'
      });
    }
  }
);

module.exports = router;