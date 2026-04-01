/**
 * Bookmarks Routes
 * Maps frontend /api/bookmarks/... calls to the SavedPost system.
 *
 * GET    /api/bookmarks            - List user's bookmarks
 * POST   /api/bookmarks            - Create bookmark (body: { postId })
 * DELETE /api/bookmarks/:bookmarkId - Remove bookmark
 */
const express = require('express');
const router = express.Router();
const { SavedPost, Post, User } = require('../models');
const { authenticate } = require('../middleware/auth');

// ─── LIST BOOKMARKS ───
router.get('/', authenticate, async (req, res) => {
  try {
    const saved = await SavedPost.findAll({
      where: { userId: req.userId },
      include: [{
        model: Post,
        as: 'post',
        include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ status: 'ok', payload: saved });
  } catch (error) {
    console.error('List bookmarks error:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks.' });
  }
});

// ─── CREATE BOOKMARK ───
router.post('/', authenticate, async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) {
      return res.status(400).json({ error: 'postId is required.' });
    }

    const post = await Post.findByPk(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existing = await SavedPost.findOne({ where: { userId: req.userId, postId } });
    if (existing) {
      return res.status(409).json({ error: 'Already bookmarked.' });
    }

    const saved = await SavedPost.create({ userId: req.userId, postId });
    res.status(201).json({ status: 'ok', payload: saved });
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({ error: 'Failed to create bookmark.' });
  }
});

// ─── REMOVE BOOKMARK ───
router.delete('/:bookmarkId', authenticate, async (req, res) => {
  try {
    const saved = await SavedPost.findByPk(req.params.bookmarkId);
    if (!saved) {
      return res.status(404).json({ error: 'Bookmark not found.' });
    }
    if (saved.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    await saved.destroy();
    res.json({ status: 'ok', message: 'Bookmark removed.' });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ error: 'Failed to remove bookmark.' });
  }
});

module.exports = router;
