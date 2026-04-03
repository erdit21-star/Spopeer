/**
 * Search Routes
 * GET /api/search - Search users by term, sport, role, location
 */
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

// ─── SEARCH ───
const { fail } = require('../utils/response');
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

    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'ok',
      results: users,
      pagination: {
        total: count,
        page: parseInt(page) || 1,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Search failed.');
  }
});

module.exports = router;
