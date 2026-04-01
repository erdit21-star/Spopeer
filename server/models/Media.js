const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Media', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: false },
  storageProvider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'local' },
  publicId: { type: DataTypes.STRING(255), allowNull: true },
  originalName: { type: DataTypes.STRING(255), allowNull: false },
  mimeType: { type: DataTypes.STRING(100), allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
  caption: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'media',
  timestamps: true
});
