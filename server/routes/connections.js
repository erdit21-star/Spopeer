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
router.post('/follow', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    if (parseInt(userId) === req.userId) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if already following
    const existing = await Connection.findOne({
      where: { followerId: req.userId, followingId: userId }
    });

    if (existing) {
      return res.status(409).json({ error: 'Already following this user.' });
    }

    await Connection.create({
      followerId: req.userId,
      followingId: userId,
      status: 'active'
    });

    // Update counts
    await req.user.increment('followingCount');
    await targetUser.increment('followersCount');

    res.status(201).json({ status: 'ok', message: 'Followed successfully.' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow user.' });
  }
});

// ─── UNFOLLOW ───
router.post('/unfollow', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const connection = await Connection.findOne({
      where: { followerId: req.userId, followingId: userId }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Not following this user.' });
    }

    await connection.destroy();

    // Update counts
    await req.user.decrement('followingCount');
    const targetUser = await User.findByPk(userId);
    if (targetUser) await targetUser.decrement('followersCount');

    res.json({ status: 'ok', message: 'Unfollowed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow user.' });
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
    res.json({
      status: 'ok',
      payload: followers,
      pagination: { total: count, page, pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers.' });
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
    res.json({
      status: 'ok',
      payload: following,
      pagination: { total: count, page, pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following.' });
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
    res.status(500).json({ error: 'Failed to check follow status.' });
  }
});

module.exports = router;

