// Updated
/**
 * Groups Routes
 * GET    /api/groups                         - List all groups (with search)
 * POST   /api/groups                         - Create a new group
 * GET    /api/groups/:id                     - Get group details
 * PATCH  /api/groups/:id                     - Update group (owner/admin only)
 * POST   /api/groups/:id/join                - Join a group (or request if private)
 * DELETE /api/groups/:id/leave               - Leave a group
 * GET    /api/groups/:id/members             - Get member list
 * GET    /api/groups/:id/feed                - Group post feed
 * POST   /api/groups/:id/posts               - Create post inside group
 * POST   /api/groups/:id/invite              - Invite user to group
 * POST   /api/groups/:id/approve/:userId     - Approve join request
 * POST   /api/groups/:id/reject/:userId      - Reject join request
 * POST   /api/groups/:id/ban/:userId         - Ban member
 * DELETE /api/groups/:id/members/:userId     - Remove member
 */
const express = require('express');
const router = express.Router();
const { Group, GroupMember, User, Post, PostMedia, Like } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sanitizeString } = require('../utils/validation');
const { createNotification } = require('../services/notifications');
const { checkPost } = require('../services/contentFilter');

// All routes require auth
const { ok, created, fail } = require('../utils/response');
router.use(authenticate);

// ─── LIST GROUPS ───
router.get('/', async (req, res) => {
  try {
    const { search, sport, page = 1, limit = 20 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (sport) where.sport = sport;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: groups, count } = await Group.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
      limit: parseInt(limit),
      offset,
      order: [['memberCount', 'DESC']]
    });

    ok(res, groups, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    console.error('List groups error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch groups.');
  }
});

// ─── CREATE GROUP ───
router.post('/', async (req, res) => {
  try {
    const { name: rawName, description: rawDesc, sport: rawSport, isPrivate, privacy } = req.body;
    const name = sanitizeString(rawName, 200);
    if (!name) return fail(res, 400, 'VALIDATION', 'Group name is required.');

    const description = sanitizeString(rawDesc, 2000);
    const sport = sanitizeString(rawSport, 100);

    // Derive privacy from explicit field or legacy isPrivate flag
    let resolvedPrivacy = 'public';
    if (privacy && ['public', 'private', 'invite_only'].includes(privacy)) {
      resolvedPrivacy = privacy;
    } else if (isPrivate) {
      resolvedPrivacy = 'private';
    }

    const group = await Group.create({
      name,
      description,
      sport,
      isPrivate: resolvedPrivacy !== 'public',
      privacy: resolvedPrivacy,
      createdBy: req.userId,
      ownerId: req.userId,
      memberCount: 1
    });

    // Auto-add creator as owner member
    await GroupMember.create({
      groupId: group.id,
      userId: req.userId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date()
    });

    created(res, group);
  } catch (error) {
    console.error('Create group error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create group.');
  }
});

// ─── GET GROUP DETAILS ───
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: GroupMember, as: 'members', limit: 10, include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] }] }
      ]
    });
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    // Check if current user is a member
    const membership = await GroupMember.findOne({
      where: { groupId: group.id, userId: req.userId }
    });

    ok(res, { ...group.toJSON(), isMember: !!membership, memberRole: membership?.role });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch group.');
  }
});

// ─── JOIN GROUP ───
router.post('/:id/join', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const existing = await GroupMember.findOne({
      where: { groupId: group.id, userId: req.userId }
    });
    if (existing) {
      if (existing.status === 'banned') return fail(res, 403, 'FORBIDDEN', 'You are banned from this group.');
      if (existing.status === 'pending') return ok(res, { message: 'Join request pending approval.' });
      return fail(res, 409, 'CONFLICT', 'Already a member.');
    }

    // For private/invite_only groups, create a pending membership
    const needsApproval = group.privacy === 'private' || group.privacy === 'invite_only';
    const status = needsApproval ? 'pending' : 'active';

    await GroupMember.create({
      groupId: group.id,
      userId: req.userId,
      role: 'member',
      status,
      joinedAt: needsApproval ? null : new Date()
    });

    if (!needsApproval) await group.increment('memberCount');

    // Notify group owner/admins of join request
    if (needsApproval) {
      const admins = await GroupMember.findAll({
        where: { groupId: group.id, role: { [Op.in]: ['owner', 'admin'] }, status: 'active' },
        attributes: ['userId']
      });
      for (const admin of admins) {
        await createNotification({
          recipientId: admin.userId,
          senderId: req.userId,
          type: 'group_join_request',
          text: `Someone requested to join your group "${group.name}".`,
          href: `/pages/community/community.html?group=${group.id}`
        });
      }
    }

    ok(res, { message: needsApproval ? 'Join request sent.' : 'Joined group.', status });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to join group.');
  }
});

