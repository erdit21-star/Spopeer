// Updated
/**
 * Media Upload Routes
 * POST   /api/media/upload        - Upload media file
 * GET    /api/media/user/:userId  - Get user's media
 * DELETE /api/media/:mediaId      - Delete media
 * PUT    /api/media/:mediaId      - Update media caption
 */
const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadPost, persistFile } = require('../middleware/upload');
const { Media } = require('../models');
const path = require('path');
const fs = require('fs/promises');

// ─── UPLOAD ───
const { ok, created, fail } = require('../utils/response');
router.post('/upload', authenticate, uploadPost.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'VALIDATION', 'No file uploaded.');
    }

    const { url, provider } = await persistFile(req.file, 'posts', req.userId);

    const mediaEntry = await Media.create({
      userId: req.userId,
      url,
      storageProvider: provider,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      caption: req.body.caption || ''
    });

    created(res, { payload: mediaEntry,
      url: mediaEntry.url });
  } catch (error) {
    console.error('Upload error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to upload file.');
  }
});

// ─── GET OWN MEDIA (authenticated shortcut) ───
router.get('/my', authenticate, async (req, res) => {
  try {
    const { type, page = 1, limit = 48 } = req.query;
    const where = { userId: req.userId };
    if (type && type !== 'all') {
      if (type === 'photo') where.mimeType = { [require('sequelize').Op.like]: 'image/%' };
      if (type === 'video') where.mimeType = { [require('sequelize').Op.like]: 'video/%' };
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Media.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    ok(res, { items: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (error) {
    console.error('Get my media error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch media.');
  }
});

// ─── GET USER MEDIA ───
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const userMedia = await Media.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    ok(res, userMedia);
  } catch (error) {
    console.error('Get media error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch media.');
  }
});

// ─── DELETE MEDIA ───
router.delete('/:mediaId', authenticate, async (req, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId);
    const entry = await Media.findByPk(mediaId);

    if (!entry) {
      return fail(res, 404, 'NOT_FOUND', 'Media not found.');
    }

    if (entry.userId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'Not authorized.');
    }

    // Remove physical file
    const filePath = path.join(__dirname, '..', entry.url);
    try {
      await fs.unlink(filePath);
    } catch (unlinkErr) {
      if (unlinkErr.code !== 'ENOENT') {
        throw unlinkErr;
      }
    }

    await entry.destroy();
    ok(res, { message: 'Media deleted.' });
  } catch (error) {
    console.error('Delete media error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete media.');
  }
});

// ─── UPDATE CAPTION ───
router.put('/:mediaId', authenticate, async (req, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId);
    const entry = await Media.findByPk(mediaId);

    if (!entry) {
      return fail(res, 404, 'NOT_FOUND', 'Media not found.');
    }

    if (entry.userId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'Not authorized.');
    }

    if (req.body.caption !== undefined) {
      await entry.update({ caption: req.body.caption });
    }

    ok(res, entry);
  } catch (error) {
    console.error('Update media error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to update media.');
  }
});

module.exports = router;
