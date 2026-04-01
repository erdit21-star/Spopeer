/**
 * Marketplace Listing Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Listing = sequelize.define('Listing', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(5),
      defaultValue: 'EUR'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    listingType: {
      type: DataTypes.ENUM('product', 'service', 'job', 'sponsorship'),
      allowNull: true
    },
    imageUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('imageUrls');
        return raw ? JSON.parse(raw) : [];
      },
      set(val) {
        this.setDataValue('imageUrls', JSON.stringify(val || []));
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'sold', 'paused', 'deleted'),
      defaultValue: 'active'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'listings',
    timestamps: true
  });

  return Listing;
};

