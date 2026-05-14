'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('marketplace_analytics_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      listingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Listings',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      eventType: {
        type: Sequelize.ENUM('view', 'inquiry', 'click', 'impression'),
        allowNull: false,
        defaultValue: 'view'
      },
      eventDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('marketplace_analytics_events', {
      fields: ['listingId', 'eventDate'],
      name: 'idx_marketplace_analytics_listing_date'
    });

    await queryInterface.addIndex('marketplace_analytics_events', {
      fields: ['eventType', 'eventDate'],
      name: 'idx_marketplace_analytics_event_type_date'
    });

    await queryInterface.addIndex('marketplace_analytics_events', {
      fields: ['userId'],
      name: 'idx_marketplace_analytics_user_id'
    });

    await queryInterface.addIndex('marketplace_analytics_events', {
      fields: ['createdAt'],
      name: 'idx_marketplace_analytics_created_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('marketplace_analytics_events');
  }
};
