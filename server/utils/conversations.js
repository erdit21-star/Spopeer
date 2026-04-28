/**
 * Shared conversation utilities
 */
const { Conversation, ConversationParticipant, sequelize } = require('../models');

/**
 * Find existing direct conversation between two users, or create one
 * @param {number} userIdA
 * @param {number} userIdB
 * @param {Transaction} transaction - optional Sequelize transaction
 * @returns {Promise<Conversation>}
 */
async function findOrCreateDirectConversation(userIdA, userIdB, transaction) {
  const [rows] = await sequelize.query(
    `
      SELECT cp."conversationId"
      FROM conversation_participants cp
      INNER JOIN conversation_participants cp2
        ON cp."conversationId" = cp2."conversationId"
      WHERE cp."userId" = :userIdA
        AND cp2."userId" = :userIdB
      LIMIT 1
    `,
    {
      replacements: { userIdA, userIdB },
      transaction
    }
  );

  if (rows && rows.length) {
    return Conversation.findByPk(rows[0].conversationId, { transaction });
  }

  const conversation = await Conversation.create({}, { transaction });
  await ConversationParticipant.bulkCreate(
    [
      { conversationId: conversation.id, userId: userIdA },
      { conversationId: conversation.id, userId: userIdB }
    ],
    { transaction }
  );
  return conversation;
}

module.exports = { findOrCreateDirectConversation };
