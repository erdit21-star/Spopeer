'use strict';

/**
 * Add post columns that exist in the Sequelize Post model but were missing
 * from the original posts table migration in already-created production DBs.
 *
 * This fixes feed errors such as:
 *   SequelizeDatabaseError: column Post.type does not exist
 */

async function hasColumn(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return !!table[columnName];
}

async function addColumnIfMissing(queryInterface, Sequelize, tableName, columnName, definition) {
  if (!(await hasColumn(queryInterface, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  if (await hasColumn(queryInterface, tableName, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, Sequelize, 'posts', 'type', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'post'
    });

    await addColumnIfMissing(queryInterface, Sequelize, 'posts', 'pollOptions', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });

    await addColumnIfMissing(queryInterface, Sequelize, 'posts', 'pollVotes', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await removeColumnIfExists(queryInterface, 'posts', 'pollVotes');
    await removeColumnIfExists(queryInterface, 'posts', 'pollOptions');
    await removeColumnIfExists(queryInterface, 'posts', 'type');
  }
};
