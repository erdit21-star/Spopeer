// Updated
/**
 * EventResponse Model
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventResponse = sequelize.define('EventResponse', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    eventId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'events', key: 'id' } },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' }
  }, { tableName: 'event_responses', timestamps: true });

  return EventResponse;
};
