// Updated
/**
 * GroupMember Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupMember = sequelize.define('GroupMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'moderator', 'member'),
      defaultValue: 'member'
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'banned'),
      defaultValue: 'active'
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'group_members',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['groupId', 'userId'] }
    ]
  });

  return GroupMember;
};

