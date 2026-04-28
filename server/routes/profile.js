const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { pickAllowedUpdates, normalizeUser } = require('../utils/profileUtils');

// GET /api/profile/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: { exclude: ['password'] } });
    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] get_me failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

// PATCH /api/profile/me
router.patch('/me', authenticate, async (req, res) => {
  try {
    const updates = pickAllowedUpdates(req.body);
    if (!Object.keys(updates).length) {
      return fail(res, 400, 'VALIDATION', 'No valid profile fields were provided.');
    }

    if (updates.username) {
      const existing = await User.findOne({ where: { username: updates.username } });
      if (existing && existing.id !== req.userId) {
        return fail(res, 409, 'CONFLICT', 'Username is already taken.');
      }
    }

    const user = await User.findByPk(req.userId);
    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    await user.update(updates);
    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] patch_me failed:', {
      userId: req.userId,
      path: req.originalUrl,
      method: req.method,
      message: error && error.message,
      stack: error && error.stack
    });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to update profile.');
  }
});

// GET /api/profile/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const idParam = String(req.params.id || '').trim();
    if (!idParam) {
      return fail(res, 400, 'VALIDATION', 'Profile id is required.');
    }

    let user;
    if (/^\d+$/.test(idParam)) {
      user = await User.findByPk(Number(idParam), { attributes: { exclude: ['password'] } });
    } else {
      user = await User.findOne({
        where: { username: idParam },
        attributes: { exclude: ['password'] }
      });
      if (!user) {
        user = await User.findOne({
          where: { email: idParam.toLowerCase() },
          attributes: { exclude: ['password'] }
        });
      }
    }

    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Profile not found.');
    }

    const sameUser = req.user && Number(req.user.id) === Number(user.id);
    if (!sameUser && user.privacyPublic === false) {
      return ok(res, { message: 'This profile is private.' });
    }

    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] get_by_id failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

module.exports = router;
