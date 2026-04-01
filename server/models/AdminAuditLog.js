const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('AdminAuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  adminId: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING(100), allowNull: false },
  targetType: { type: DataTypes.STRING(50), allowNull: true },
  targetId: { type: DataTypes.INTEGER, allowNull: true },
  details: { type: DataTypes.TEXT, allowNull: true },
  ipAddress: { type: DataTypes.STRING(45), allowNull: true }
}, {
  tableName: 'admin_audit_logs',
  timestamps: true,
  updatedAt: false
});
