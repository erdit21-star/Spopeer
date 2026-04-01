/**
 * Sponsorship Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sponsorship = sequelize.define('Sponsorship', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mode: {
      type: DataTypes.ENUM('offer', 'request', 'secure'),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sponsorType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    targetAudience: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    timeline: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'closed', 'draft'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'sponsorships',
    timestamps: true
  });

  return Sponsorship;
};
