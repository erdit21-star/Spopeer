const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadPost, persistFile } = require('../middleware/upload');
const { Story, User } = require('../models');

const { ok, created, fail } = require('../utils/response');

/**
 * GET stories feed
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const stories = await Story.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'sport']
      }],
      order: [['createdAt', 'DESC']]
    });

    ok(res, stories);
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch stories');
  }
});

/**
 * CREATE story
 */
router.post('/', authenticate, uploadPost.single('media'), async (req, res) => {
  try {
    let mediaUrl;

    if (req.file) {
      const result = await persistFile(req.file, 'posts', req.userId);
      mediaUrl = result.url;
    } else {
      mediaUrl = req.body.mediaUrl;
    }

    if (!mediaUrl) {
      return fail(res, 400, 'VALIDATION', 'Story media is required');
    }

    const story = await Story.create({
      userId: req.userId,
      mediaUrl,
      thumbnailUrl: req.body.thumbnailUrl || null,
      type: req.body.type || 'image',
      sport: req.body.sport,
      caption: req.body.caption,
      metrics: req.body.metrics ? JSON.parse(req.body.metrics) : {},
      isLive: req.body.isLive === 'true' || req.body.isLive === true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    created(res, story);
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create story');
  }
});

/**
 * LIKE story
 */
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const story = await Story.findByPk(req.params.id);
    if (!story) return fail(res, 404, 'NOT_FOUND', 'Story not found');

    await story.increment('likesCount');
    await story.reload();

    ok(res, { likesCount: story.likesCount });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to like story');
  }
});

/**
 * VIEW story
 */
router.post('/:id/view', authenticate, async (req, res) => {
  try {
    const story = await Story.findByPk(req.params.id);
    if (!story) return fail(res, 404, 'NOT_FOUND', 'Story not found');

    await story.increment('viewsCount');

    ok(res);
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to register story view');
  }
});

module.exports = router;
