// Updated
/**
 * PostShare Model
 * Tracks reposts and external shares of posts.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PostShare = sequelize.define('PostShare', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'posts', key: 'id' }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    shareType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'repost'
      // repost | external_share
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'post_shares',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['postId', 'userId', 'shareType'] }
    ]
  });

  return PostShare;
};
