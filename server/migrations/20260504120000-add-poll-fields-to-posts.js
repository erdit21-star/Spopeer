'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('posts');

    if (!table.type) {
      await queryInterface.addColumn('posts', 'type', {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'post'
      });
    }

    if (!table.pollOptions) {
      await queryInterface.addColumn('posts', 'pollOptions', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!table.pollVotes) {
      await queryInterface.addColumn('posts', 'pollVotes', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('posts');
    if (table.pollVotes) {
      await queryInterface.removeColumn('posts', 'pollVotes');
    }
    if (table.pollOptions) {
      await queryInterface.removeColumn('posts', 'pollOptions');
    }
    if (table.type) {
      await queryInterface.removeColumn('posts', 'type');
    }
  }
};
