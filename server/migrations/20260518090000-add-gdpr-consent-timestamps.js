'use strict';

async function hasColumn(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return !!table[columnName];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add privacyPolicyAcceptedAt
    if (!(await hasColumn(queryInterface, 'users', 'privacyPolicyAcceptedAt'))) {
      await queryInterface.addColumn('users', 'privacyPolicyAcceptedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when user accepted privacy policy (GDPR compliance)'
      });
    }

    // Add termsOfServiceAcceptedAt
    if (!(await hasColumn(queryInterface, 'users', 'termsOfServiceAcceptedAt'))) {
      await queryInterface.addColumn('users', 'termsOfServiceAcceptedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when user accepted terms of service (GDPR compliance)'
      });
    }

    // Add marketingConsentAt
    if (!(await hasColumn(queryInterface, 'users', 'marketingConsentAt'))) {
      await queryInterface.addColumn('users', 'marketingConsentAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when user opted in to marketing communications (GDPR compliance)'
      });
    }
  },

  async down(queryInterface) {
    if (await hasColumn(queryInterface, 'users', 'privacyPolicyAcceptedAt')) {
      await queryInterface.removeColumn('users', 'privacyPolicyAcceptedAt');
    }

    if (await hasColumn(queryInterface, 'users', 'termsOfServiceAcceptedAt')) {
      await queryInterface.removeColumn('users', 'termsOfServiceAcceptedAt');
    }

    if (await hasColumn(queryInterface, 'users', 'marketingConsentAt')) {
      await queryInterface.removeColumn('users', 'marketingConsentAt');
    }
  }
};
