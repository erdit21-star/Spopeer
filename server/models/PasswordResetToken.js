const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('PasswordResetToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  token: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' }
}, {
  tableName: 'password_reset_tokens'
});
