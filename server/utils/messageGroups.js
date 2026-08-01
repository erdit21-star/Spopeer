const { Conversation, ConversationParticipant, Message, User, sequelize } = require('../models');
const { Op } = require('sequelize');

async function createGroupConversation({ ownerId, participantIds = [], title = null, transaction = null }) {
  const normalizedParticipants = Array.from(new Set([Number(ownerId), ...participantIds.filter(Boolean).map(Number)]));
  if (normalizedParticipants.length < 2) {
    throw new Error('A group conversation requires at least 2 participants.');
  }

  const conversation = await Conversation.create({ title: title || null }, { transaction });
  const members = normalizedParticipants.map((userId) => ({ conversationId: conversation.id, userId }));
  await ConversationParticipant.bulkCreate(members, { transaction });
  return conversation;
}

async function addParticipantsToConversation({ conversationId, participantIds = [], transaction = null }) {
  const existing = await ConversationParticipant.findAll({
    where: { conversationId, userId: { [Op.in]: participantIds.filter(Boolean).map(Number) } },
    transaction,
    attributes: ['userId']
  });
  const existingIds = new Set(existing.map((row) => Number(row.userId)));
  const toCreate = participantIds.filter(Boolean).map(Number).filter((id) => !existingIds.has(id)).map((userId) => ({ conversationId, userId }));
  if (toCreate.length) {
    await ConversationParticipant.bulkCreate(toCreate, { transaction });
  }
  return toCreate.length;
}

async function getConversationDetails({ conversationId, viewerId, includeMessages = false }) {
  const conversation = await Conversation.findByPk(conversationId, {
    include: [
      {
        model: ConversationParticipant,
        as: 'participants',
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'subscription'] }]
      }
    ]
  });

  if (!conversation) return null;

  const isParticipant = conversation.participants?.some((participant) => Number(participant.userId) === Number(viewerId));
  if (!isParticipant) return null;

  const payload = {
    id: conversation.id,
    title: conversation.title,
    participants: (conversation.participants || []).map((participant) => participant.user)
  };

  if (includeMessages) {
    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
      include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }]
    });
    payload.messages = messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body || message.content,
      content: message.content || message.body,
      read: message.read,
      readAt: message.readAt,
      createdAt: message.createdAt,
      attachmentUrl: message.attachmentUrl || null,
      attachmentName: message.attachmentName || null,
      attachmentMimeType: message.attachmentMimeType || null
    }));
  }

  return payload;
}

module.exports = {
  createGroupConversation,
  addParticipantsToConversation,
  getConversationDetails
};
