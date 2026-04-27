'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('conversations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('conversation_participants', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      conversationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addConstraint('conversation_participants', {
      fields: ['conversationId', 'userId'],
      type: 'unique',
      name: 'conversation_participants_conversation_user_unique'
    });

    await queryInterface.addColumn('messages', 'conversationId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'conversations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('messages', 'body', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('messages', 'readAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.changeColumn('messages', 'receiverId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('conversation_participants', ['userId']);
    await queryInterface.addIndex('conversation_participants', ['conversationId']);
    await queryInterface.addIndex('messages', ['conversationId']);
    await queryInterface.addIndex('messages', ['senderId', 'conversationId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('messages', ['senderId', 'conversationId']);
    await queryInterface.removeIndex('messages', ['conversationId']);
    await queryInterface.removeIndex('conversation_participants', ['conversationId']);
    await queryInterface.removeIndex('conversation_participants', ['userId']);

    await queryInterface.changeColumn('messages', 'receiverId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.removeColumn('messages', 'readAt');
    await queryInterface.removeColumn('messages', 'body');
    await queryInterface.removeColumn('messages', 'conversationId');

    await queryInterface.dropTable('conversation_participants');
    await queryInterface.dropTable('conversations');
  }
};
