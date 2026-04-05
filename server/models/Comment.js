// Updated
/**
 * Comment Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Comment = sequelize.define('Comment', {
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
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [1, 1000] }
    }
  }, {
    tableName: 'comments',
    timestamps: true
  });

  return Comment;
};

