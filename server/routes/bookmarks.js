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
const { ok, created, fail } = require('../utils/response');
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

    ok(res, saved);
  } catch (error) {
    console.error('List bookmarks error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch bookmarks.');
  }
});

// ─── CREATE BOOKMARK ───
router.post('/', authenticate, async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) {
      return fail(res, 400, 'VALIDATION', 'postId is required.');
    }

    const post = await Post.findByPk(postId);
    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    const existing = await SavedPost.findOne({ where: { userId: req.userId, postId } });
    if (existing) {
      return fail(res, 409, 'CONFLICT', 'Already bookmarked.');
    }

    const saved = await SavedPost.create({ userId: req.userId, postId });
    created(res, saved);
  } catch (error) {
    console.error('Create bookmark error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create bookmark.');
  }
});

// ─── REMOVE BOOKMARK ───
router.delete('/:bookmarkId', authenticate, async (req, res) => {
  try {
    const saved = await SavedPost.findByPk(req.params.bookmarkId);
    if (!saved) {
      return fail(res, 404, 'NOT_FOUND', 'Bookmark not found.');
    }
    if (saved.userId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'Not authorized.');
    }

    await saved.destroy();
    ok(res, { message: 'Bookmark removed.' });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to remove bookmark.');
  }
});

module.exports = router;
