/**
 * Forum Routes
 * GET    /api/forums              - List threads
 * POST   /api/forums              - Create thread
 * GET    /api/forums/:id          - Get thread + replies
 * POST   /api/forums/:id/replies  - Add reply
 * DELETE /api/forums/:id          - Delete thread (owner/admin)
 * DELETE /api/forums/replies/:id  - Delete reply (owner/admin)
 */
const express = require('express');
const router = express.Router();
const { Thread, Reply, User, Group } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

// ─── LIST THREADS ───
const { ok, created, fail } = require('../utils/response');
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, sport, groupId, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (category) where.category = category;
    if (sport) where.sport = sport;
    if (groupId) where.groupId = groupId;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { body: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: threads, count } = await Thread.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] },
        { model: Group, as: 'group', attributes: ['id', 'name'], required: false }
      ],
      limit: parseInt(limit),
      offset,
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']]
    });

    ok(res, threads, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    console.error('List threads error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch threads.');
  }
});

// ─── CREATE THREAD ───
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, body, category, sport, groupId } = req.body;

    if (!title || title.trim().length === 0) {
      return fail(res, 400, 'VALIDATION', 'Thread title is required.');
    }
    if (!body || body.trim().length === 0) {
      return fail(res, 400, 'VALIDATION', 'Thread body is required.');
    }

    const thread = await Thread.create({
      userId: req.userId,
      title: title.trim(),
      body: body.trim(),
      category: category || 'General',
      sport: sport || req.user.sport || null,
      groupId: groupId || null
    });

    const full = await Thread.findByPk(thread.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] }]
    });

    created(res, full);
  } catch (error) {
    console.error('Create thread error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create thread.');
  }
});

// ─── GET THREAD + REPLIES ───
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const thread = await Thread.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] },
        { model: Group, as: 'group', attributes: ['id', 'name'], required: false }
      ]
    });

    if (!thread) {
      return fail(res, 404, 'NOT_FOUND', 'Thread not found.');
    }

    // Increment view count
    await thread.increment('viewCount');

    const replies = await Reply.findAll({
      where: { threadId: thread.id },
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] }],
      order: [['createdAt', 'ASC']]
    });

    ok(res, { ...thread.toJSON(), replies });
  } catch (error) {
    console.error('Get thread error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch thread.');
  }
});

// ─── ADD REPLY ───
router.post('/:id/replies', authenticate, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || body.trim().length === 0) {
      return fail(res, 400, 'VALIDATION', 'Reply body is required.');
    }

    const thread = await Thread.findByPk(req.params.id);
    if (!thread) {
      return fail(res, 404, 'NOT_FOUND', 'Thread not found.');
    }
    if (thread.isLocked) {
      return fail(res, 403, 'FORBIDDEN', 'Thread is locked.');
    }

    const reply = await Reply.create({
      threadId: thread.id,
      userId: req.userId,
      body: body.trim()
    });

    await thread.increment('replyCount');

    const full = await Reply.findByPk(reply.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] }]
    });

    created(res, full);
  } catch (error) {
    console.error('Add reply error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to add reply.');
  }
});

// ─── DELETE THREAD ───
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const thread = await Thread.findByPk(req.params.id);
    if (!thread) {
      return fail(res, 404, 'NOT_FOUND', 'Thread not found.');
    }
    if (thread.userId !== req.userId && req.user.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'You can only delete your own threads.');
    }

    await Reply.destroy({ where: { threadId: thread.id } });
    await thread.destroy();

    ok(res, { message: 'Thread deleted.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete thread.');
  }
});

// ─── DELETE REPLY ───
router.delete('/replies/:id', authenticate, async (req, res) => {
  try {
    const reply = await Reply.findByPk(req.params.id);
    if (!reply) {
      return fail(res, 404, 'NOT_FOUND', 'Reply not found.');
    }
    if (reply.userId !== req.userId && req.user.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'You can only delete your own replies.');
    }

    const thread = await Thread.findByPk(reply.threadId);
    await reply.destroy();
    if (thread) await thread.decrement('replyCount');

    ok(res, { message: 'Reply deleted.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete reply.');
  }
});

module.exports = router;

