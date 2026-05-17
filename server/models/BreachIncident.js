/**
 * BreachIncident Model
 * Phase 4.7: Breach Notification
 * Tracks security breach incidents and affected users
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BreachIncident = sequelize.define('BreachIncident', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    incidentType: {
      type: DataTypes.ENUM(
        'data_exposure',
        'unauthorized_access',
        'malware',
        'ransomware',
        'phishing',
        'ddos',
        'credential_stuffing',
        'other'
      ),
      allowNull: false,
      comment: 'Type of security incident'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Severity level of the breach'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed description of the breach incident'
    },
    affectedDataTypes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    detectedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When the breach was detected'
    },
    reportedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the breach was reported to authorities'
    },
    containedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the breach was contained'
    },
    remediationSteps: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Steps taken to remediate the breach'
    },
    affectedUserCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of affected users'
    },
    notificationsSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When user notifications were sent'
    },
    status: {
      type: DataTypes.ENUM('detected', 'investigating', 'contained', 'resolved'),
      allowNull: false,
      defaultValue: 'detected',
      comment: 'Current status of the incident'
    },
    externalId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External reference ID from authorities or incident tracking'
    }
  }, {
    tableName: 'breach_incidents',
    timestamps: true,
    indexes: [
      { fields: ['severity'] },
      { fields: ['status'] },
      { fields: ['detectedAt'] }
    ]
  });

  return BreachIncident;
};
