// Updated
/**
 * Story Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Story = sequelize.define('Story', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    type: {
      type: DataTypes.STRING(20),
      defaultValue: 'image'
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    metrics: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    isLive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'stories',
    timestamps: true
  });

  return Story;
};
