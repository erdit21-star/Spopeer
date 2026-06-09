// Updated
/**
 * Group Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Group = sequelize.define('Group', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    coverUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    memberCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    privacy: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'public'
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'active'
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'groups',
    timestamps: true
  });

  return Group;
};