// ─── LEAVE GROUP ───
router.delete('/:id/leave', async (req, res) => {
  try {
    const membership = await GroupMember.findOne({
      where: { groupId: req.params.id, userId: req.userId }
    });
    if (!membership) return fail(res, 404, 'NOT_FOUND', 'Not a member.');

    await membership.destroy();

    const group = await Group.findByPk(req.params.id);
    if (group) await group.decrement('memberCount');

    ok(res, { message: 'Left group.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to leave group.');
  }
});

// ─── GET MEMBERS ───
router.get('/:id/members', async (req, res) => {
  try {
    const members = await GroupMember.findAll({
      where: { groupId: req.params.id, status: 'active' },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] }],
      order: [['createdAt', 'ASC']]
    });
    ok(res, members);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch members.');
  }
});

// ─── UPDATE GROUP (owner / admin only) ───
router.patch('/:id', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const membership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Only group admins can update this group.');
    }

    const { name, description, sport, privacy, rules, avatarUrl, coverUrl } = req.body;
    const updates = {};
    if (name) updates.name = sanitizeString(name, 200);
    if (description !== undefined) updates.description = sanitizeString(description, 2000);
    if (sport !== undefined) updates.sport = sanitizeString(sport, 100);
    if (privacy && ['public', 'private', 'invite_only'].includes(privacy)) {
      updates.privacy = privacy;
      updates.isPrivate = privacy !== 'public';
    }
    if (rules !== undefined) updates.rules = sanitizeString(rules, 5000);
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    if (coverUrl) updates.coverUrl = coverUrl;

    await group.update(updates);
    ok(res, group);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update group.');
  }
});

// ─── INVITE USER TO GROUP ───
router.post('/:id/invite', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const myMembership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
    if (!myMembership) return fail(res, 403, 'FORBIDDEN', 'Only members can invite others.');

    const { userId: targetUserId } = req.body;
    if (!targetUserId) return fail(res, 400, 'VALIDATION', 'userId is required.');

    const existing = await GroupMember.findOne({ where: { groupId: group.id, userId: targetUserId } });
    if (existing) return fail(res, 409, 'CONFLICT', 'User already has membership or invite.');

    await GroupMember.create({
      groupId: group.id,
      userId: targetUserId,
      role: 'member',
      status: 'pending',
      invitedBy: req.userId
    });

    await createNotification({
      recipientId: targetUserId,
      senderId: req.userId,
      type: 'group_invite',
      text: `You've been invited to join the group "${group.name}".`,
      href: `/pages/community/community.html?group=${group.id}`
    });

    ok(res, { message: 'Invitation sent.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to invite user.');
  }
});

// ─── APPROVE JOIN REQUEST ───
router.post('/:id/approve/:userId', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const myMembership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
    if (!myMembership || !['owner', 'admin', 'moderator'].includes(myMembership.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Only admins can approve join requests.');
    }

    const pending = await GroupMember.findOne({ where: { groupId: group.id, userId: req.params.userId, status: 'pending' } });
    if (!pending) return fail(res, 404, 'NOT_FOUND', 'No pending request found.');

    await pending.update({ status: 'active', joinedAt: new Date() });
    await group.increment('memberCount');

    await createNotification({
      recipientId: parseInt(req.params.userId),
      senderId: req.userId,
      type: 'group_join_approved',
      text: `Your request to join "${group.name}" has been approved.`,
      href: `/pages/community/community.html?group=${group.id}`
    });

    ok(res, { message: 'Request approved.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to approve request.');
  }
});

