// Updated
/**
 * Connection (Follow) Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Connection = sequelize.define('Connection', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    followerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    followingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'blocked'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'connections',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['followerId', 'followingId']
      }
    ]
  });

  return Connection;
};

