/**
 * Admin Routes
 * All routes require admin role
 *
 * GET    /api/admin/dashboard    - Dashboard stats
 * GET    /api/admin/users        - All users (with search, filter)
 * PUT    /api/admin/users/:id    - Update user (role, status, verified)
 * DELETE /api/admin/users/:id    - Deactivate user
 * GET    /api/admin/posts        - All posts (with moderation status)
 * DELETE /api/admin/posts/:id    - Remove post
 * GET    /api/admin/analytics    - Analytics data
 */
const express = require('express');
const router = express.Router();
const { User, Post, Connection, Message, Like, Comment } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { Op } = require('sequelize');
const { sequelize } = require('../models');

// All admin routes require auth + admin role
const { ok, created, fail } = require('../utils/response');
router.use(authenticate, requireAdmin);

// ─── DASHBOARD STATS ───
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalConnections,
      totalMessages,
      newUsersToday,
      newPostsToday,
      usersByRole,
      usersBySubscription
    ] = await Promise.all([
      User.count({ where: { isActive: true } }),
      Post.count({ where: { isActive: true } }),
      Connection.count({ where: { status: 'active' } }),
      Message.count(),
      User.count({
        where: {
          isActive: true,
          createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      }),
      Post.count({
        where: {
          isActive: true,
          createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      }),
      User.findAll({
        attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { isActive: true },
        group: ['role'],
        raw: true
      }),
      User.findAll({
        attributes: ['subscription', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { isActive: true },
        group: ['subscription'],
        raw: true
      })
    ]);

    res.json({
      status: 'ok',
      payload: {
        totalUsers,
        totalPosts,
        totalConnections,
        totalMessages,
        newUsersToday,
        newPostsToday,
        usersByRole,
        usersBySubscription
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch dashboard data.');
  }
});

// ─── LIST ALL USERS (admin view) ───
router.get('/users', async (req, res) => {
  try {
    const { role, search, isActive, page = 1, limit = 50 } = req.query;
    const where = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, users, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch users.');
  }
});

// ─── UPDATE USER (admin) ───
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');

    const allowedFields = ['role', 'isActive', 'verified', 'subscription'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await user.update(updates);
    ok(res, { message: 'User updated.', payload: user.toJSON() });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update user.');
  }
});

// ─── DEACTIVATE USER ───
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');

    if (user.id === req.userId) {
      return fail(res, 400, 'VALIDATION', 'You cannot deactivate your own account.');
    }

    await user.update({ isActive: false });
    ok(res, { message: 'User deactivated.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to deactivate user.');
  }
});

// ─── LIST ALL POSTS (admin view) ───
router.get('/posts', async (req, res) => {
  try {
    const { search, isActive = 'true', page = 1, limit = 50 } = req.query;
    const where = {};

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.content = { [Op.iLike]: `%${search}%` };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: posts, count } = await Post.findAndCountAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, posts, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch posts.');
  }
});

// ─── REMOVE POST (admin) ───
router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return fail(res, 404, 'NOT_FOUND', 'Post not found.');

    await post.update({ isActive: false });
    ok(res, { message: 'Post removed.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to remove post.');
  }
});

// ─── ANALYTICS ───
router.get('/analytics', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      newUsersLast30Days,
      newPostsLast30Days,
      totalLikes,
      totalComments,
      topPosters,
      mostFollowed
    ] = await Promise.all([
      User.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo }, isActive: true } }),
      Post.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo }, isActive: true } }),
      Like.count(),
      Comment.count(),
      User.findAll({
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'postsCount'],
        where: { isActive: true },
        order: [['postsCount', 'DESC']],
        limit: 10
      }),
      User.findAll({
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'followersCount'],
        where: { isActive: true },
        order: [['followersCount', 'DESC']],
        limit: 10
      })
    ]);

    res.json({
      status: 'ok',
      payload: {
        newUsersLast30Days,
        newPostsLast30Days,
        totalLikes,
        totalComments,
        topPosters,
        mostFollowed
      }
    });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch analytics.');
  }
});

module.exports = router;

