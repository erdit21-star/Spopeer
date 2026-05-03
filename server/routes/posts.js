// Updated
/**
 * Post Routes
 * GET    /api/posts                - List posts (feed)
 * GET    /api/posts/feed/for-you   - For-you feed
 * GET    /api/posts/feed/following  - Following feed
 * GET    /api/posts/feed/trending   - Trending feed
 * GET    /api/posts/feed/sport      - Sport-filtered feed
 * POST   /api/posts                - Create post
 * GET    /api/posts/saved          - Saved posts
 * GET    /api/posts/:id            - Get single post
 * PUT    /api/posts/:id            - Edit post
 * DELETE /api/posts/:id            - Delete post
 * POST   /api/posts/:id/like       - Toggle like
 * POST   /api/posts/:id/comment    - Add comment
 * POST   /api/posts/:id/view       - Register view
 * GET    /api/posts/:id/comments   - Get comments
 */
const express = require('express');
const router = express.Router();
const { Post, User, Like, Comment, Connection, SavedPost } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadPost, persistFile } = require('../middleware/upload');
const { Op } = require('sequelize');
const { sanitizeString, parsePagination } = require('../utils/validation');
const { createPostSchema, validate } = require('../utils/schemas');
const { cache } = require('../services/cache');
const logger = require('../utils/logger');
const { getBlockedUserIds } = require('../utils/blocks');
const supportsPostViewCount = Object.prototype.hasOwnProperty.call(Post.rawAttributes || {}, 'viewCount');

