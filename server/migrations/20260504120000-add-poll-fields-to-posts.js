'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('posts', 'type', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'post'
    });

    await queryInterface.addColumn('posts', 'pollOptions', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('posts', 'pollVotes', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('posts', 'pollVotes');
    await queryInterface.removeColumn('posts', 'pollOptions');
    await queryInterface.removeColumn('posts', 'type');
  }
};
