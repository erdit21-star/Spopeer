// Updated
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
const { Op } = require('sequelize');
const { getBlockedUserIds } = require('../utils/blocks');
const { createNotification } = require('../services/notifications');

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

// ─── CREATE FOLLOW REQUEST ───
router.post('/:userId/request', authenticate, async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    if (!userId) {
      return fail(res, 400, 'VALIDATION', 'Invalid user id.');
    }

    if (userId === req.userId) {
      return fail(res, 400, 'VALIDATION', 'You cannot send a follow request to yourself.');
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser || !targetUser.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    const existing = await Connection.findOne({
      where: { followerId: req.userId, followingId: userId }
    });

    if (existing && existing.status === 'active') {
      return fail(res, 409, 'CONFLICT', 'Already following this user.');
    }

    if (existing && existing.status === 'pending') {
      return ok(res, { message: 'Follow request already pending.', status: 'pending', connectionId: existing.id });
    }

    const connection = existing
      ? await existing.update({ status: 'pending' })
      : await Connection.create({
          followerId: req.userId,
          followingId: userId,
          status: 'pending'
        });

    await createNotification({
      recipientId: userId,
      senderId: req.userId,
      type: 'follow_request',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} sent you a follow request.`,
      href: '/pages/profiles/followers.html'
    });

    return created(res, { message: 'Follow request sent.', status: 'pending', connectionId: connection.id });
  } catch (error) {
    console.error('Follow request error:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to send follow request.');
  }
});

// ─── LIST INCOMING FOLLOW REQUESTS ───
router.get('/requests/incoming', authenticate, async (req, res) => {
  try {
    const requests = await Connection.findAll({
      where: { followingId: req.userId, status: 'pending' },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport']
      }],
      order: [['createdAt', 'DESC']]
    });

    return ok(res, requests.map((request) => ({
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      user: request.follower
    })));
  } catch (error) {
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch incoming follow requests.');
  }
});

// ─── LIST OUTGOING FOLLOW REQUESTS ───
router.get('/requests/outgoing', authenticate, async (req, res) => {
  try {
    const requests = await Connection.findAll({
      where: { followerId: req.userId, status: 'pending' },
      include: [{
        model: User,
        as: 'followedUser',
        attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport']
      }],
      order: [['createdAt', 'DESC']]
    });

    return ok(res, requests.map((request) => ({
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      user: request.followedUser
    })));
  } catch (error) {
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch outgoing follow requests.');
  }
});

// ─── ACCEPT FOLLOW REQUEST ───
router.patch('/requests/:connectionId/accept', authenticate, async (req, res) => {
  try {
    const connectionId = parsePositiveInt(req.params.connectionId);
    if (!connectionId) {
      return fail(res, 400, 'VALIDATION', 'Invalid connection id.');
    }

    const connection = await Connection.findByPk(connectionId);
    if (!connection || connection.followingId !== req.userId || connection.status !== 'pending') {
      return fail(res, 404, 'NOT_FOUND', 'Follow request not found.');
    }

    await connection.update({ status: 'active' });

    const follower = await User.findByPk(connection.followerId);
    const followed = await User.findByPk(connection.followingId);

    if (follower) await follower.increment('followingCount');
    if (followed) await followed.increment('followersCount');

    await createNotification({
      recipientId: connection.followerId,
      senderId: req.userId,
      type: 'follow_accept',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} accepted your follow request.`,
      href: `/pages/profiles/public-profile.html?userId=${encodeURIComponent(req.userId)}`
    });

    return ok(res, { message: 'Follow request accepted.', status: 'active', connectionId: connection.id, userId: connection.followerId });
  } catch (error) {
    return fail(res, 500, 'SERVER_ERROR', 'Failed to accept follow request.');
  }
});

