module.exports = (sequelize, DataTypes) => {
  const MarketplaceAnalyticsEvent = sequelize.define(
    'MarketplaceAnalyticsEvent',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Listings',
          key: 'id'
        }
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      eventType: {
        type: DataTypes.ENUM('view', 'inquiry', 'click', 'impression'),
        allowNull: false,
        defaultValue: 'view'
      },
      eventDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Date in YYYY-MM-DD format for daily aggregation'
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional context (source, referrer, etc.)'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'marketplace_analytics_events',
      timestamps: true,
      indexes: [
        {
          fields: ['listingId', 'eventDate']
        },
        {
          fields: ['eventType', 'eventDate']
        },
        {
          fields: ['userId']
        },
        {
          fields: ['createdAt']
        }
      ]
    }
  );

  return MarketplaceAnalyticsEvent;
};
