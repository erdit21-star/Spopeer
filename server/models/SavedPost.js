/**
 * SavedPost Model - stores user saved/bookmarked posts
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SavedPost = sequelize.define('SavedPost', {
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
    tableName: 'saved_posts',
    timestamps: true
  });

  return SavedPost;
};

