'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('messages');
    if (!table.deletedAt) {
      await queryInterface.addColumn('messages', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // Ensure participant uniqueness even on legacy databases that missed the initial migration.
    const [existing] = await queryInterface.sequelize.query(
      `
      SELECT con.conname AS name
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'conversation_participants'
        AND con.contype = 'u'
        AND con.conname = 'conversation_participants_conversation_user_unique'
      LIMIT 1
      `
    );

    if (!existing || existing.length === 0) {
      await queryInterface.addConstraint('conversation_participants', {
        fields: ['conversationId', 'userId'],
        type: 'unique',
        name: 'conversation_participants_conversation_user_unique'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('messages');
    if (table.deletedAt) {
      await queryInterface.removeColumn('messages', 'deletedAt');
    }

    // Keep the unique constraint if it predates this migration.
  }
};
