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

// All routes require auth
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

    res.json({
      status: 'ok',
      payload: groups,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
});

// ─── CREATE GROUP ───
router.post('/', async (req, res) => {
  try {
    const { name, description, sport, isPrivate } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required.' });

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

    res.status(201).json({ status: 'ok', payload: group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group.' });
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
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    // Check if current user is a member
    const membership = await GroupMember.findOne({
      where: { groupId: group.id, userId: req.userId }
    });

    res.json({
      status: 'ok',
      payload: { ...group.toJSON(), isMember: !!membership, memberRole: membership?.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group.' });
  }
});

// ─── JOIN GROUP ───
router.post('/:id/join', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const existing = await GroupMember.findOne({
      where: { groupId: group.id, userId: req.userId }
    });
    if (existing) return res.status(409).json({ error: 'Already a member.' });

    await GroupMember.create({
      groupId: group.id,
      userId: req.userId,
      role: 'member'
    });

    await group.increment('memberCount');
    res.json({ status: 'ok', message: 'Joined group.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join group.' });
  }
});

// ─── LEAVE GROUP ───
router.delete('/:id/leave', async (req, res) => {
  try {
    const membership = await GroupMember.findOne({
      where: { groupId: req.params.id, userId: req.userId }
    });
    if (!membership) return res.status(404).json({ error: 'Not a member.' });

    await membership.destroy();

    const group = await Group.findByPk(req.params.id);
    if (group) await group.decrement('memberCount');

    res.json({ status: 'ok', message: 'Left group.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave group.' });
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
    res.json({ status: 'ok', payload: members });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members.' });
  }
});

module.exports = router;

