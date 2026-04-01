/**
 * Reel (Highlight) Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reel = sequelize.define('Reel', {
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    videoUrl: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'reels',
    timestamps: true
  });

  return Reel;
};

