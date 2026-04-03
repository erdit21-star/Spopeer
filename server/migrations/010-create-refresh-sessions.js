'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_sessions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      userAgent: { type: Sequelize.STRING(500), allowNull: true },
      ipAddress: { type: Sequelize.STRING(45), allowNull: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addIndex('refresh_sessions', ['userId']);
    await queryInterface.addIndex('refresh_sessions', ['expiresAt']);
    await queryInterface.addIndex('refresh_sessions', ['tokenHash'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_sessions');
  }
};
