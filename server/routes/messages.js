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
const { notifyUser } = require('../services/socket');
const { authenticate } = require('../middleware/auth');
const { sanitizeString } = require('../utils/validation');
const { createNotification } = require('../services/notifications');
const { ok, created, fail } = require('../utils/response');
const { checkMessage } = require('../services/contentFilter');

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
    read: message.read,
    readAt: message.readAt,
    deletedAt: message.deletedAt,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
}

function parsePageLimit(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

function parseBeforeCursor(raw) {
  if (!raw) return null;
  const asDate = new Date(String(raw));
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate;
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
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
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
          include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'subscription'] }]
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

    const limit = parsePageLimit(req.query.limit);
    const before = parseBeforeCursor(req.query.before);
    if (req.query.before && !before) {
      return fail(res, 400, 'VALIDATION', 'Invalid before cursor. Use an ISO timestamp.');
    }

    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: ConversationParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'subscription'] }]
        }
      ]
    });

    const where = { conversationId };
    if (before) {
      where.createdAt = { [Op.lt]: before };
    }

    const pagedMessages = await Message.findAll({
      where,
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: limit + 1
    });

    const hasMore = pagedMessages.length > limit;
    const pageMessages = hasMore ? pagedMessages.slice(0, limit) : pagedMessages;
    const messages = pageMessages.reverse();
    const oldestAt = messages.length ? messages[0].createdAt : null;

    return ok(res, {
      id: conversation.id,
      participants: (conversation.participants || []).map((p) => p.user),
      messages: messages.map(formatMessage),
      hasMore,
      oldestAt
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

    const msgFilter = checkMessage(bodyInput);
    if (msgFilter.blocked) return fail(res, 400, 'CONTENT_POLICY', msgFilter.reason);

    const participants = await ConversationParticipant.findAll({
      where: { conversationId },
      attributes: ['userId']
    });
    const receiver = participants.find((p) => p.userId !== req.userId);

    if (!receiver || !receiver.userId) {
      return fail(res, 400, 'VALIDATION', 'Conversation receiver not found.');
    }

    const blockExists = await Block.findOne({
      where: {
        [Op.or]: [
          { blockerId: req.userId, blockedId: receiver.userId },
          { blockerId: receiver.userId, blockedId: req.userId }
        ]
      }
    });

    if (blockExists) {
      return fail(res, 403, 'BLOCKED', 'You cannot message this user.');
    }

    const message = await Message.create({
      conversationId,
      senderId: req.userId,
      receiverId: receiver.userId,
      body: bodyInput,
      content: bodyInput,
      read: false,
      readAt: null
    });

    notifyUser(receiver.userId, 'new_message', {
      id: message.id,
      conversationId,
      fromId: req.userId,
      toId: receiver.userId,
      content: message.content,
      timestamp: message.createdAt
    });

    await createNotification({
      recipientId: receiver.userId,
      senderId: req.userId,
      type: 'message',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} sent you a message.`,
      href: '/pages/messaging/inbox.html'
    });

    return created(res, formatMessage(message));
  } catch (error) {
    logApiError('send_message', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to send message.');
  }
});

// PATCH /api/messages/conversations/:id/read
router.patch('/conversations/:id/read', async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    if (!conversationId) {
      return fail(res, 400, 'VALIDATION', 'Invalid conversation id.');
    }

    const allowed = await isConversationParticipant(conversationId, req.userId);
    if (!allowed) {
      return fail(res, 403, 'FORBIDDEN', 'You are not a participant in this conversation.');
    }

    const participants = await ConversationParticipant.findAll({
      where: { conversationId },
      attributes: ['userId']
    });
    const other = participants.find((p) => p.userId !== req.userId);
    const now = new Date();

    const [updated] = await Message.update(
      { read: true, readAt: now },
      {
        where: {
          conversationId,
          receiverId: req.userId,
          senderId: other ? other.userId : { [Op.ne]: req.userId },
          [Op.or]: [{ readAt: null }, { read: false }]
        }
      }
    );

    if (other && other.userId) {
      notifyUser(other.userId, 'conversation_read', {
        conversationId,
        readerId: req.userId,
        readAt: now.toISOString()
      });
    }

    return ok(res, { updated });
  } catch (error) {
    logApiError('mark_conversation_read', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to mark conversation as read.');
  }
});

// DELETE /api/messages/:id
router.delete('/:id', async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    if (!messageId) {
      return fail(res, 400, 'VALIDATION', 'Invalid message id.');
    }

    const message = await Message.findByPk(messageId);
    if (!message) {
      return fail(res, 404, 'NOT_FOUND', 'Message not found.');
    }

    if (message.senderId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'You can only delete your own messages.');
    }

    if (!message.conversationId) {
      return fail(res, 400, 'VALIDATION', 'Message does not belong to a conversation.');
    }

    const allowed = await isConversationParticipant(message.conversationId, req.userId);
    if (!allowed) {
      return fail(res, 403, 'FORBIDDEN', 'You are not a participant in this conversation.');
    }

    if (message.deletedAt) {
      return ok(res, formatMessage(message));
    }

    const participants = await ConversationParticipant.findAll({
      where: { conversationId: message.conversationId },
      attributes: ['userId']
    });
    const receiver = participants.find((p) => p.userId !== req.userId);
    const deletedAt = new Date();

    await message.update({
      body: '[Message deleted]',
      content: '[Message deleted]',
      deletedAt
    });

    if (receiver && receiver.userId) {
      notifyUser(receiver.userId, 'message_deleted', {
        id: message.id,
        conversationId: message.conversationId,
        deletedAt: deletedAt.toISOString()
      });
    }

    return ok(res, formatMessage(message));
  } catch (error) {
    logApiError('delete_message', req, error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to delete message.');
  }
});

// Compatibility: POST /api/messages/send
router.post('/send', async (req, res) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  try {
    const toId = req.body.toId || req.body.receiverId || req.body.userId;
    const text = sanitizeString(req.body.text || req.body.body || req.body.content, 5000);

    if (!toId || !text) {
      await transaction.rollback();
      return fail(res, 400, 'VALIDATION', 'toId and text are required.');
    }

    const msgFilter = checkMessage(text);
    if (msgFilter.blocked) {
      await transaction.rollback();
      return fail(res, 400, 'CONTENT_POLICY', msgFilter.reason);
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

    notifyUser(receiver.id, 'new_message', {
      id: message.id,
      conversationId: conversation.id,
      fromId: req.userId,
      toId: receiver.id,
      content: message.content,
      timestamp: message.createdAt
    });

    await createNotification({
      recipientId: receiver.id,
      senderId: req.userId,
      type: 'message',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} sent you a message.`,
      href: '/pages/messaging/inbox.html'
    });

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

    const [updated] = await Message.update(
      { read: true, readAt: new Date() },
      {
        where: {
          senderId: fromId,
          receiverId: req.userId,
          [Op.or]: [{ readAt: null }, { read: false }]
        }
      }
    );

    notifyUser(fromId, 'messages_read', {
      readerId: req.userId,
      updated
    });

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

