const express = require('express');
const { Message, Session } = require('../models');
const { auth, validation } = require('../utils');

const router = express.Router();

// Get messages for a session
router.get('/session/:sessionId',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { page = 1, limit = 50, before } = req.query;
      const skip = (page - 1) * limit;

      // Check if user has access to session
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      const isParticipant = session.participants.some(
        p => p.user.toString() === req.user._id.toString() && !p.leftAt
      );

      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);

      if (!isParticipant && !isCounselorOrAdmin) {
        return res.status(403).json({
          error: 'Access denied to session messages'
        });
      }

      const query = {
        session: sessionId,
        'metadata.isDeleted': false
      };

      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      const messages = await Message.find(query)
        .populate('sender', 'username profile.firstName profile.lastName role')
        .populate('replyTo', 'content.text sender')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Mark messages as read by current user
      const unreadMessages = messages.filter(msg => 
        !msg.readBy.some(r => r.user.toString() === req.user._id.toString())
      );

      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(msg => msg.markAsRead(req.user._id))
        );
      }

      res.json({
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        error: 'Failed to get messages',
        details: error.message
      });
    }
  }
);

// Send message
router.post('/',
  auth.authenticateToken,
  validation.validate(validation.validateMessage),
  async (req, res) => {
    try {
      const { sessionId, content, message: messageText, replyTo } = req.body;

      // Normalize message content - accept either 'message' or 'content.text'
      let normalizedContent;
      if (messageText) {
        // If 'message' field is provided, use it
        normalizedContent = {
          text: messageText,
          type: 'text'
        };
      } else if (content) {
        // If 'content' object is provided, use it as is
        normalizedContent = content;
      } else {
        return res.status(400).json({
          error: 'Message content is required'
        });
      }

      // Check if user has access to session
      const session = await Session.findById(sessionId)
        .populate('patientId', 'username profile role')
        .populate('helperId', 'username profile role');
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      if (session.status !== 'active') {
        return res.status(400).json({
          error: 'Cannot send message to inactive session'
        });
      }

      // Check if user is either the patient or the helper in this session
      const isPatient = session.patientId && session.patientId._id.toString() === req.user._id.toString();
      const isHelper = session.helperId && session.helperId._id.toString() === req.user._id.toString();
      
      if (!isPatient && !isHelper) {
        return res.status(403).json({
          error: 'Must be session participant to send messages'
        });
      }

      const newMessage = new Message({
        sessionId: sessionId,
        senderId: req.user._id,
        message: normalizedContent.text || normalizedContent,
        senderRole: req.user.role || 'patient',
        messageType: 'text',
        replyTo
      });

      await newMessage.save();
      await newMessage.populate('senderId', 'username profile.firstName profile.lastName role');

      if (replyTo) {
        await newMessage.populate('replyTo', 'message senderId');
      }

      res.status(201).json({
        message: 'Message sent successfully',
        data: newMessage
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        error: 'Failed to send message',
        details: error.message
      });
    }
  }
);

// Edit message
router.put('/:messageId',
  auth.authenticateToken,
  validation.validate(validation.validateMessage),
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          error: 'Message not found'
        });
      }

      // Only sender can edit their message
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Can only edit your own messages'
        });
      }

      // Cannot edit messages older than 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (message.createdAt < fifteenMinutesAgo) {
        return res.status(400).json({
          error: 'Cannot edit messages older than 15 minutes'
        });
      }

      // Store original content
      if (!message.metadata.isEdited) {
        message.metadata.originalContent = message.content.text;
      }

      message.content.text = content.text;
      message.metadata.isEdited = true;
      message.metadata.editedAt = new Date();

      await message.save();
      await message.populate('sender', 'username profile.firstName profile.lastName role');

      res.json({
        message: 'Message updated successfully',
        data: message
      });
    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({
        error: 'Failed to edit message',
        details: error.message
      });
    }
  }
);

// Delete message
router.delete('/:messageId',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          error: 'Message not found'
        });
      }

      // Only sender or counselor/admin can delete message
      const isSender = message.sender.toString() === req.user._id.toString();
      const isCounselorOrAdmin = ['counselor', 'admin'].includes(req.user.role);

      if (!isSender && !isCounselorOrAdmin) {
        return res.status(403).json({
          error: 'Insufficient permissions to delete message'
        });
      }

      await message.softDelete();

      res.json({
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        error: 'Failed to delete message',
        details: error.message
      });
    }
  }
);

// Add reaction to message
router.post('/:messageId/react',
  auth.authenticateToken,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({
          error: 'Emoji is required'
        });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          error: 'Message not found'
        });
      }

      await message.addReaction(req.user._id, emoji);

      res.json({
        message: 'Reaction added successfully',
        reactions: message.reactions
      });
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({
        error: 'Failed to add reaction',
        details: error.message
      });
    }
  }
);

// Get unread message count for user
router.get('/unread-count',
  auth.authenticateToken,
  async (req, res) => {
    try {
      // Get user's active sessions
      const sessions = await Session.find({
        'participants.user': req.user._id,
        'participants.leftAt': { $exists: false },
        status: 'active'
      }).select('_id');

      const sessionIds = sessions.map(s => s._id);

      // Count unread messages in these sessions
      const unreadCount = await Message.countDocuments({
        session: { $in: sessionIds },
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id },
        'metadata.isDeleted': false
      });

      res.json({
        unreadCount
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        error: 'Failed to get unread count',
        details: error.message
      });
    }
  }
);

module.exports = router;