// Updated
/**
 * Post Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [1, 5000] }
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    repostsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'posts',
    timestamps: true
  });

  return Post;
};

