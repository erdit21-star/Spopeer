// Updated
/**
 * Search Routes
 * GET /api/search          - Search users (legacy, keep for backwards-compat)
 * GET /api/search/users    - Search users (messaging + discovery)
 * GET /api/search/posts    - Search posts by content/sport/hashtag
 * GET /api/search/groups   - Search groups by name/description/sport
 * GET /api/search/hashtags - List trending hashtags
 * GET /api/discovery/trending - Trending posts/people
 */
const express = require('express');
const router = express.Router();
const { User, Post, Group, GroupMember, PostMedia } = require('../models');
const { optionalAuth, authenticate } = require('../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');
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
    const numericId = /^\d+$/.test(query.trim()) ? parseInt(query.trim(), 10) : null;

    const orConditions = [
      { firstName: { [Op.iLike]: searchTerm } },
      { lastName: { [Op.iLike]: searchTerm } },
      { email: { [Op.iLike]: searchTerm } }
    ];
    if (numericId) {
      orConditions.push({ id: numericId });
    }

    const users = await User.findAll({
      where: {
        isActive: true,
        id: { [Op.ne]: currentUserId }, // Exclude current user
        [Op.or]: orConditions
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

// ─── SEARCH POSTS ───
router.get('/posts', optionalAuth, async (req, res) => {
  try {
    const { term, sport, hashtag, page = 1, pageSize = 20 } = req.query;
    const limit = Math.min(parseInt(pageSize) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    const where = { isActive: true, status: 'active', visibility: 'public' };

    if (term) {
      where[Op.or] = [
        { content: { [Op.iLike]: `%${term}%` } },
        { sport: { [Op.iLike]: `%${term}%` } }
      ];
    }
    if (sport) where.sport = { [Op.iLike]: `%${sport}%` };
    if (hashtag) {
      where.hashtags = { [Op.contains]: [hashtag.toLowerCase().replace(/^#/, '')] };
    }

    if (req.userId) {
      const blockedIds = await getBlockedUserIds(req.userId);
      if (blockedIds.length > 0) {
        where.userId = { [Op.notIn]: blockedIds };
      }
    }

    const { rows: posts, count } = await Post.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl', 'role', 'sport'] },
        { model: PostMedia, as: 'postMedia', attributes: ['id', 'url', 'mediaType', 'sortOrder'], required: false }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, posts, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (error) {
    logger.error({ event: 'search_posts_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Post search failed.');
  }
});

// ─── SEARCH GROUPS ───
router.get('/groups', optionalAuth, async (req, res) => {
  try {
    const { term, sport, page = 1, pageSize = 20 } = req.query;
    const limit = Math.min(parseInt(pageSize) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    const where = { status: 'active' };

    if (term) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${term}%` } },
        { description: { [Op.iLike]: `%${term}%` } }
      ];
    }
    if (sport) where.sport = { [Op.iLike]: `%${sport}%` };

    // Only show public/non-private groups in search
    where.privacy = { [Op.in]: ['public'] };

    const { rows: groups, count } = await Group.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
      limit,
      offset,
      order: [['memberCount', 'DESC'], ['createdAt', 'DESC']]
    });

    // If authenticated, attach membership status
    let result = groups.map(g => g.toJSON());
    if (req.userId) {
      const memberships = await GroupMember.findAll({
        where: { userId: req.userId, groupId: result.map(g => g.id), status: 'active' },
        attributes: ['groupId', 'role']
      });
      const memberMap = Object.fromEntries(memberships.map(m => [m.groupId, m.role]));
      result = result.map(g => ({ ...g, isMember: !!memberMap[g.id], memberRole: memberMap[g.id] || null }));
    }

    ok(res, result, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
  } catch (error) {
    logger.error({ event: 'search_groups_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Group search failed.');
  }
});

// ─── TRENDING HASHTAGS ───
router.get('/hashtags', optionalAuth, async (req, res) => {
  try {
    const cached = await cache.get('search:hashtags:trending');
    if (cached) return ok(res, cached);

    // Pull the 30 most recent public posts that have hashtags and count them
    const posts = await Post.findAll({
      where: {
        isActive: true,
        status: 'active',
        visibility: 'public',
        hashtags: { [Op.ne]: null }
      },
      attributes: ['hashtags'],
      order: [['createdAt', 'DESC']],
      limit: 500,
      raw: true
    });

    const freq = {};
    for (const p of posts) {
      if (Array.isArray(p.hashtags)) {
        for (const tag of p.hashtags) {
          const t = String(tag).toLowerCase().replace(/^#/, '');
          if (t) freq[t] = (freq[t] || 0) + 1;
        }
      }
    }

    const trending = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ tag, count }));

    await cache.set('search:hashtags:trending', trending, 60 * 1000);
    ok(res, trending);
  } catch (error) {
    logger.error({ event: 'search_hashtags_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Hashtag search failed.');
  }
});

// ─── UNIFIED SEARCH (returns users + posts + groups) ───
router.get('/all', optionalAuth, async (req, res) => {
  try {
    const { term, sport, page = 1, pageSize = 10 } = req.query;
    if (!term || term.trim().length < 2) return ok(res, { users: [], posts: [], groups: [] });

    const limit = Math.min(parseInt(pageSize) || 10, 50);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    let blockedIds = [];
    if (req.userId) blockedIds = await getBlockedUserIds(req.userId);

    const userWhere = {
      isActive: true,
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${term}%` } },
        { lastName: { [Op.iLike]: `%${term}%` } },
        { bio: { [Op.iLike]: `%${term}%` } }
      ]
    };
    if (sport) userWhere.sport = { [Op.iLike]: `%${sport}%` };
    if (blockedIds.length) userWhere.id = { [Op.notIn]: blockedIds };

    const postWhere = {
      isActive: true,
      status: 'active',
      visibility: 'public',
      content: { [Op.iLike]: `%${term}%` }
    };
    if (sport) postWhere.sport = { [Op.iLike]: `%${sport}%` };
    if (blockedIds.length) postWhere.userId = { [Op.notIn]: blockedIds };

    const groupWhere = {
      status: 'active',
      privacy: 'public',
      [Op.or]: [
        { name: { [Op.iLike]: `%${term}%` } },
        { description: { [Op.iLike]: `%${term}%` } }
      ]
    };
    if (sport) groupWhere.sport = { [Op.iLike]: `%${sport}%` };

    const [users, posts, groups] = await Promise.all([
      User.findAll({ where: userWhere, attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl', 'role', 'sport'], limit, offset }),
      Post.findAll({
        where: postWhere,
        include: [
          { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
          { model: PostMedia, as: 'postMedia', attributes: ['id', 'url', 'mediaType'], required: false }
        ],
        limit, offset, order: [['createdAt', 'DESC']]
      }),
      Group.findAll({ where: groupWhere, include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }], limit, offset })
    ]);

    ok(res, { users, posts, groups });
  } catch (error) {
    logger.error({ event: 'unified_search_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Search failed.');
  }
});

module.exports = router;
