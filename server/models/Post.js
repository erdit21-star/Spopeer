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
      validate: { len: [0, 5000] }
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'post'
    },
    pollOptions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    pollVotes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
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
    },
    visibility: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'public'
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    linkUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    linkTitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    linkDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    linkImage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hashtags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    sharesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'active'
    },
    hiddenReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    moderatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'posts',
    timestamps: true,
    paranoid: false
  });

  return Post;
};

