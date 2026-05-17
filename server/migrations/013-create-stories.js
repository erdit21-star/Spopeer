'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'stories';
    const tables = await queryInterface.showAllTables();
    const normalized = new Set((tables || []).map((t) => {
      if (typeof t === 'string') return t;
      if (t && typeof t.tableName === 'string') return t.tableName;
      return String(t || '');
    }));

    if (normalized.has(tableName)) {
      return;
    }

    await queryInterface.createTable(tableName, {
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
    const tableName = 'stories';
    const tables = await queryInterface.showAllTables();
    const normalized = new Set((tables || []).map((t) => {
      if (typeof t === 'string') return t;
      if (t && typeof t.tableName === 'string') return t.tableName;
      return String(t || '');
    }));

    if (!normalized.has(tableName)) {
      return;
    }

    await queryInterface.dropTable(tableName);
  }
};
