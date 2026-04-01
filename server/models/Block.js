const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Block', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  blockerId: { type: DataTypes.INTEGER, allowNull: false },
  blockedId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'blocks',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['blockerId', 'blockedId'] }
  ]
});
