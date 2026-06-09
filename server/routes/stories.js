const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadStory, persistFile, validateUploadedFile } = require('../middleware/upload');
const { Story, User } = require('../models');
const { createNotification } = require('../services/notifications');

const { ok, created, fail } = require('../utils/response');

function isMissingStoryArchiveColumn(err) {
  const msg = String((err && err.message) || '');
  return /isArchived|is_archived/i.test(msg);
}

/**
 * GET stories feed
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const baseQuery = {
      where: {
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      attributes: [
        'id',
        'userId',
        'mediaUrl',
        'thumbnailUrl',
        'type',
        'sport',
        'caption',
        'metrics',
        'isLive',
        'isActive',
        'likesCount',
        'commentsCount',
        'viewsCount',
        'expiresAt',
        'createdAt',
        'updatedAt'
      ],
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'sport']
      }],
      order: [['createdAt', 'DESC']]
    };

    const stories = await Story.findAll(baseQuery);

    ok(res, stories);
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch stories');
  }
});

/**
 * CREATE story
 */
router.post('/', authenticate, uploadStory.single('media'), validateUploadedFile, async (req, res) => {
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

    await createNotification({
      recipientId: story.userId,
      senderId: req.userId,
      type: 'like',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} liked your photo.`,
      href: '/feed.html'
    });

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

/**
 * GET user's active stories
 */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const where = {
      userId: req.params.userId,
      isActive: true,
      isArchived: false,
      [Op.or]: [
        { expiresAt: null },
        { expiresAt: { [Op.gt]: new Date() } }
      ]
    };

    let stories;
    try {
      stories = await Story.findAll({
        where,
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        }],
        order: [['createdAt', 'DESC']]
      });
    } catch (err) {
      if (!isMissingStoryArchiveColumn(err)) {
        throw err;
      }
      delete where.isArchived;
      stories = await Story.findAll({
        where,
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        }],
        order: [['createdAt', 'DESC']]
      });
    }

    ok(res, stories);
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch user stories');
  }
});

/**
 * GET archived stories
 */
router.get('/archived/list', optionalAuth, async (req, res) => {
  try {
    let stories;
    try {
      stories = await Story.findAll({
        where: {
          isArchived: true
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        }],
        order: [['createdAt', 'DESC']],
        limit: 50
      });
    } catch (err) {
      if (!isMissingStoryArchiveColumn(err)) {
        throw err;
      }
      stories = [];
    }

    ok(res, stories);
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch archived stories');
  }
});

/**
 * AUTO-ARCHIVE: Move expired stories to archive
 * (Call this periodically from a cron job or scheduler)
 */
router.post('/maintenance/archive-expired', async (req, res) => {
  try {
    const now = new Date();
    let result;
    try {
      result = await Story.update(
        { isArchived: true, isActive: false },
        {
          where: {
            expiresAt: { [Op.lt]: now },
            isArchived: false
          }
        }
      );
    } catch (err) {
      if (!isMissingStoryArchiveColumn(err)) {
        throw err;
      }
      result = [0];
    }

    ok(res, { archivedCount: result[0] });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to archive expired stories');
  }
});

/**
 * DELETE story (only by owner or admin)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const story = await Story.findByPk(req.params.id);
    if (!story) return fail(res, 404, 'NOT_FOUND', 'Story not found');

    if (story.userId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'You cannot delete this story');
    }

    await story.destroy();
    ok(res, { message: 'Story deleted' });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete story');
  }
});

module.exports = router;
