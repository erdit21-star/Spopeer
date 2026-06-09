// Updated
/**
 * UserPrivacySettings Model
 * Stores per-user privacy preferences.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserPrivacySettings = sequelize.define('UserPrivacySettings', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' }
    },
    // Who can see the profile
    profileVisibility: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'public'
      // public | logged_in | followers | private
    },
    // Who can send messages
    messagePermission: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'everyone'
      // everyone | followers | none
    },
    // Who can comment on posts
    commentPermission: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'everyone'
      // everyone | followers | none
    },
    // Who can see follower list
    followersVisibility: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'public'
    },
    // Who can see following list
    followingVisibility: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'public'
    },
    // Email visibility
    emailVisibility: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'private'
    },
    // Phone visibility
    phoneVisibility: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'private'
    },
    // Date of birth visibility
    dobVisibility: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'private'
    }
  }, {
    tableName: 'user_privacy_settings',
    timestamps: true
  });

  return UserPrivacySettings;
};
