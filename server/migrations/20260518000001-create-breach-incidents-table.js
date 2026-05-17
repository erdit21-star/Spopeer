/**
 * Create breach_incidents table
 * Phase 4.7: Breach Notification
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('breach_incidents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      incidentType: {
        type: Sequelize.ENUM(
          'data_exposure',
          'unauthorized_access',
          'malware',
          'ransomware',
          'phishing',
          'ddos',
          'credential_stuffing',
          'other'
        ),
        allowNull: false
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      affectedDataTypes: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null
      },
      detectedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      reportedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      containedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      remediationSteps: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      affectedUserCount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      notificationsSentAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('detected', 'investigating', 'contained', 'resolved'),
        allowNull: false,
        defaultValue: 'detected'
      },
      externalId: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('breach_incidents', ['severity']);
    await queryInterface.addIndex('breach_incidents', ['status']);
    await queryInterface.addIndex('breach_incidents', ['detectedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('breach_incidents');
  }
};
