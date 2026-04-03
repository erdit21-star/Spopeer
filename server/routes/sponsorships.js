/**
 * Sponsorship Routes
 * GET    /api/sponsorships          - List sponsorships (filtered)
 * POST   /api/sponsorships          - Create sponsorship
 * GET    /api/sponsorships/:id      - Get single sponsorship
 * PUT    /api/sponsorships/:id      - Update sponsorship
 * DELETE /api/sponsorships/:id      - Delete sponsorship
 */
const express = require('express');
const router = express.Router();
const { Sponsorship, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { sanitizeString, parsePagination, isValidId } = require('../utils/validation');
const { Op } = require('sequelize');

// ─── LIST SPONSORSHIPS ───
const { ok, created, fail } = require('../utils/response');
router.get('/', authenticate, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;
    const where = { status: 'active' };

    // Filter by mode
    if (req.query.mode && ['offer', 'request', 'secure'].includes(req.query.mode)) {
      where.mode = req.query.mode;
    }

    // Filter by targetAudience
    if (req.query.targetAudience && req.query.targetAudience !== 'all') {
      where.targetAudience = { [Op.in]: [req.query.targetAudience, 'all'] };
    }

    // Filter by sport
    if (req.query.sport) {
      where.sport = { [Op.iLike]: '%' + sanitizeString(req.query.sport) + '%' };
    }

    // Filter by sponsorType
    if (req.query.sponsorType && req.query.sponsorType !== 'all') {
      where.sponsorType = sanitizeString(req.query.sponsorType);
    }

    // Search by keyword
    if (req.query.search) {
      const term = '%' + sanitizeString(req.query.search) + '%';
      where[Op.or] = [
        { title: { [Op.iLike]: term } },
        { summary: { [Op.iLike]: term } },
        { sport: { [Op.iLike]: term } },
        { location: { [Op.iLike]: term } }
      ];
    }

    const { rows: sponsorships, count } = await Sponsorship.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl', 'sport']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const payload = sponsorships.map(s => {
      const json = s.toJSON();
      if (json.author) {
        json.ownerName = [json.author.firstName, json.author.lastName].filter(Boolean).join(' ') || json.author.email;
        json.ownerRole = json.author.role || 'athlete';
      }
      return json;
    });

    res.json({
      status: 'ok',
      sponsorships: payload,
      pagination: { total: count, page, pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    console.error('Sponsorship list error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch sponsorships.');
  }
});

// ─── CREATE SPONSORSHIP ───
router.post('/', authenticate, async (req, res) => {
  try {
    const { mode, title, sport, sponsorType, targetAudience, location, timeline, summary } = req.body;

    if (!title || !title.trim()) {
      return fail(res, 400, 'VALIDATION', 'Title is required.');
    }
    if (!mode || !['offer', 'request', 'secure'].includes(mode)) {
      return fail(res, 400, 'VALIDATION', 'Mode must be offer, request or secure.');
    }

    const sponsorship = await Sponsorship.create({
      userId: req.userId,
      mode,
      title: sanitizeString(title).substring(0, 200),
      sport: sport ? sanitizeString(sport).substring(0, 100) : null,
      sponsorType: sponsorType ? sanitizeString(sponsorType).substring(0, 50) : null,
      targetAudience: targetAudience ? sanitizeString(targetAudience).substring(0, 50) : null,
      location: location ? sanitizeString(location).substring(0, 100) : null,
      timeline: timeline ? sanitizeString(timeline).substring(0, 100) : null,
      summary: summary ? sanitizeString(summary).substring(0, 2000) : null,
      status: 'active'
    });

    created(res, { sponsorship });
  } catch (error) {
    console.error('Sponsorship create error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create sponsorship.');
  }
});

// ─── GET SINGLE SPONSORSHIP ───
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return fail(res, 400, 'VALIDATION', 'Invalid sponsorship ID.');
    }

    const sponsorship = await Sponsorship.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl', 'sport']
      }]
    });

    if (!sponsorship) {
      return fail(res, 404, 'NOT_FOUND', 'Sponsorship not found.');
    }

    ok(res, { sponsorship });
  } catch (error) {
    console.error('Sponsorship get error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch sponsorship.');
  }
});

// ─── UPDATE SPONSORSHIP ───
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return fail(res, 400, 'VALIDATION', 'Invalid sponsorship ID.');
    }

    const sponsorship = await Sponsorship.findByPk(req.params.id);
    if (!sponsorship) {
      return fail(res, 404, 'NOT_FOUND', 'Sponsorship not found.');
    }
    if (sponsorship.userId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'You can only edit your own sponsorships.');
    }

    const allowedFields = ['title', 'sport', 'sponsorType', 'targetAudience', 'location', 'timeline', 'summary', 'status'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = sanitizeString(String(req.body[field]));
      }
    }

    await sponsorship.update(updates);
    ok(res, { sponsorship });
  } catch (error) {
    console.error('Sponsorship update error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to update sponsorship.');
  }
});

// ─── DELETE SPONSORSHIP ───
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return fail(res, 400, 'VALIDATION', 'Invalid sponsorship ID.');
    }

    const sponsorship = await Sponsorship.findByPk(req.params.id);
    if (!sponsorship) {
      return fail(res, 404, 'NOT_FOUND', 'Sponsorship not found.');
    }
    if (sponsorship.userId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'You can only delete your own sponsorships.');
    }

    await sponsorship.destroy();
    ok(res, { message: 'Sponsorship deleted.' });
  } catch (error) {
    console.error('Sponsorship delete error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete sponsorship.');
  }
});

module.exports = router;
