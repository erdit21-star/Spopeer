// Updated
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
const { User, Post, Connection, Message, Like, Comment, Listing, Sponsorship, Job, Inquiry, AdminAuditLog } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { USER_ROLES } = require('../utils/constants');
const { normalizeUserRole } = require('../utils/validation');
const ADMIN_METRICS_TTL_MS = 15 * 1000;
const adminMetricsCache = new Map();

// All admin routes require auth + admin role (enforced in app.js before this router)
const { ok, fail } = require('../utils/response');

function getCachedAdminMetrics(key) {
  const cached = adminMetricsCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    adminMetricsCache.delete(key);
    return null;
  }
  return cached.value;
}

function setCachedAdminMetrics(key, value) {
  adminMetricsCache.set(key, {
    value,
    expiresAt: Date.now() + ADMIN_METRICS_TTL_MS
  });
}

async function writeAdminAuditLog(req, action, targetType, targetId, details) {
  try {
    await AdminAuditLog.create({
      adminId: req.userId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: details || null,
      ipAddress: req.ip
    });
  } catch (err) {
    console.warn('Admin audit log write failed:', err.message);
  }
}

// ─── DASHBOARD STATS ───
router.get('/dashboard', async (req, res) => {
  try {
    const cached = getCachedAdminMetrics('dashboard');
    if (cached) {
      return ok(res, cached);
    }

    const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
    const monthStarts = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      monthStarts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }

    const [
      totalUsers,
      totalPosts,
      totalConnections,
      totalMessages,
      newUsersToday,
      newPostsToday,
      liveUsersNow,
      liveListings,
      usersByRole,
      usersBySubscription,
      registrationsLast6Months
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
      User.count({
        where: {
          isActive: true,
          lastLogin: { [Op.gte]: new Date(Date.now() - 15 * 60 * 1000) }
        }
      }),
      Listing.count({ where: { status: 'active' } }),
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
      }),
      Promise.all(monthStarts.map(async (start, idx) => {
        const end = monthStarts[idx + 1] || new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const count = await User.count({
          where: {
            createdAt: {
              [Op.gte]: start,
              [Op.lt]: end
            }
          }
        });
        return {
          label: monthFormatter.format(start),
          count
        };
      }))
    ]);

    const payload = {
      totalUsers,
      totalPosts,
      totalConnections,
      totalMessages,
      newUsersToday,
      newPostsToday,
      liveUsersNow,
      liveListings,
      usersByRole,
      usersBySubscription,
      registrationsLast6Months
    };
    setCachedAdminMetrics('dashboard', payload);
    ok(res, payload);
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

    if (req.body.role !== undefined) {
      const normalizedRole = normalizeUserRole(req.body.role);
      if (!USER_ROLES.includes(normalizedRole)) {
        return fail(res, 400, 'VALIDATION', 'Invalid role value.');
      }
      updates.role = normalizedRole;
    }

    allowedFields.forEach(field => {
      if (field === 'role') return;
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (user.id === req.userId) {
      if (updates.role && updates.role !== user.role) {
        return fail(res, 400, 'VALIDATION', 'You cannot change your own role.');
      }
      if (updates.isActive === false) {
        return fail(res, 400, 'VALIDATION', 'You cannot deactivate your own account.');
      }
      if (updates.verified === false) {
        return fail(res, 400, 'VALIDATION', 'You cannot revoke your own verification status.');
      }
    }

    await user.update(updates);
    await writeAdminAuditLog(req, 'user_updated', 'user', user.id, JSON.stringify(updates));

    const safeUser = await User.findByPk(user.id, {
      attributes: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'subscription',
        'verified',
        'emailVerified',
        'isActive',
        'createdAt',
        'updatedAt'
      ]
    });

    ok(res, { message: 'User updated.', payload: safeUser });
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
    await writeAdminAuditLog(req, 'user_deactivated', 'user', user.id, user.email || null);
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
    await writeAdminAuditLog(req, 'post_removed', 'post', post.id, null);
    ok(res, { message: 'Post removed.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to remove post.');
  }
});

// ─── ANALYTICS ───
router.get('/analytics', async (req, res) => {
  try {
    const cached = getCachedAdminMetrics('analytics');
    if (cached) {
      return res.json(cached);
    }

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

    const payload = {
      newUsersLast30Days,
      newPostsLast30Days,
      totalLikes,
      totalComments,
      topPosters,
      mostFollowed
    };
    setCachedAdminMetrics('analytics', payload);
    ok(res, payload);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch analytics.');
  }
});

// ─── MARKETPLACE LISTINGS (admin view) ───
router.get('/marketplace/listings', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await Listing.findAndCountAll({
      where,
      include: [{ model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, rows, { pagination: { total: count, page: parsedPage, pages: Math.ceil(count / parsedLimit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch marketplace listings.');
  }
});

// ─── SPONSORSHIPS (admin view) ───
router.get('/marketplace/sponsorships', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { summary: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await Sponsorship.findAndCountAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, rows, { pagination: { total: count, page: parsedPage, pages: Math.ceil(count / parsedLimit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch sponsorships.');
  }
});

// ─── JOBS (admin view) ───
router.get('/marketplace/jobs', async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 20 } = req.query;
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await Job.findAndCountAll({
      where,
      include: [{ model: User, as: 'club', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, rows, { pagination: { total: count, page: parsedPage, pages: Math.ceil(count / parsedLimit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch jobs.');
  }
});

// ─── INQUIRIES (admin view) ───
router.get('/marketplace/inquiries', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await Inquiry.findAndCountAll({
      where,
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const listingIds = Array.from(new Set(rows.map((r) => r.listingId).filter(Boolean)));
    const listings = listingIds.length ? await Listing.findAll({
      where: { id: { [Op.in]: listingIds } },
      attributes: ['id', 'title']
    }) : [];
    const listingMap = new Map(listings.map((l) => [l.id, l.title]));

    const payload = rows.map((row) => {
      const json = row.toJSON();
      json.listingTitle = listingMap.get(json.listingId) || null;
      return json;
    });

    ok(res, payload, { pagination: { total: count, page: parsedPage, pages: Math.ceil(count / parsedLimit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch inquiries.');
  }
});

router.patch('/marketplace/inquiries/:id/status', async (req, res) => {
  try {
    const inquiry = await Inquiry.findByPk(req.params.id);
    if (!inquiry) {
      return fail(res, 404, 'NOT_FOUND', 'Inquiry not found.');
    }

    const status = String(req.body && req.body.status || '').trim().toLowerCase();
    const allowedStatuses = ['pending', 'accepted', 'declined', 'closed'];
    if (!allowedStatuses.includes(status)) {
      return fail(res, 400, 'VALIDATION', `Status must be one of: ${allowedStatuses.join(', ')}`);
    }

    await inquiry.update({ status });
    await writeAdminAuditLog(req, 'inquiry_status_updated', 'inquiry', inquiry.id, status);
    ok(res, inquiry);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update inquiry status.');
  }
});

// ─── AUDIT LOGS (admin view) ───
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const parsedLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await AdminAuditLog.findAndCountAll({
      include: [{ model: User, as: 'admin', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, rows, { pagination: { total: count, page: parsedPage, pages: Math.ceil(count / parsedLimit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch audit logs.');
  }
});

module.exports = router;

