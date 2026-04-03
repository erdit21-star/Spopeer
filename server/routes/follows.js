/**
 * Follows Compatibility Routes
 * Maps frontend /api/follows/... calls to the connections system.
 *
 * POST   /api/follows/:userId         - Follow a user
 * DELETE /api/follows/:userId         - Unfollow a user
 * GET    /api/follows/status/:userId  - Check follow status
 * GET    /api/follows/followers/:userId - Get followers
 * GET    /api/follows/following/:userId - Get following
 * GET    /api/follows/stats/:userId   - Get follow stats
 */
const express = require('express');
const router = express.Router();
const { Connection, User } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');

// ─── FOLLOW ───
const { ok, created, fail } = require('../utils/response');
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (userId === req.userId) {
      return fail(res, 400, 'VALIDATION', 'You cannot follow yourself.');
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser || !targetUser.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

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

    await req.user.increment('followingCount');
    await targetUser.increment('followersCount');

    created(res, { message: 'Followed successfully.' });
  } catch (error) {
    console.error('Follow error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to follow user.');
  }
});

// ─── UNFOLLOW ───
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const connection = await Connection.findOne({
      where: { followerId: req.userId, followingId: userId }
    });

    if (!connection) {
      return fail(res, 404, 'NOT_FOUND', 'Not following this user.');
    }

    await connection.destroy();

    await req.user.decrement('followingCount');
    const targetUser = await User.findByPk(userId);
    if (targetUser) await targetUser.decrement('followersCount');

    ok(res, { message: 'Unfollowed successfully.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to unfollow user.');
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

// ─── GET FOLLOWERS ───
router.get('/followers/:userId', optionalAuth, async (req, res) => {
  try {
    const connections = await Connection.findAll({
      where: { followingId: req.params.userId, status: 'active' },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl', 'sport']
      }]
    });

    const followers = connections.map(c => c.follower);
    ok(res, followers);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch followers.');
  }
});

// ─── GET FOLLOWING ───
router.get('/following/:userId', optionalAuth, async (req, res) => {
  try {
    const connections = await Connection.findAll({
      where: { followerId: req.params.userId, status: 'active' },
      include: [{
        model: User,
        as: 'followedUser',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl', 'sport']
      }]
    });

    const following = connections.map(c => c.followedUser);
    ok(res, following);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch following.');
  }
});

// ─── GET FOLLOW STATS ───
router.get('/stats/:userId', optionalAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'followersCount', 'followingCount', 'postsCount']
    });

    if (!user) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    res.json({
      status: 'ok',
      payload: {
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        postsCount: user.postsCount || 0
      }
    });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch stats.');
  }
});

module.exports = router;
