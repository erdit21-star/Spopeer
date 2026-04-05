// Updated
/**
 * Connection (Follow) Routes
 * POST   /api/connections/follow   - Follow a user
 * POST   /api/connections/unfollow - Unfollow a user
 * GET    /api/connections/followers/:userId - Get followers
 * GET    /api/connections/following/:userId - Get following
 * GET    /api/connections/status/:userId    - Check follow status
 */
const express = require('express');
const router = express.Router();
const { Connection, User } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { parsePagination } = require('../utils/validation');

// ─── FOLLOW ───
const { ok, created, fail } = require('../utils/response');
router.post('/follow', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return fail(res, 400, 'VALIDATION', 'userId is required.');
    }

    if (parseInt(userId) === req.userId) {
      return fail(res, 400, 'VALIDATION', 'You cannot follow yourself.');
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser || !targetUser.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    // Check if already following
    const existing = await Connection.findOne({
      where: { followerId: req.userId, followingId: userId }
    });

    if (existing) {
      return fail(res, 409, 'CONFLICT', 'Already following this user.');
    }

    await Connection.create({
      followerId: req.userId,
      followingId: userId,
      status: 'active'
    });

    // Update counts
    await req.user.increment('followingCount');
    await targetUser.increment('followersCount');

    created(res, { message: 'Followed successfully.' });
  } catch (error) {
    console.error('Follow error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to follow user.');
  }
});

// ─── UNFOLLOW ───
router.post('/unfollow', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return fail(res, 400, 'VALIDATION', 'userId is required.');
    }

    const connection = await Connection.findOne({
      where: { followerId: req.userId, followingId: userId }
    });

    if (!connection) {
      return fail(res, 404, 'NOT_FOUND', 'Not following this user.');
    }

    await connection.destroy();

    // Update counts
    await req.user.decrement('followingCount');
    const targetUser = await User.findByPk(userId);
    if (targetUser) await targetUser.decrement('followersCount');

    ok(res, { message: 'Unfollowed successfully.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to unfollow user.');
  }
});

// ─── GET FOLLOWERS ───
router.get('/followers/:userId', optionalAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;

    const { count, rows } = await Connection.findAndCountAll({
      where: { followingId: req.params.userId, status: 'active' },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl', 'sport']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const followers = rows.map(c => c.follower);
    ok(res, followers, { pagination: { total: count, page, pages: Math.ceil(count / limit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch followers.');
  }
});

// ─── GET FOLLOWING ───
router.get('/following/:userId', optionalAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const offset = (page - 1) * limit;

    const { count, rows } = await Connection.findAndCountAll({
      where: { followerId: req.params.userId, status: 'active' },
      include: [{
        model: User,
        as: 'followedUser',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl', 'sport']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const following = rows.map(c => c.followedUser);
    ok(res, following, { pagination: { total: count, page, pages: Math.ceil(count / limit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch following.');
  }
});

// ─── CHECK FOLLOW STATUS ───
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      where: { followerId: req.userId, followingId: req.params.userId }
    });

    res.json({
      status: 'ok',
      isFollowing: !!connection,
      connectionStatus: connection ? connection.status : null
    });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to check follow status.');
  }
});

module.exports = router;

