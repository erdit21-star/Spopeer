// Updated
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
const { Message, User, sequelize } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sanitizeString } = require('../utils/validation');

// ─── SEND MESSAGE (compatibility: /api/messages/send) ───
const { ok, created, fail } = require('../utils/response');
router.post('/send', authenticate, async (req, res) => {
  try {
    const receiverId = req.body.toId || req.body.receiverId;
    const rawContent = req.body.text || req.body.content;

    if (!receiverId || !rawContent) {
      return fail(res, 400, 'VALIDATION', 'toId/receiverId and text/content are required.');
    }

    const content = sanitizeString(rawContent, 5000);
    if (!content) {
      return fail(res, 400, 'VALIDATION', 'Message content cannot be empty.');
    }

    if (parseInt(receiverId) === req.userId) {
      return fail(res, 400, 'VALIDATION', 'You cannot message yourself.');
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver || !receiver.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Recipient not found.');
    }

    const message = await Message.create({
      senderId: req.userId,
      receiverId: parseInt(receiverId),
      content
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }
      ]
    });

    created(res, fullMessage);
  } catch (error) {
    console.error('Send message error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to send message.');
  }
});

// ─── MARK MESSAGES AS READ (from sender) ───
router.post('/mark-read', authenticate, async (req, res) => {
  try {
    const fromId = req.body.fromId;
    if (!fromId) {
      return fail(res, 400, 'VALIDATION', 'fromId is required.');
    }

    await Message.update(
      { read: true },
      { where: { senderId: parseInt(fromId), receiverId: req.userId, read: false } }
    );

    ok(res, { message: 'Messages marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to mark messages as read.');
  }
});

// ─── GET UNREAD COUNT ───
router.get('/unread/:userId', authenticate, async (req, res) => {
  try {
    // Only allow users to check their own unread count
    if (parseInt(req.params.userId) !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'You can only check your own unread count.');
    }

    const count = await Message.count({
      where: { receiverId: req.userId, read: false }
    });

    ok(res, { unread: count });
  } catch (error) {
    console.error('Unread count error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to get unread count.');
  }
});

// ─── GET CONVERSATION BETWEEN TWO USERS ───
router.get('/conversation/:userId1/:userId2', authenticate, async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    // Only participants can read their own conversations
    if (req.userId !== parseInt(userId1) && req.userId !== parseInt(userId2)) {
      return fail(res, 403, 'FORBIDDEN', 'You can only view your own conversations.');
    }

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

    ok(res, messages);
  } catch (error) {
    console.error('Get conversation error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch conversation.');
  }
});

// ─── SEND MESSAGE ───
router.post('/', authenticate, async (req, res) => {
  try {
    const { receiverId, content: rawContent } = req.body;

    if (!receiverId || !rawContent) {
      return fail(res, 400, 'VALIDATION', 'receiverId and content are required.');
    }

    const content = sanitizeString(rawContent, 5000);
    if (!content) {
      return fail(res, 400, 'VALIDATION', 'Message content cannot be empty.');
    }

    if (parseInt(receiverId) === req.userId) {
      return fail(res, 400, 'VALIDATION', 'You cannot message yourself.');
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver || !receiver.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Recipient not found.');
    }

    const message = await Message.create({
      senderId: req.userId,
      receiverId: parseInt(receiverId),
      content
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }
      ]
    });

    created(res, fullMessage);
  } catch (error) {
    console.error('Send message error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to send message.');
  }
});

// ─── GET CONVERSATIONS ───
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const latestMessages = await Message.findAll({
      where: {
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT MAX(id)
            FROM "Messages"
            WHERE "senderId" = ${req.userId} OR "receiverId" = ${req.userId}
            GROUP BY CASE
              WHEN "senderId" = ${req.userId} THEN "receiverId"
              ELSE "senderId"
            END
          )`)
        }
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const unreadRows = await Message.findAll({
      where: {
        receiverId: req.userId,
        read: false
      },
      attributes: [
        'senderId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'unreadCount']
      ],
      group: ['senderId'],
      raw: true
    });
    const unreadBySender = new Map(
      unreadRows.map(row => [Number(row.senderId), Number(row.unreadCount) || 0])
    );

    const conversations = latestMessages.map(msg => {
      const partnerId = msg.senderId === req.userId ? msg.receiverId : msg.senderId;
      const partner = msg.senderId === req.userId ? msg.receiver : msg.sender;
      return {
        partnerId,
        partner: partner.toJSON(),
        lastMessage: msg.toJSON(),
        unreadCount: unreadBySender.get(partnerId) || 0
      };
    });

    ok(res, conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch conversations.');
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

    ok(res, messages);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch messages.');
  }
});

// ─── MARK AS READ ───
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) {
      return fail(res, 404, 'NOT_FOUND', 'Message not found.');
    }

    if (message.receiverId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'You can only mark your own messages as read.');
    }

    await message.update({ read: true });
    ok(res, { message: 'Message marked as read.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to mark message as read.');
  }
});

module.exports = router;

