'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'conversations';
    const columns = await queryInterface.describeTable(table);

    if (!columns.title) {
      await queryInterface.addColumn(table, 'title', {
        type: Sequelize.STRING(160),
        allowNull: true
      });
    }

    if (!columns.isGroup) {
      await queryInterface.addColumn(table, 'isGroup', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('conversations');

    if (columns.isGroup) {
      await queryInterface.removeColumn('conversations', 'isGroup');
    }

    if (columns.title) {
      await queryInterface.removeColumn('conversations', 'title');
    }
  }
};
