'use strict';

/**
 * Migration 009 — Create tables previously managed by inline .sync() calls
 *
 * Tables created: events, event_responses, saved_listings, marketplace_inquiries
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── events ──
    await queryInterface.createTable('events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT },
      sport: { type: Sequelize.STRING },
      location: { type: Sequelize.STRING },
      startDate: { type: Sequelize.DATE, allowNull: false },
      endDate: { type: Sequelize.DATE },
      createdBy: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      status: { type: Sequelize.STRING, defaultValue: 'upcoming' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── event_responses ──
    await queryInterface.createTable('event_responses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      eventId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'events', key: 'id' }, onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── saved_listings ──
    await queryInterface.createTable('saved_listings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      listingId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'listings', key: 'id' }, onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── marketplace_inquiries ──
    await queryInterface.createTable('marketplace_inquiries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      buyerId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      sellerId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      listingId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'listings', key: 'id' }, onDelete: 'CASCADE'
      },
      message: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING, defaultValue: 'pending' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketplace_inquiries');
    await queryInterface.dropTable('saved_listings');
    await queryInterface.dropTable('event_responses');
    await queryInterface.dropTable('events');
  }
};
