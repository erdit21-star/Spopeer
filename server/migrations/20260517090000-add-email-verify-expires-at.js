'use strict';

async function hasColumn(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return !!table[columnName];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasColumn(queryInterface, 'users', 'emailVerifyExpiresAt'))) {
      await queryInterface.addColumn('users', 'emailVerifyExpiresAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    if (await hasColumn(queryInterface, 'users', 'emailVerifyExpiresAt')) {
      await queryInterface.removeColumn('users', 'emailVerifyExpiresAt');
    }
  }
};
