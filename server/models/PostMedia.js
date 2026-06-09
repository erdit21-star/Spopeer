// Updated
/**
 * PostMedia Model
 * Stores one or more media attachments per post.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PostMedia = sequelize.define('PostMedia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'posts', key: 'id' }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    url: { type: DataTypes.STRING(500), allowNull: false },
    publicId: { type: DataTypes.STRING(255), allowNull: true },
    mediaType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'image'
      // values: image, video, document
    },
    mimeType: { type: DataTypes.STRING(100), allowNull: true },
    sizeBytes: { type: DataTypes.INTEGER, allowNull: true },
    width: { type: DataTypes.INTEGER, allowNull: true },
    height: { type: DataTypes.INTEGER, allowNull: true },
    duration: { type: DataTypes.FLOAT, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'post_media',
    timestamps: true
  });

  return PostMedia;
};
