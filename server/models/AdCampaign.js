/**
 * Ad Campaign Model
 * Real sponsored advertising campaigns owned by a Spopeer user.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('AdCampaign', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(80), allowNull: false },
  objective: { type: DataTypes.STRING(40), allowNull: false },
  format: { type: DataTypes.STRING(40), allowNull: false },
  status: { type: DataTypes.ENUM('review', 'live', 'paused', 'ended', 'rejected'), allowNull: false, defaultValue: 'review' },
  targetProfiles: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  targetSport: { type: DataTypes.STRING(100), allowNull: true },
  targetLocation: { type: DataTypes.STRING(120), allowNull: true },
  targetAgeRange: { type: DataTypes.STRING(40), allowNull: true },
  targetSkillLevel: { type: DataTypes.STRING(60), allowNull: true },
  targetInterests: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  headline: { type: DataTypes.STRING(80), allowNull: false },
  body: { type: DataTypes.STRING(280), allowNull: true },
  cta: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'Learn More' },
  destinationUrl: { type: DataTypes.STRING(500), allowNull: true },
  creativeUrl: { type: DataTypes.STRING(1000), allowNull: true },
  creativeProvider: { type: DataTypes.STRING(30), allowNull: true },
  dailyBudget: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 5 },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  billingModel: { type: DataTypes.ENUM('cpm', 'cpc', 'flat'), allowNull: false, defaultValue: 'cpm' },
  impressions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  clicks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  spend: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  reviewNote: { type: DataTypes.STRING(500), allowNull: true }
}, {
  tableName: 'ad_campaigns',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'createdAt'] },
    { fields: ['status', 'startDate', 'endDate'] },
    { fields: ['format', 'status'] }
  ]
});
