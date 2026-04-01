/**
 * Migration 001: Create users table
 * Matches server/models/User.js (INTEGER id, password column, all core fields)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      firstName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('athlete', 'coach', 'club', 'supportive_professional', 'admin'),
        allowNull: false,
        defaultValue: 'athlete'
      },
      sport: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      profession: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      avatarUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      coverPhotoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      followersCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      followingCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      postsCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      subscription: {
        type: Sequelize.ENUM('free', 'pro', 'elite'),
        defaultValue: 'free'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Core indexes for auth and feed queries
    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_unique' });
    await queryInterface.addIndex('users', ['role'], { name: 'users_role' });
    await queryInterface.addIndex('users', ['sport'], { name: 'users_sport' });
    await queryInterface.addIndex('users', ['isActive'], { name: 'users_is_active' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  }
};

