/**
 * Add age verification fields to users table
 * Phase 4.6: Age Gating Enforcement
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'ageVerificationRequired', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'ageVerificationStatus', {
      type: Sequelize.ENUM('pending', 'verified', 'failed'),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'ageVerificationRequestedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'ageVerificationRequired');
    await queryInterface.removeColumn('users', 'ageVerificationStatus');
    await queryInterface.removeColumn('users', 'ageVerificationRequestedAt');
  }
};
