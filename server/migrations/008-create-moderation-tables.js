// Updated
'use strict';

/**
 * Migration 008 — Create moderation tables
 *
 * Tables: reports, blocks, admin_audit_logs
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── reports ──
    await queryInterface.createTable('reports', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      reporterId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      targetType: {
        type: Sequelize.ENUM('user', 'post', 'listing', 'message', 'comment', 'reel'),
        allowNull: false
      },
      targetId: { type: Sequelize.INTEGER, allowNull: false },
      reason: {
        type: Sequelize.ENUM('spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'scam', 'other'),
        allowNull: false
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'reviewed', 'resolved', 'dismissed'),
        defaultValue: 'pending'
      },
      reviewedBy: { type: Sequelize.INTEGER, allowNull: true },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      resolution: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('reports', ['reporterId']);
    await queryInterface.addIndex('reports', ['targetType', 'targetId']);
    await queryInterface.addIndex('reports', ['status']);

    // ── blocks ──
    await queryInterface.createTable('blocks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      blockerId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      blockedId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('blocks', {
      fields: ['blockerId', 'blockedId'],
      type: 'unique',
      name: 'blocks_blocker_blocked_unique'
    });

    // ── admin_audit_logs ──
    await queryInterface.createTable('admin_audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      adminId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      action: { type: Sequelize.STRING(100), allowNull: false },
      targetType: { type: Sequelize.STRING(50), allowNull: true },
      targetId: { type: Sequelize.INTEGER, allowNull: true },
      details: { type: Sequelize.TEXT, allowNull: true },
      ipAddress: { type: Sequelize.STRING(45), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('admin_audit_logs', ['adminId']);
    await queryInterface.addIndex('admin_audit_logs', ['action']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_audit_logs');
    await queryInterface.dropTable('blocks');
    await queryInterface.dropTable('reports');
  }
};
