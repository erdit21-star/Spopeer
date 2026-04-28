const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const {
  Message,
  User,
  Conversation,
  ConversationParticipant,
  Block,
  sequelize
} = require('../models');
const { findOrCreateDirectConversation } = require('../utils/conversations');
const { authenticate } = require('../middleware/auth');
const { sanitizeString } = require('../utils/validation');
const { ok, created, fail } = require('../utils/response');

function logApiError(scope, req, error) {
  console.error(`[MESSAGES_API] ${scope} failed`, {
    requestId: req.requestId || null,
    userId: req.userId || null,
    path: req.originalUrl,
    method: req.method,
    message: error && error.message,
    stack: error && error.stack
  });
}

function formatMessage(message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    fromId: message.senderId,
    receiverId: message.receiverId,
    body: message.content || message.body,
    text: message.content || message.body,
    readAt: message.readAt,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
}

async function findUserByIdentifier(identifier, options) {
  const asNumber = Number(identifier);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    return User.findByPk(asNumber, options || {});
  }
  const email = String(identifier || '').trim().toLowerCase();
  if (!email) return null;
  return User.findOne({ where: { email }, ...(options || {}) });
}

async function isConversationParticipant(conversationId, userId) {
  const row = await ConversationParticipant.findOne({
    where: { conversationId, userId }
  });
  return !!row;
}

router.use(authenticate);

// POST /api/messages/conversations
router.post('/conversations', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const targetIdentifier = req.body.participantId || req.body.otherUserId || req.body.toId || req.body.userId;
    if (!targetIdentifier) {
      await transaction.rollback();
      return fail(res, 400, 'VALIDATION', 'participantId is required.');
    }

    const target = await findUserByIdentifier(targetIdentifier, { transaction });
    if (!target || !target.isActive) {
      await transaction.rollback();
      return fail(res, 404, 'NOT_FOUND', 'Participant not found.');
    }

    if (target.id === req.userId) {
      await transaction.rollback();
      return fail(res, 400, 'VALIDATION', 'You cannot create a conversation with yourself.');
    }

    const conversation = await findOrCreateDirectConversation(req.userId, target.id, transaction);
    await transaction.commit();
    return created(res, { id: conversation.id });
  } catch (error) {
    await transaction.rollback();
    logApiError('create_conversation', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to create conversation.');
  }
});

// GET /api/messages/conversations
router.get('/conversations', async (req, res) => {
  try {
    const memberships = await ConversationParticipant.findAll({
      where: { userId: req.userId },
      attributes: ['conversationId'],
      raw: true
    });

    const conversationIds = memberships.map((m) => Number(m.conversationId)).filter(Boolean);
    if (!conversationIds.length) {
      return ok(res, []);
    }

    const conversations = await Conversation.findAll({
      where: { id: { [Op.in]: conversationIds } },
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'] }]
        },
        {
          model: Message,
          as: 'messages',
          attributes: ['id', 'body', 'content', 'senderId', 'receiverId', 'createdAt', 'readAt', 'read'],
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const payload = await Promise.all(conversations.map(async (conversation) => {
      const otherParticipant = (conversation.participants || []).find((p) => p.userId !== req.userId);
      const otherUser = otherParticipant ? otherParticipant.user : null;
      const latest = (conversation.messages || [])[0] || null;

      const unread = await Message.count({
        where: {
          conversationId: conversation.id,
          senderId: { [Op.ne]: req.userId },
          receiverId: req.userId,
          [Op.or]: [{ readAt: null }, { read: false }]
        }
      });

      const otherName = otherUser
        ? [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ').trim() || otherUser.email
        : 'User';

      return {
        id: conversation.id,
        otherId: otherUser ? otherUser.id : null,
        otherName,
        unread,
        lastMessage: latest ? (latest.body || latest.content || '') : '',
        lastAt: latest ? latest.createdAt : conversation.updatedAt
      };
    }));

    return ok(res, payload);
  } catch (error) {
    logApiError('list_conversations', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch conversations.');
  }
});

// GET /api/messages/conversations/:id
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    if (!conversationId) {
      return fail(res, 400, 'VALIDATION', 'Invalid conversation id.');
    }

    const allowed = await isConversationParticipant(conversationId, req.userId);
    if (!allowed) {
      return fail(res, 403, 'FORBIDDEN', 'You are not a participant in this conversation.');
    }

    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'] }]
        }
      ]
    });

    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']]
    });

    return ok(res, {
      id: conversation.id,
      participants: (conversation.participants || []).map((p) => p.user),
      messages: messages.map(formatMessage)
    });
  } catch (error) {
    logApiError('get_conversation', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch conversation.');
  }
});

