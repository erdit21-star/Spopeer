/**
 * Like Model - tracks who liked which post
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'posts', key: 'id' }
    }
  }, {
    tableName: 'likes',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'postId']
      }
    ]
  });

  return Like;
};