// ─── FEED HELPER ───
const { ok, created, fail } = require('../utils/response');
async function buildFeed(req, res, { whereExtra = {}, orderBy } = {}) {
  try {
    const { page, limit } = parsePagination(req.query);
    const where = { isActive: true, ...whereExtra };
    const offset = (page - 1) * limit;

    // Filter out blocked users if authenticated
    if (req.userId) {
      const blockedIds = await getBlockedUserIds(req.userId);
      if (blockedIds.length > 0) {
        where.userId = where.userId
          ? { [Op.and]: [where.userId, { [Op.notIn]: blockedIds }] }
          : { [Op.notIn]: blockedIds };
      }
    }

    const cacheKey = `feed:${JSON.stringify({ where, orderBy: orderBy || [['createdAt', 'DESC']], page, limit, userId: req.userId || null })}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return ok(res, cached.items, { pagination: cached.pagination });
    }

    const { rows: posts, count } = await Post.findAndCountAll({
      where,
      include: [{
        model: User, as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport']
      }],
      limit,
      offset,
      order: orderBy || [['createdAt', 'DESC']]
    });

    let enrichedPosts = posts.map(p => p.toJSON());
    if (req.userId) {
      const likedPostIds = await Like.findAll({
        where: { userId: req.userId, postId: posts.map(p => p.id) },
        attributes: ['postId']
      });
      const likedSet = new Set(likedPostIds.map(l => l.postId));
      enrichedPosts = enrichedPosts.map(p => ({ ...p, liked: likedSet.has(p.id) }));
    }

    const pagination = { total: count, page, pages: Math.ceil(count / limit) };
    await cache.set(cacheKey, { items: enrichedPosts, pagination }, 20 * 1000);
    ok(res, enrichedPosts, { pagination });
  } catch (error) {
    logger.error({ event: 'feed_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch feed.');
  }
}

// ─── FOR-YOU FEED ───
router.get('/feed/for-you', optionalAuth, (req, res) => buildFeed(req, res));

// ─── FOLLOWING FEED ───
router.get('/feed/following', authenticate, async (req, res) => {
  try {
    const connections = await Connection.findAll({
      where: { followerId: req.userId, status: 'active' },
      attributes: ['followingId']
    });
    const followedIds = connections.map(c => c.followingId);
    if (followedIds.length === 0) {
      return ok(res, [], { pagination: { total: 0, page: 1, pages: 0 } });
    }
    return buildFeed(req, res, { whereExtra: { userId: { [Op.in]: followedIds } } });
  } catch (error) {
    console.error('Following feed error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch following feed.');
  }
});

// ─── TRENDING FEED ───
router.get('/feed/trending', optionalAuth, (req, res) => {
  return buildFeed(req, res, { orderBy: [['likesCount', 'DESC'], ['commentsCount', 'DESC'], ['createdAt', 'DESC']] });
});

// ─── SPORT FEED ───
router.get('/feed/sport', optionalAuth, (req, res) => {
  const sport = req.query.sport;
  if (sport) {
    return buildFeed(req, res, { whereExtra: { sport: { [Op.iLike]: `%${sport}%` } } });
  }
  return buildFeed(req, res);
});

// ─── REGISTER VIEW ───
router.post('/:id/view', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }
    if (!supportsPostViewCount) {
      return ok(res, { viewCount: 0 });
    }
    await post.increment('viewCount');
    await post.reload();
    ok(res, { viewCount: post.viewCount });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to register view.');
  }
});

// ─── GET FEED (all posts) ───
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { sport, authorId, following } = req.query;
    const where = { isActive: true };

    if (sport) where.sport = sport;
    if (authorId) where.userId = authorId;

    // Following-only feed: filter posts by users the requester follows
    if (following === 'true' && req.userId) {
      const connections = await Connection.findAll({
        where: { followerId: req.userId, status: 'active' },
        attributes: ['followingId']
      });
      const followedIds = connections.map(c => c.followingId);
      where.userId = { [Op.in]: followedIds };
    }

    // Filter out blocked users if authenticated
    if (req.userId) {
      const blockedIds = await getBlockedUserIds(req.userId);
      if (blockedIds.length > 0) {
        where.userId = where.userId
          ? { [Op.and]: [where.userId, { [Op.notIn]: blockedIds }] }
          : { [Op.notIn]: blockedIds };
      }
    }

    const offset = (page - 1) * limit;
    const { rows: posts, count } = await Post.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // If user is authenticated, mark which posts they've liked
    let enrichedPosts = posts.map(p => p.toJSON());
    if (req.userId) {
      const likedPostIds = await Like.findAll({
        where: { userId: req.userId, postId: posts.map(p => p.id) },
        attributes: ['postId']
      });
      const likedSet = new Set(likedPostIds.map(l => l.postId));
      enrichedPosts = enrichedPosts.map(p => ({ ...p, liked: likedSet.has(p.id) }));
    }

    ok(res, enrichedPosts, { pagination: { total: count, page, pages: Math.ceil(count / limit) } });
  } catch (error) {
    console.error('Get posts error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch posts.');
  }
});

// ─── CREATE POST ───
router.post('/', authenticate, uploadPost.single('image'), validate(createPostSchema), async (req, res) => {
  try {
    const { content, sport } = req.body;

    const sanitizedContent = sanitizeString(content, 5000);
    if (!sanitizedContent) {
      return fail(res, 400, 'VALIDATION', 'Post content is required.');
    }

    const postData = {
      userId: req.userId,
      content: sanitizedContent,
      sport: sanitizeString(sport, 100) || req.user.sport || 'General'
    };

    if (req.file) {
      const { url } = await persistFile(req.file, 'posts', req.userId);
      postData.image = url;
    }

    const post = await Post.create(postData);
    await cache.delByPrefix('feed:');

    // Update user's post count
    await req.user.increment('postsCount');

    // Fetch with author info
    const fullPost = await Post.findByPk(post.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport'] }]
    });

    created(res, fullPost);
  } catch (error) {
    logger.error({ event: 'create_post_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Failed to create post.');
  }
});

// ─── GET SAVED POSTS FOR CURRENT USER ───
router.get('/saved', authenticate, async (req, res) => {
  try {
    const saved = await SavedPost.findAll({
      where: { userId: req.userId },
      include: [{ model: Post, as: 'post', include: [{ model: User, as: 'author', attributes: ['id','firstName','lastName','avatarUrl'] }] }],
      order: [['createdAt','DESC']]
    });

    ok(res, saved);
  } catch (error) {
    console.error('Get saved posts error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch saved posts.');
  }
});

// ─── DEBUG: LATEST POSTS ───
router.get('/debug/latest', authenticate, async (req, res) => {
  try {
    const posts = await Post.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'userId', 'content', 'sport', 'image', 'isActive', 'createdAt']
    });

    return ok(res, posts);
  } catch (error) {
    return fail(res, 500, 'SERVER_ERROR', error.message);
  }
});

// ─── GET SINGLE POST ───
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport'] }]
    });

    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    const result = post.toJSON();
    if (req.userId) {
      const liked = await Like.findOne({ where: { userId: req.userId, postId: post.id } });
      result.liked = !!liked;
    }

    ok(res, result);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch post.');
  }
});

// ─── EDIT POST ───
router.put('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    if (post.userId !== req.userId && req.user.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'You can only edit your own posts.');
    }

    const { content, sport } = req.body;
    if (content) {
      const safe = sanitizeString(content, 5000);
      if (!safe) return fail(res, 400, 'VALIDATION', 'Post content is required.');
      post.content = safe;
    }
    if (sport) post.sport = sanitizeString(sport, 100);

    await post.save();
    ok(res, post);
  } catch (error) {
    logger.error({ event: 'update_post_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Failed to update post.');
  }
});

// ─── DELETE POST ───
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    if (post.userId !== req.userId && req.user.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'You can only delete your own posts.');
    }

    await post.update({ isActive: false });
    await User.decrement('postsCount', { where: { id: post.userId } });
    await cache.delByPrefix('feed:');

    ok(res, { message: 'Post deleted.' });
  } catch (error) {
    logger.error({ event: 'delete_post_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete post.');
  }
});

// ─── TOGGLE LIKE ───
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    const existingLike = await Like.findOne({
      where: { userId: req.userId, postId: post.id }
    });

    if (existingLike) {
      await existingLike.destroy();
      await post.decrement('likesCount');
      await post.reload();
      return ok(res, { liked: false, likesCount: post.likesCount });
    }

    await Like.create({ userId: req.userId, postId: post.id });
    await post.increment('likesCount');
    await post.reload();
    ok(res, { liked: true, likesCount: post.likesCount });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to toggle like.');
  }
});

// ─── ADD COMMENT ───
router.post('/:id/comment', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return fail(res, 400, 'VALIDATION', 'Comment content is required.');
    }

    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    const comment = await Comment.create({
      userId: req.userId,
      postId: post.id,
      content: content.trim()
    });

    await post.increment('commentsCount');

    const fullComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }]
    });

    created(res, fullComment);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to add comment.');
  }
});

// ─── REPOST ───
router.post('/:id/repost', authenticate, async (req, res) => {
  try {
    const original = await Post.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }]
    });
    if (!original || !original.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    const repost = await Post.create({
      userId: req.userId,
      content: `🔁 Reposted from ${original.author.firstName} ${original.author.lastName}:\n\n${original.content}`,
      sport: original.sport,
      image: original.image
    });

    await original.increment('repostsCount');
    await req.user.increment('postsCount');

    const fullPost = await Post.findByPk(repost.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport'] }]
    });

    created(res, { payload: fullPost, repostsCount: original.repostsCount + 1 });
  } catch (error) {
    console.error('Repost error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to repost.');
  }
});

// ─── TOGGLE SAVE / BOOKMARK ───
router.post('/:id/save', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    const existing = await SavedPost.findOne({ where: { userId: req.userId, postId: post.id } });
    if (existing) {
      await existing.destroy();
      return ok(res, { saved: false });
    }

    await SavedPost.create({ userId: req.userId, postId: post.id });
    ok(res, { saved: true });
  } catch (error) {
    console.error('Toggle save error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to toggle save.');
  }
});

// ─── GET COMMENTS ───
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { postId: req.params.id },
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
      order: [['createdAt', 'ASC']]
    });

    ok(res, comments);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch comments.');
  }
});

module.exports = router;

