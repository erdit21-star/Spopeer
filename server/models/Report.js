// Updated
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Report', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reporterId: { type: DataTypes.INTEGER, allowNull: false },
  targetType: {
    type: DataTypes.ENUM('user', 'post', 'listing', 'message', 'comment', 'reel'),
    allowNull: false
  },
  targetId: { type: DataTypes.INTEGER, allowNull: false },
  reason: {
    type: DataTypes.ENUM('spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'scam', 'other'),
    allowNull: false
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'resolved', 'dismissed'),
    defaultValue: 'pending'
  },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  resolution: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'reports',
  timestamps: true
});
