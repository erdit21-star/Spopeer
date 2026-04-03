/**
 * RefreshSession Model — DB-backed refresh token sessions for server-side revocation.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshSession = sequelize.define('RefreshSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'refresh_sessions',
    timestamps: true
  });

  return RefreshSession;
};
