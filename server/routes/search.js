// Updated
/**
 * Search Routes
 * GET /api/search - Search users by term, sport, role, location
 * GET /api/search/users - Search users for messaging (with name, email, id filtering)
 */
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { optionalAuth, authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');
const { cache } = require('../services/cache');
const logger = require('../utils/logger');
const { ok, fail } = require('../utils/response');
const { getBlockedUserIds } = require('../utils/blocks');

// ─── SEARCH USERS FOR MESSAGING ───
router.get('/users', authenticate, async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;
    const currentUserId = req.userId;

    if (!query || query.trim().length < 2) {
      return ok(res, []);
    }

    const searchTerm = `%${query.trim()}%`;
    const maxLimit = Math.min(parseInt(limit) || 5, 20);

    const users = await User.findAll({
      where: {
        isActive: true,
        id: { [Op.ne]: currentUserId }, // Exclude current user
        [Op.or]: [
          { firstName: { [Op.iLike]: searchTerm } },
          { lastName: { [Op.iLike]: searchTerm } },
          { email: { [Op.iLike]: searchTerm } },
          { id: { [Op.iLike]: searchTerm } }
        ]
      },
      attributes: ['id', 'email', 'firstName', 'lastName', 'displayName', 'role', 'sport', 'avatar', 'bio'],
      limit: maxLimit,
      order: [['createdAt', 'DESC']]
    });

    // Filter out blocked users
    let blockedIds = [];
    if (currentUserId) {
      blockedIds = await getBlockedUserIds(currentUserId);
    }

    const filtered = users.filter(u => !blockedIds.includes(String(u.id)));

    ok(res, filtered, { data: filtered });
  } catch (error) {
    logger.error({ event: 'search_users_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'User search failed.');
  }
});

// ─── SEARCH ───
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

    // Filter out blocked users if authenticated
    if (req.userId) {
      const blockedIds = await getBlockedUserIds(req.userId);
      if (blockedIds.length > 0) {
        where.id = { [Op.notIn]: blockedIds };
      }
    }

    const limit = Math.min(parseInt(pageSize) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    const cacheKey = `search:${JSON.stringify({ term, sport, userType, location, limit, offset })}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return ok(res, cached.payload || [], {
        results: cached.payload || [],
        pagination: cached.pagination || {
          total: 0,
          page: parseInt(page) || 1,
          pages: 0
        }
      });
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const payload = sanitizeUserList(req.user || null, users);
    const pagination = {
      total: count,
      page: parseInt(page) || 1,
      pages: Math.ceil(count / limit)
    };

    await cache.set(cacheKey, { payload, pagination }, 30 * 1000);
    ok(res, payload, {
      results: payload,
      pagination
    });
  } catch (error) {
    logger.error({ event: 'search_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Search failed.');
  }
});

module.exports = router;
