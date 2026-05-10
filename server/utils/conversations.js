/**
 * Shared conversation utilities
 */
const { Sequelize } = require('sequelize');
const { Conversation, ConversationParticipant, sequelize } = require('../models');

async function findOrCreateDirectConversationInternal(userIdA, userIdB, transaction) {
  const leftId = Math.min(Number(userIdA), Number(userIdB));
  const rightId = Math.max(Number(userIdA), Number(userIdB));

  await sequelize.query('SELECT pg_advisory_xact_lock(:leftId, :rightId)', {
    replacements: { leftId, rightId },
    transaction
  });

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

/**
 * Find existing direct conversation between two users, or create one
 * @param {number} userIdA
 * @param {number} userIdB
 * @param {Transaction} transaction - optional Sequelize transaction
 * @returns {Promise<Conversation>}
 */
async function findOrCreateDirectConversation(userIdA, userIdB, transaction) {
  if (transaction) {
    return findOrCreateDirectConversationInternal(userIdA, userIdB, transaction);
  }

  return sequelize.transaction(
    {
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
    },
    async (tx) => findOrCreateDirectConversationInternal(userIdA, userIdB, tx)
  );
}

module.exports = { findOrCreateDirectConversation };
