/**
 * Forum Reply Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reply = sequelize.define('Reply', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    threadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'threads', key: 'id' }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'replies',
    timestamps: true
  });

  return Reply;
};