// POST /api/messages/conversations/:id/messages
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    if (!conversationId) {
      return fail(res, 400, 'VALIDATION', 'Invalid conversation id.');
    }

    const allowed = await isConversationParticipant(conversationId, req.userId);
    if (!allowed) {
      return fail(res, 403, 'FORBIDDEN', 'You are not a participant in this conversation.');
    }

    const bodyInput = sanitizeString(req.body.body || req.body.text || req.body.content, 5000);
    if (!bodyInput) {
      return fail(res, 400, 'VALIDATION', 'Message body is required.');
    }

    const participants = await ConversationParticipant.findAll({
      where: { conversationId },
      attributes: ['userId']
    });
    const receiver = participants.find((p) => p.userId !== req.userId);

    const message = await Message.create({
      conversationId,
      senderId: req.userId,
      receiverId: receiver ? receiver.userId : null,
      body: bodyInput,
      content: bodyInput,
      read: false,
      readAt: null
    });

    return created(res, formatMessage(message));
  } catch (error) {
    logApiError('send_message', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to send message.');
  }
});

// Compatibility: POST /api/messages/send
router.post('/send', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const toId = req.body.toId || req.body.receiverId || req.body.userId;
    const text = sanitizeString(req.body.text || req.body.body || req.body.content, 5000);

    if (!toId || !text) {
      await transaction.rollback();
      return fail(res, 400, 'VALIDATION', 'toId and text are required.');
    }

    const receiver = await findUserByIdentifier(toId, { transaction });
    if (!receiver || !receiver.isActive) {
      await transaction.rollback();
      return fail(res, 404, 'NOT_FOUND', 'Recipient not found.');
    }

    // Check if either party has blocked the other
    const blockExists = await Block.findOne({
      where: {
        [Op.or]: [
          { blockerId: req.userId, blockedId: receiver.id },
          { blockerId: receiver.id, blockedId: req.userId }
        ]
      },
      transaction
    });
    if (blockExists) {
      await transaction.rollback();
      return fail(res, 403, 'BLOCKED', 'You cannot message this user.');
    }

    const conversation = await findOrCreateDirectConversation(req.userId, receiver.id, transaction);

    const message = await Message.create({
      conversationId: conversation.id,
      senderId: req.userId,
      receiverId: receiver.id,
      body: text,
      content: text,
      read: false,
      readAt: null
    }, { transaction });

    await transaction.commit();
    return created(res, formatMessage(message));
  } catch (error) {
    await transaction.rollback();
    logApiError('send_message_compat', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to send message.');
  }
});

// Compatibility: GET /api/messages/conversation/:userId1/:userId2
router.get('/conversation/:userId1/:userId2', async (req, res) => {
  try {
    const aUser = await findUserByIdentifier(req.params.userId1);
    const bUser = await findUserByIdentifier(req.params.userId2);

    if (!aUser || !bUser) {
      return fail(res, 404, 'NOT_FOUND', 'Conversation participants not found.');
    }

    const userId1 = aUser.id;
    const userId2 = bUser.id;

    if (req.userId !== userId1 && req.userId !== userId2) {
      return fail(res, 403, 'FORBIDDEN', 'You can only view your own conversations.');
    }

    const conversation = await findOrCreateDirectConversation(userId1, userId2);
    const messages = await Message.findAll({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'ASC']]
    });

    return ok(res, messages.map(formatMessage));
  } catch (error) {
    logApiError('get_conversation_compat', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch conversation.');
  }
});

router.post('/mark-read', async (req, res) => {
  try {
    const fromId = Number(req.body.fromId);
    if (!fromId) {
      return fail(res, 400, 'VALIDATION', 'fromId is required.');
    }

    await Message.update(
      { read: true, readAt: new Date() },
      {
        where: {
          senderId: fromId,
          receiverId: req.userId,
          [Op.or]: [{ readAt: null }, { read: false }]
        }
      }
    );

    return ok(res, { message: 'Messages marked as read.' });
  } catch (error) {
    logApiError('mark_read', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to mark messages as read.');
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const unread = await Message.count({
      where: {
        receiverId: req.userId,
        [Op.or]: [{ readAt: null }, { read: false }]
      }
    });

    return ok(res, { unread });
  } catch (error) {
    logApiError('unread_count', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to get unread count.');
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const otherUser = await findUserByIdentifier(req.params.userId);
    if (!otherUser) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    const conversation = await findOrCreateDirectConversation(req.userId, otherUser.id);
    const messages = await Message.findAll({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'ASC']]
    });

    return ok(res, messages.map(formatMessage));
  } catch (error) {
    logApiError('list_messages_with_user', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch messages.');
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) {
      return fail(res, 404, 'NOT_FOUND', 'Message not found.');
    }
    if (message.receiverId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'You can only mark your own messages as read.');
    }

    await message.update({ read: true, readAt: new Date() });
    return ok(res, { message: 'Message marked as read.' });
  } catch (error) {
    logApiError('mark_single_read', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to mark message as read.');
  }
});

module.exports = router;

