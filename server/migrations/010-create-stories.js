'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },

      mediaUrl: { type: Sequelize.STRING(500), allowNull: false },
      thumbnailUrl: { type: Sequelize.STRING(500) },

      type: { type: Sequelize.STRING(20), defaultValue: 'image' },
      sport: { type: Sequelize.STRING(100) },
      caption: { type: Sequelize.STRING(500) },

      metrics: { type: Sequelize.JSONB, defaultValue: {} },

      isLive: { type: Sequelize.BOOLEAN, defaultValue: false },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },

      likesCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      commentsCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      viewsCount: { type: Sequelize.INTEGER, defaultValue: 0 },

      expiresAt: { type: Sequelize.DATE },

      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stories');
  }
};
