// Updated
/**
 * Search Routes
 * GET /api/search - Search users by term, sport, role, location
 */
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { cache } = require('../services/cache');
const logger = require('../utils/logger');

// ─── SEARCH ───
const { fail } = require('../utils/response');
const { sanitizeUserList } = require('../utils/privacy');
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { term, sport, userType, location, page = 1, pageSize = 20 } = req.query;
    const where = { isActive: true };

    if (term) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${term}%` } },
        { lastName: { [Op.iLike]: `%${term}%` } },
        { bio: { [Op.iLike]: `%${term}%` } },
        { sport: { [Op.iLike]: `%${term}%` } }
      ];
    }

    if (sport) where.sport = { [Op.iLike]: `%${sport}%` };
    if (userType) where.role = userType;
    if (location) where.location = { [Op.iLike]: `%${location}%` };

    const limit = Math.min(parseInt(pageSize) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    const cacheKey = `search:${JSON.stringify({ term, sport, userType, location, limit, offset })}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const payload = {
      status: 'ok',
      results: sanitizeUserList(req.user || null, users),
      pagination: {
        total: count,
        page: parseInt(page) || 1,
        pages: Math.ceil(count / limit)
      }
    };
    await cache.set(cacheKey, payload, 30 * 1000);
    res.json(payload);
  } catch (error) {
    logger.error({ event: 'search_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Search failed.');
  }
});

module.exports = router;
