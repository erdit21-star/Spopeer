const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConversationParticipant = sequelize.define('ConversationParticipant', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'conversations', key: 'id' }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'conversation_participants',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['conversationId', 'userId'],
        name: 'conversation_participants_conversation_user_unique'
      }
    ]
  });

  return ConversationParticipant;
};
