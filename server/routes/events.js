/**
 * Events Routes
 * GET  /api/events              - List events
 * POST /api/events              - Create event
 * POST /api/events/:id/respond  - Respond to event invite
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

// Define Event model inline (lightweight — can be moved to models/ later)
const Event = sequelize.define('Event', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  sport: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'upcoming' }
}, { tableName: 'events', timestamps: true });

const EventResponse = sequelize.define('EventResponse', {
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' }
}, { tableName: 'event_responses', timestamps: true });

// ─── LIST EVENTS ───
router.get('/', async (_req, res) => {
  try {
    await Event.sync();
    const events = await Event.findAll({
      order: [['startDate', 'ASC']],
      limit: 50
    });

    res.json({ status: 'ok', payload: events });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

// ─── CREATE EVENT ───
router.post('/', authenticate, async (req, res) => {
  try {
    await Event.sync();
    const { title, description, sport, location, startDate, endDate } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ error: 'Title and startDate are required.' });
    }

    const event = await Event.create({
      title,
      description,
      sport,
      location,
      startDate,
      endDate,
      createdBy: req.userId
    });

    res.status(201).json({ status: 'ok', payload: event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

// ─── RESPOND TO EVENT ───
router.post('/:id/respond', authenticate, async (req, res) => {
  try {
    await EventResponse.sync();
    const { status } = req.body;
    if (!['accepted', 'declined', 'maybe'].includes(status)) {
      return res.status(400).json({ error: 'Status must be accepted, declined, or maybe.' });
    }

    const [response, created] = await EventResponse.findOrCreate({
      where: { eventId: req.params.id, userId: req.userId },
      defaults: { status }
    });

    if (!created) {
      await response.update({ status });
    }

    res.json({ status: 'ok', payload: response });
  } catch (error) {
    console.error('Event respond error:', error);
    res.status(500).json({ error: 'Failed to respond to event.' });
  }
});

module.exports = router;
