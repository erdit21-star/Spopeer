/**
 * Reel (Highlight) Routes
 * GET    /api/reels           - List reels
 * POST   /api/reels           - Create reel (video upload)
 * GET    /api/reels/:id       - Get single reel
 * DELETE /api/reels/:id       - Delete reel
 * POST   /api/reels/:id/like  - Toggle like on reel
 */
const express = require('express');
const router = express.Router();
const { Reel, User } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadPost } = require('../middleware/upload');

// ─── LIST REELS ───
const { ok, created, fail } = require('../utils/response');
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { sport, userId, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };

    if (sport) where.sport = sport;
    if (userId) where.userId = userId;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: reels, count } = await Reel.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, reels, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    console.error('List reels error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch reels.');
  }
});

// ─── CREATE REEL ───
router.post('/', authenticate, uploadPost.single('video'), async (req, res) => {
  try {
    const { title, description, sport, duration } = req.body;

    if (!title || title.trim().length === 0) {
      return fail(res, 400, 'VALIDATION', 'Reel title is required.');
    }
    if (!req.file) {
      return fail(res, 400, 'VALIDATION', 'Video file is required.');
    }

    const reel = await Reel.create({
      userId: req.userId,
      title: title.trim(),
      description: description ? description.trim() : null,
      videoUrl: `/uploads/posts/${req.file.filename}`,
      sport: sport || req.user.sport || 'General',
      duration: duration ? parseInt(duration) : null
    });

    const full = await Reel.findByPk(reel.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] }]
    });

    created(res, full);
  } catch (error) {
    console.error('Create reel error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create reel.');
  }
});

// ─── GET SINGLE REEL ───
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const reel = await Reel.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role', 'sport'] }]
    });

    if (!reel || !reel.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Reel not found.');
    }

    await reel.increment('viewCount');
    ok(res, reel);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch reel.');
  }
});

// ─── DELETE REEL ───
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const reel = await Reel.findByPk(req.params.id);
    if (!reel) {
      return fail(res, 404, 'NOT_FOUND', 'Reel not found.');
    }
    if (reel.userId !== req.userId && req.user.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'You can only delete your own reels.');
    }

    await reel.update({ isActive: false });
    ok(res, { message: 'Reel deleted.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete reel.');
  }
});

// ─── TOGGLE LIKE ───
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const reel = await Reel.findByPk(req.params.id);
    if (!reel || !reel.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Reel not found.');
    }

    // Reuse the Like model with a convention: postId stores reel id with negative sign
    // Better approach: just toggle likesCount on the reel directly
    const currentLikes = reel.likesCount || 0;

    // Simple toggle via query param
    if (req.query.unlike === 'true') {
      await reel.update({ likesCount: Math.max(0, currentLikes - 1) });
      return ok(res, { liked: false, likesCount: reel.likesCount });
    }

    await reel.update({ likesCount: currentLikes + 1 });
    ok(res, { liked: true, likesCount: reel.likesCount });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to toggle like.');
  }
});

module.exports = router;

