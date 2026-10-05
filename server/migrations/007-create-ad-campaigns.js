'use strict';

/** Migration 007: real sponsored advertising campaigns. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_campaigns', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(80), allowNull: false },
      objective: { type: Sequelize.STRING(40), allowNull: false },
      format: { type: Sequelize.STRING(40), allowNull: false },
      status: { type: Sequelize.ENUM('review', 'live', 'paused', 'ended', 'rejected'), allowNull: false, defaultValue: 'review' },
      targetProfiles: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      targetSport: { type: Sequelize.STRING(100), allowNull: true },
      targetLocation: { type: Sequelize.STRING(120), allowNull: true },
      targetAgeRange: { type: Sequelize.STRING(40), allowNull: true },
      targetSkillLevel: { type: Sequelize.STRING(60), allowNull: true },
      targetInterests: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      headline: { type: Sequelize.STRING(80), allowNull: false },
      body: { type: Sequelize.STRING(280), allowNull: true },
      cta: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'Learn More' },
      destinationUrl: { type: Sequelize.STRING(500), allowNull: true },
      creativeUrl: { type: Sequelize.STRING(1000), allowNull: true },
      creativeProvider: { type: Sequelize.STRING(30), allowNull: true },
      dailyBudget: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 5 },
      startDate: { type: Sequelize.DATEONLY, allowNull: false },
      endDate: { type: Sequelize.DATEONLY, allowNull: false },
      billingModel: { type: Sequelize.ENUM('cpm', 'cpc', 'flat'), allowNull: false, defaultValue: 'cpm' },
      impressions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      clicks: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      spend: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      reviewNote: { type: Sequelize.STRING(500), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('ad_campaigns', ['userId', 'createdAt'], { name: 'idx_ad_campaigns_user_created' });
    await queryInterface.addIndex('ad_campaigns', ['status', 'startDate', 'endDate'], { name: 'idx_ad_campaigns_delivery' });
    await queryInterface.addIndex('ad_campaigns', ['format', 'status'], { name: 'idx_ad_campaigns_format_status' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('ad_campaigns', 'idx_ad_campaigns_format_status');
    await queryInterface.removeIndex('ad_campaigns', 'idx_ad_campaigns_delivery');
    await queryInterface.removeIndex('ad_campaigns', 'idx_ad_campaigns_user_created');
    await queryInterface.dropTable('ad_campaigns');
  }
};