// ─── REJECT FOLLOW REQUEST ───
router.patch('/requests/:connectionId/reject', authenticate, async (req, res) => {
  try {
    const connectionId = parsePositiveInt(req.params.connectionId);
    if (!connectionId) {
      return fail(res, 400, 'VALIDATION', 'Invalid connection id.');
    }

    const connection = await Connection.findByPk(connectionId);
    if (!connection || connection.followingId !== req.userId || connection.status !== 'pending') {
      return fail(res, 404, 'NOT_FOUND', 'Follow request not found.');
    }

    const requesterId = connection.followerId;
    await connection.destroy();

    return ok(res, { message: 'Follow request rejected.', connectionId, userId: requesterId });
  } catch (error) {
    return fail(res, 500, 'SERVER_ERROR', 'Failed to reject follow request.');
  }
});

// ─── CANCEL OUTGOING FOLLOW REQUEST ───
router.patch('/requests/:connectionId/cancel', authenticate, async (req, res) => {
  try {
    const connectionId = parsePositiveInt(req.params.connectionId);
    if (!connectionId) {
      return fail(res, 400, 'VALIDATION', 'Invalid connection id.');
    }

    const connection = await Connection.findByPk(connectionId);
    if (!connection || connection.followerId !== req.userId || connection.status !== 'pending') {
      return fail(res, 404, 'NOT_FOUND', 'Outgoing follow request not found.');
    }

    const targetUserId = connection.followingId;
    await connection.destroy();

    return ok(res, { message: 'Follow request canceled.', connectionId, userId: targetUserId });
  } catch (error) {
    return fail(res, 500, 'SERVER_ERROR', 'Failed to cancel follow request.');
  }
});

// ─── FOLLOW ───
const { ok, created, fail } = require('../utils/response');
const { sanitizeUserList } = require('../utils/privacy');
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 400, 'VALIDATION', 'Invalid user id.');
    }

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

    await createNotification({
      recipientId: userId,
      senderId: req.userId,
      type: 'follow',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} started following you.`,
      href: `/pages/profiles/public-profile.html?userId=${encodeURIComponent(req.userId)}`
    });

    created(res, { message: 'Followed successfully.' });
  } catch (error) {
    console.error('Follow error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to follow user.');
  }
});

// ─── UNFOLLOW ───
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 400, 'VALIDATION', 'Invalid user id.');
    }

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

    const conn = connection;
    const connectionStatus = conn ? conn.status : null;
    // Normalize legacy relation field for older clients
    let relation = 'none';
    if (connectionStatus === 'active') relation = 'accepted';
    else if (connectionStatus === 'pending') relation = 'pending';

    ok(res, { isFollowing: !!conn, connectionStatus, relation });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to check follow status.');
  }
});

// ─── GET FOLLOWERS ───
router.get('/followers/:userId', optionalAuth, async (req, res) => {
  try {
    let where = { followingId: req.params.userId, status: 'active' };
    
    // Filter out blocked users if authenticated
    if (req.userId) {
      const blockedIds = await getBlockedUserIds(req.userId);
      if (blockedIds.length > 0) {
        where.followerId = { [Op.notIn]: blockedIds };
      }
    }

    const connections = await Connection.findAll({
      where,
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport']
      }]
    });

    const followers = connections.map(c => c.follower);
    ok(res, sanitizeUserList(req.user || null, followers));
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch followers.');
  }
});

// ─── GET FOLLOWING ───
router.get('/following/:userId', optionalAuth, async (req, res) => {
  try {
    let where = { followerId: req.params.userId, status: 'active' };
    
    // Filter out blocked users if authenticated
    if (req.userId) {
      const blockedIds = await getBlockedUserIds(req.userId);
      if (blockedIds.length > 0) {
        where.followingId = { [Op.notIn]: blockedIds };
      }
    }

    const connections = await Connection.findAll({
      where,
      include: [{
        model: User,
        as: 'followedUser',
        attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport']
      }]
    });

    const following = connections.map(c => c.followedUser);
    ok(res, sanitizeUserList(req.user || null, following));
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

    ok(res, {
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      postsCount: user.postsCount || 0
    });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch stats.');
  }
});

module.exports = router;
