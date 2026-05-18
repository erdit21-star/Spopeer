/**
 * Add age verification fields to users table
 * Phase 4.6: Age Gating Enforcement
 */
'use strict';

async function hasColumn(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return !!table[columnName];
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await hasColumn(queryInterface, 'users', 'ageVerificationRequired'))) {
      await queryInterface.addColumn('users', 'ageVerificationRequired', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!(await hasColumn(queryInterface, 'users', 'ageVerificationStatus'))) {
      await queryInterface.addColumn('users', 'ageVerificationStatus', {
        type: Sequelize.ENUM('pending', 'verified', 'failed'),
        allowNull: true
      });
    }

    if (!(await hasColumn(queryInterface, 'users', 'ageVerificationRequestedAt'))) {
      await queryInterface.addColumn('users', 'ageVerificationRequestedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    if (await hasColumn(queryInterface, 'users', 'ageVerificationRequired')) {
      await queryInterface.removeColumn('users', 'ageVerificationRequired');
    }
    if (await hasColumn(queryInterface, 'users', 'ageVerificationStatus')) {
      await queryInterface.removeColumn('users', 'ageVerificationStatus');
    }
    if (await hasColumn(queryInterface, 'users', 'ageVerificationRequestedAt')) {
      await queryInterface.removeColumn('users', 'ageVerificationRequestedAt');
    }
  }
};