// ─── REJECT JOIN REQUEST ───
router.post('/:id/reject/:userId', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const myMembership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
    if (!myMembership || !['owner', 'admin', 'moderator'].includes(myMembership.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Only admins can reject join requests.');
    }

    const pending = await GroupMember.findOne({ where: { groupId: group.id, userId: req.params.userId, status: 'pending' } });
    if (!pending) return fail(res, 404, 'NOT_FOUND', 'No pending request found.');

    await pending.destroy();
    ok(res, { message: 'Request rejected.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to reject request.');
  }
});

// ─── BAN MEMBER ───
router.post('/:id/ban/:userId', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const myMembership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Only admins can ban members.');
    }

    const target = await GroupMember.findOne({ where: { groupId: group.id, userId: req.params.userId } });
    if (!target) return fail(res, 404, 'NOT_FOUND', 'Member not found.');
    if (target.role === 'owner') return fail(res, 403, 'FORBIDDEN', 'Cannot ban the group owner.');

    const wasActive = target.status === 'active';
    await target.update({ status: 'banned' });
    if (wasActive) await group.decrement('memberCount');

    ok(res, { message: 'Member banned.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to ban member.');
  }
});

// ─── REMOVE MEMBER ───
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const myMembership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Only admins can remove members.');
    }

    const target = await GroupMember.findOne({ where: { groupId: group.id, userId: req.params.userId } });
    if (!target) return fail(res, 404, 'NOT_FOUND', 'Member not found.');
    if (target.role === 'owner') return fail(res, 403, 'FORBIDDEN', 'Cannot remove the group owner.');

    const wasActive = target.status === 'active';
    await target.destroy();
    if (wasActive) await group.decrement('memberCount');

    ok(res, { message: 'Member removed.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to remove member.');
  }
});

// ─── GROUP FEED ───
router.get('/:id/feed', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    // Check access: public groups are readable by all, private by members only
    if (group.privacy !== 'public') {
      const membership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
      if (!membership) return fail(res, 403, 'FORBIDDEN', 'You must be a member to view this group\'s feed.');
    }

    const { page = 1, limit = 20 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * parsedLimit;

    const { rows: posts, count } = await Post.findAndCountAll({
      where: { groupId: group.id, isActive: true, status: 'active' },
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl', 'role'] },
        { model: PostMedia, as: 'postMedia', attributes: ['id', 'url', 'mediaType', 'sortOrder'], required: false }
      ],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Mark liked posts for authenticated user
    let enriched = posts.map(p => p.toJSON());
    if (req.userId) {
      const liked = await Like.findAll({ where: { userId: req.userId, postId: posts.map(p => p.id) }, attributes: ['postId'] });
      const likedSet = new Set(liked.map(l => l.postId));
      enriched = enriched.map(p => ({ ...p, liked: likedSet.has(p.id) }));
    }

    ok(res, enriched, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parsedLimit) } });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch group feed.');
  }
});

// ─── CREATE POST IN GROUP ───
router.post('/:id/posts', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Group not found.');

    const membership = await GroupMember.findOne({ where: { groupId: group.id, userId: req.userId, status: 'active' } });
    if (!membership) return fail(res, 403, 'FORBIDDEN', 'You must be an active member to post in this group.');

    const content = sanitizeString(req.body.content, 5000);
    if (!content) return fail(res, 400, 'VALIDATION', 'Post content is required.');

    const filterResult = checkPost(content);
    if (filterResult.blocked) return fail(res, 400, 'CONTENT_POLICY', filterResult.reason);

    const post = await Post.create({
      userId: req.userId,
      content,
      sport: sanitizeString(req.body.sport, 100) || group.sport || 'General',
      type: 'group_post',
      groupId: group.id,
      visibility: 'group'
    });

    const fullPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl', 'role'] },
        { model: PostMedia, as: 'postMedia', attributes: ['id', 'url', 'mediaType', 'sortOrder'], required: false }
      ]
    });

    created(res, fullPost);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to create group post.');
  }
});

module.exports = router;

