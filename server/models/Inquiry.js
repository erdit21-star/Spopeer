// Updated
/**
 * Inquiry Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inquiry = sequelize.define('Inquiry', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    buyerId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    sellerId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    listingId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'listings', key: 'id' } },
    message: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }
  }, { tableName: 'marketplace_inquiries', timestamps: true });

  return Inquiry;
};
