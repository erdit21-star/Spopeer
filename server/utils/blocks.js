/**
 * Block list utilities
 */
const { Block, Op } = require('../models');

/**
 * Get all user IDs that are blocked by or have blocked the given user
 * (bidirectional block relationship)
 * @param {number} userId
 * @returns {Promise<number[]>} Array of user IDs
 */
async function getBlockedUserIds(userId) {
  if (!userId) return [];
  
  const blocks = await Block.findAll({
    where: {
      [Op.or]: [
        { blockerId: userId },
        { blockedId: userId }
      ]
    },
    attributes: ['blockerId', 'blockedId'],
    raw: true
  });

  return blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
}

module.exports = { getBlockedUserIds };
