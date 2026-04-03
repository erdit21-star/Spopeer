/**
 * Groups Routes
 * GET    /api/groups                   - List all groups (with search)
 * POST   /api/groups                   - Create a new group
 * GET    /api/groups/:id               - Get group details
 * POST   /api/groups/:id/join          - Join a group
 * DELETE /api/groups/:id/leave         - Leave a group
 * GET    /api/groups/:id/members       - Get member list
 */
const express = require('express');
const router = express.Router();
const { Group, GroupMember, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sanitizeString } = require('../utils/validation');

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
    const { name: rawName, description: rawDesc, sport: rawSport, isPrivate } = req.body;
    const name = sanitizeString(rawName, 200);
    if (!name) return fail(res, 400, 'VALIDATION', 'Group name is required.');

    const description = sanitizeString(rawDesc, 2000);
    const sport = sanitizeString(rawSport, 100);

    const group = await Group.create({
      name,
      description,
      sport,
      isPrivate: isPrivate || false,
      createdBy: req.userId,
      memberCount: 1
    });

    // Auto-add creator as admin member
    await GroupMember.create({
      groupId: group.id,
      userId: req.userId,
      role: 'admin'
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
    if (existing) return fail(res, 409, 'CONFLICT', 'Already a member.');

    await GroupMember.create({
      groupId: group.id,
      userId: req.userId,
      role: 'member'
    });

    await group.increment('memberCount');
    ok(res, { message: 'Joined group.' });
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
      where: { groupId: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] }],
      order: [['createdAt', 'ASC']]
    });
    ok(res, members);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch members.');
  }
});

module.exports = router;

