/**
 * Forum Thread Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Thread = sequelize.define('Thread', {
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
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'groups', key: 'id' }
    },
    title: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      defaultValue: 'General'
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    replyCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'threads',
    timestamps: true
  });

  return Thread;
};

