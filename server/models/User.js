// Updated
/**
 * User Model
 * Roles: athlete, coach, club, supportive_professional, admin
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { USER_ROLES } = require('../utils/constants');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true // allow null for Google users
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM(...USER_ROLES),
      allowNull: false,
      defaultValue: 'athlete'
    },
    sport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    profession: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    coverPhotoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    publicSlug: {
      type: DataTypes.STRING(120),
      allowNull: true,
      unique: true
    },
    cardStyle: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    ogImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    ogImageUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    userType: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    clubName: {
      type: DataTypes.STRING(180),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    weight: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    dominantSide: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    headline: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    profilePhotoUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    clubLogoUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0
    },
    services: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    followersCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    followingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    postsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    subscription: {
      type: DataTypes.ENUM('free', 'pro', 'elite'),
      defaultValue: 'free'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    displayName: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    nationality: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    contactPhone: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contactAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    primarySport: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    playingLevel: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    currentTeam: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    achievements: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stats: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    mediaLinks: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    profileVisibility: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'public'
    },
    sharingPreferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    visibility: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    extendedProfile: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    privacyPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerifyToken: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    googleId: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  });

  User.prototype.validatePassword = async function (password) {
    const hash = this.password || this.getDataValue('passwordHash');
    if (!hash) return false;

    const isBcryptHash = typeof hash === 'string' && /^\$2[aby]\$\d{2}\$/.test(hash);

    try {
      if (isBcryptHash) {
        return await bcrypt.compare(password, hash);
      }

      // Legacy fallback for older rows that may still contain plain text
      if (typeof hash === 'string' && password === hash) {
        this.set('password', password);
        await this.save({ hooks: true, silent: true });
        return true;
      }

      return false;
    } catch (err) {
      console.error('[PASSWORD] Validation error:', err.message);
      return false;
    }
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.resetToken;
    delete values.resetExpires;
    delete values.emailVerifyToken;
    return values;
  };

  return User;
};

