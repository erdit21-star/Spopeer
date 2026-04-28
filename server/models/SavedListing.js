// Updated
/**
 * SavedListing Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SavedListing = sequelize.define('SavedListing', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    listingId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'listings', key: 'id' } }
  }, { tableName: 'saved_listings', timestamps: true });

  return SavedListing;
};
