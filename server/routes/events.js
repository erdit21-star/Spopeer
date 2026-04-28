// Updated
/**
 * Events Routes
 * GET  /api/events              - List events
 * POST /api/events              - Create event
 * POST /api/events/:id/respond  - Respond to event invite
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Event, EventResponse } = require('../models');
const { createEventSchema, validate } = require('../utils/schemas');
const logger = require('../utils/logger');

// ─── LIST EVENTS ───
const { ok, created, fail } = require('../utils/response');
router.get('/', async (_req, res) => {
  try {
    const events = await Event.findAll({
      order: [['startDate', 'ASC']],
      limit: 50
    });

    ok(res, events);
  } catch (error) {
    console.error('List events error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch events.');
  }
});

// ─── CREATE EVENT ───
router.post('/', authenticate, validate(createEventSchema), async (req, res) => {
  try {
    const { title, description, sport, location, startDate, endDate } = req.body;

    if (!title || !startDate) {
      return fail(res, 400, 'VALIDATION', 'Title and startDate are required.');
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

    created(res, event);
  } catch (error) {
    logger.error({ event: 'create_event_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Failed to create event.');
  }
});

// ─── RESPOND TO EVENT ───
router.post('/:id/respond', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined', 'maybe'].includes(status)) {
      return fail(res, 400, 'VALIDATION', 'Status must be accepted, declined, or maybe.');
    }

    const [response, created] = await EventResponse.findOrCreate({
      where: { eventId: req.params.id, userId: req.userId },
      defaults: { status }
    });

    if (!created) {
      await response.update({ status });
    }

    ok(res, response);
  } catch (error) {
    logger.error({ event: 'event_respond_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Failed to respond to event.');
  }
});

module.exports = router;
