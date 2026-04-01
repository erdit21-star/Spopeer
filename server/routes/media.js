/**
 * Media Upload Routes
 * POST   /api/media/upload        - Upload media file
 * GET    /api/media/user/:userId  - Get user's media
 * DELETE /api/media/:mediaId      - Delete media
 * PUT    /api/media/:mediaId      - Update media caption
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadPost } = require('../middleware/upload');
const { Media } = require('../models');
const path = require('path');
const fs = require('fs');

// ─── UPLOAD ───
router.post('/upload', authenticate, uploadPost.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const mediaEntry = await Media.create({
      userId: req.userId,
      url: `/uploads/posts/${req.file.filename}`,
      storageProvider: 'local',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      caption: req.body.caption || ''
    });

    res.status(201).json({
      status: 'ok',
      payload: mediaEntry,
      url: mediaEntry.url
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file.' });
  }
});

// ─── GET USER MEDIA ───
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const userMedia = await Media.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(userMedia);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Failed to fetch media.' });
  }
});

// ─── DELETE MEDIA ───
router.delete('/:mediaId', authenticate, async (req, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId);
    const entry = await Media.findByPk(mediaId);

    if (!entry) {
      return res.status(404).json({ error: 'Media not found.' });
    }

    if (entry.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    // Remove physical file
    const filePath = path.join(__dirname, '..', entry.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await entry.destroy();
    res.json({ status: 'ok', message: 'Media deleted.' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media.' });
  }
});

// ─── UPDATE CAPTION ───
router.put('/:mediaId', authenticate, async (req, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId);
    const entry = await Media.findByPk(mediaId);

    if (!entry) {
      return res.status(404).json({ error: 'Media not found.' });
    }

    if (entry.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    if (req.body.caption !== undefined) {
      await entry.update({ caption: req.body.caption });
    }

    res.json({ status: 'ok', payload: entry });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ error: 'Failed to update media.' });
  }
});

module.exports = router;
