/**
 * Message Routes
 * POST /api/messages              - Send a message
 * POST /api/messages/send         - Send a message (frontend compat)
 * POST /api/messages/mark-read    - Mark messages from sender as read
 * GET  /api/messages/conversations - Get all conversations
 * GET  /api/messages/unread/:userId - Get unread count
 * GET  /api/messages/conversation/:userId1/:userId2 - Get conversation
 * GET  /api/messages/:userId      - Get messages with a specific user
 * PUT  /api/messages/:id/read     - Mark single message as read
 */
const express = require('express');
const router = express.Router();
const { Message, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

// ─── SEND MESSAGE (compatibility: /api/messages/send) ───
router.post('/send', authenticate, async (req, res) => {
  try {
    const receiverId = req.body.toId || req.body.receiverId;
    const content = req.body.text || req.body.content;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'toId/receiverId and text/content are required.' });
    }

    if (parseInt(receiverId) === req.userId) {
      return res.status(400).json({ error: 'You cannot message yourself.' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver || !receiver.isActive) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    const message = await Message.create({
      senderId: req.userId,
      receiverId: parseInt(receiverId),
      content: content.trim()
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }
      ]
    });

    res.status(201).json({ status: 'ok', payload: fullMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ─── MARK MESSAGES AS READ (from sender) ───
router.post('/mark-read', authenticate, async (req, res) => {
  try {
    const fromId = req.body.fromId;
    if (!fromId) {
      return res.status(400).json({ error: 'fromId is required.' });
    }

    await Message.update(
      { read: true },
      { where: { senderId: parseInt(fromId), receiverId: req.userId, read: false } }
    );

    res.json({ status: 'ok', message: 'Messages marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

// ─── GET UNREAD COUNT ───
router.get('/unread/:userId', authenticate, async (req, res) => {
  try {
    const count = await Message.count({
      where: { receiverId: parseInt(req.params.userId), read: false }
    });

    res.json({ status: 'ok', unread: count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count.' });
  }
});

// ─── GET CONVERSATION BETWEEN TWO USERS ───
router.get('/conversation/:userId1/:userId2', authenticate, async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: parseInt(userId1), receiverId: parseInt(userId2) },
          { senderId: parseInt(userId2), receiverId: parseInt(userId1) }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ status: 'ok', payload: messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

// ─── SEND MESSAGE ───
router.post('/', authenticate, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'receiverId and content are required.' });
    }

    if (parseInt(receiverId) === req.userId) {
      return res.status(400).json({ error: 'You cannot message yourself.' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver || !receiver.isActive) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    const message = await Message.create({
      senderId: req.userId,
      receiverId: parseInt(receiverId),
      content: content.trim()
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }
      ]
    });

    res.status(201).json({ status: 'ok', payload: fullMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ─── GET CONVERSATIONS ───
router.get('/conversations', authenticate, async (req, res) => {
  try {
    // Get the latest message per conversation partner
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Group by conversation partner
    const conversationsMap = new Map();
    messages.forEach(msg => {
      const partnerId = msg.senderId === req.userId ? msg.receiverId : msg.senderId;
      if (!conversationsMap.has(partnerId)) {
        const partner = msg.senderId === req.userId ? msg.receiver : msg.sender;
        conversationsMap.set(partnerId, {
          partnerId,
          partner: partner.toJSON(),
          lastMessage: msg.toJSON(),
          unreadCount: 0
        });
      }
      // Count unread messages from this partner
      if (msg.receiverId === req.userId && !msg.read) {
        const conv = conversationsMap.get(partnerId);
        conv.unreadCount++;
      }
    });

    res.json({ status: 'ok', payload: Array.from(conversationsMap.values()) });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// ─── GET MESSAGES WITH USER ───
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.userId, receiverId: parseInt(req.params.userId) },
          { senderId: parseInt(req.params.userId), receiverId: req.userId }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ status: 'ok', payload: messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// ─── MARK AS READ ───
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    if (message.receiverId !== req.userId) {
      return res.status(403).json({ error: 'You can only mark your own messages as read.' });
    }

    await message.update({ read: true });
    res.json({ status: 'ok', message: 'Message marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark message as read.' });
  }
});

module.exports = router;

