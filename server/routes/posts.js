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
const { Post, User, Like, Comment, Connection, SavedPost, PostMedia, PostShare, Block } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadPost, persistFile, validateUploadedFile } = require('../middleware/upload');
const { Op } = require('sequelize');
const { sanitizeString, parsePagination } = require('../utils/validation');
const { createPostSchema, validate } = require('../utils/schemas');
const { cache } = require('../services/cache');
const { createNotification } = require('../services/notifications');
const logger = require('../utils/logger');
const { getBlockedUserIds } = require('../utils/blocks');
const { checkPost, checkComment } = require('../services/contentFilter');
const supportsPostViewCount = !!(
  Post &&
  Post.rawAttributes &&
  Object.prototype.hasOwnProperty.call(Post.rawAttributes, 'viewCount')
);

// ─── FEED HELPER ───
const { ok, created, fail } = require('../utils/response');
async function buildFeed(req, res, { whereExtra = {}, orderBy } = {}) {
  try {
    const { page, limit } = parsePagination(req.query);
    const where = { isActive: true, status: 'active', ...whereExtra };
    const offset = (page - 1) * limit;

    // Visibility: public posts always show; followers-only posts only show to followers/owner
    if (!whereExtra.userId) {
      if (req.userId) {
        // authenticated: show public + followers-only (from people the user follows) + own private
        const followedConnections = await Connection.findAll({
          where: { followerId: req.userId, status: 'active' },
          attributes: ['followingId']
        });
        const followedIds = followedConnections.map(c => c.followingId);
        where[require('sequelize').Op.or] = [
          { visibility: 'public' },
          { visibility: 'followers', userId: [...followedIds, req.userId] },
          { visibility: 'private', userId: req.userId }
        ];
      } else {
        where.visibility = 'public';
      }
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

    const cacheKey = `feed:${JSON.stringify({ where, orderBy: orderBy || [['createdAt', 'DESC']], page, limit, userId: req.userId || null })}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return ok(res, cached.items, { pagination: cached.pagination });
    }

    const { rows: posts, count } = await Post.findAndCountAll({
      where,
      include: [
        {
          model: User, as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport', 'subscription']
        },
        {
          model: PostMedia, as: 'postMedia',
          attributes: ['id', 'url', 'mediaType', 'mimeType', 'width', 'height', 'duration', 'sortOrder'],
          required: false
        }
      ],
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

    // Block enforcement: blocked users cannot comment on each other's posts.
    const blockExists = await Block.findOne({
      where: {
        [Op.or]: [
          { blockerId: req.userId, blockedId: post.userId },
          { blockerId: post.userId, blockedId: req.userId }
        ]
      }
    });
    if (blockExists) {
      return fail(res, 403, 'BLOCKED', 'You cannot comment on this post.');
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
    const where = { isActive: true, status: 'active' };

    if (sport) where.sport = sport;
    if (authorId) where.userId = parseInt(authorId, 10);

    // Visibility + following filter
    if (req.userId) {
      const connections = await Connection.findAll({
        where: { followerId: req.userId, status: 'active' },
        attributes: ['followingId']
      });
      const followedIds = connections.map(c => c.followingId);
      if (following === 'true') {
        where.userId = { [Op.in]: followedIds };
      }
      // Respect post visibility for authenticated users
      if (!where[Op.or]) {
        where[Op.or] = [
          { visibility: 'public' },
          { visibility: 'followers', userId: [...followedIds, req.userId] },
          { visibility: 'private', userId: req.userId }
        ];
      }
      const blockedIds = await getBlockedUserIds(req.userId);
      if (blockedIds.length > 0) {
        where.userId = where.userId
          ? { [Op.and]: [where.userId, { [Op.notIn]: blockedIds }] }
          : { [Op.notIn]: blockedIds };
      }
    } else {
      where.visibility = 'public';
    }

    const offset = (page - 1) * limit;
    const { rows: posts, count } = await Post.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport', 'subscription']
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
router.post('/', authenticate, uploadPost.array('media', 10), validateUploadedFile, validate(createPostSchema), async (req, res) => {
  try {
    const {
      content, sport, type, pollOptions,
      visibility, groupId,
      linkUrl, linkTitle, linkDescription, linkImage,
      hashtags
    } = req.body;

    const sanitizedContent = sanitizeString(content || '', 5000);
    if (!sanitizedContent && (!req.files || req.files.length === 0)) {
      return fail(res, 400, 'VALIDATION', 'Write text or add an image/video.');
    }

    // Content filter
    const filterResult = checkPost(sanitizedContent);
    if (filterResult.blocked) return fail(res, 400, 'CONTENT_POLICY', filterResult.reason);

    // Validate visibility
    const VALID_VIS = ['public', 'followers', 'private', 'group'];
    const resolvedVisibility = VALID_VIS.includes(visibility) ? visibility : 'public';

    // Parse hashtags: accept JSON array string or plain comma-separated
    let parsedHashtags = null;
    if (hashtags) {
      try {
        parsedHashtags = typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags;
      } catch (_) {
        parsedHashtags = String(hashtags).split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
      }
      if (!Array.isArray(parsedHashtags)) parsedHashtags = null;
      if (parsedHashtags) parsedHashtags = parsedHashtags.slice(0, 20).map(t => String(t).toLowerCase().slice(0, 60));
    }

    const postData = {
      userId: req.userId,
      content: sanitizedContent || '',
      sport: sanitizeString(sport, 100) || req.user.sport || 'General',
      visibility: resolvedVisibility,
      groupId: groupId ? parseInt(groupId, 10) : null,
      linkUrl:         linkUrl         ? sanitizeString(linkUrl,         2000) : null,
      linkTitle:       linkTitle       ? sanitizeString(linkTitle,        255) : null,
      linkDescription: linkDescription ? sanitizeString(linkDescription, 1000) : null,
      linkImage:       linkImage       ? sanitizeString(linkImage,       2000) : null,
      hashtags: parsedHashtags
    };

    const postType = type || 'post';

    if (postType === 'poll') {
      let parsedOptions = [];
      try {
        parsedOptions = typeof pollOptions === 'string'
          ? JSON.parse(pollOptions)
          : pollOptions;
      } catch (_) {
        return fail(res, 400, 'VALIDATION', 'Invalid poll options.');
      }
      parsedOptions = Array.isArray(parsedOptions)
        ? parsedOptions.map(option => sanitizeString(option, 200)).filter(Boolean)
        : [];
      if (parsedOptions.length < 2) return fail(res, 400, 'VALIDATION', 'Poll needs at least 2 options.');
      postData.type = 'poll';
      postData.pollOptions = parsedOptions;
      postData.pollVotes = parsedOptions.map(() => 0);
    } else {
      postData.type = postType;
    }

    // First file → legacy single-image field (backwards compat)
    if (req.files && req.files.length > 0) {
      const { url } = await persistFile(req.files[0], 'posts', req.userId);
      postData.image = url;
    }

    const post = await Post.create(postData);

    // Additional files → PostMedia records
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (req.files && req.files.length > 1) {
      for (const [idx, file] of req.files.slice(1).entries()) {
        if (!ALLOWED_MIME.includes(file.mimetype)) continue;
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        const { url, publicId } = await persistFile(file, 'posts', req.userId);
        await PostMedia.create({
          postId: post.id, userId: req.userId,
          url, publicId: publicId || null, mediaType,
          mimeType: file.mimetype, sizeBytes: file.size, sortOrder: idx + 1
        });
      }
    }

    await cache.delByPrefix('feed:');

    await req.user.increment('postsCount');

    const fullPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport', 'subscription'] },
        { model: PostMedia, as: 'postMedia', attributes: ['id', 'url', 'mediaType', 'sortOrder'], required: false }
      ]
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
    const blockedIds = await getBlockedUserIds(req.userId);
    const followedConnections = await Connection.findAll({
      where: { followerId: req.userId, status: 'active' },
      attributes: ['followingId']
    });
    const followedIds = followedConnections.map(c => c.followingId);

    const saved = await SavedPost.findAll({
      where: { userId: req.userId },
      include: [{
        model: Post, as: 'post',
        where: {
          isActive: true,
          status: 'active',
          [Op.or]: [
            { visibility: 'public' },
            { visibility: 'followers', userId: [...followedIds, req.userId] },
            { visibility: 'private', userId: req.userId }
          ]
        },
        required: true,
        include: [
          { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
            where: blockedIds.length ? { id: { [Op.notIn]: blockedIds } } : {},
            required: false
          },
          { model: PostMedia, as: 'postMedia', attributes: ['id', 'url', 'mediaType', 'sortOrder'], required: false }
        ]
      }],
      order: [['createdAt', 'DESC']]
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

router.post('/:id/poll/vote', authenticate, async (req, res) => {
  try {
    const { optionIndex } = req.body;

    const post = await Post.findByPk(req.params.id);

    if (!post || !post.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    if (post.type !== 'poll') {
      return fail(res, 400, 'VALIDATION', 'This post is not a poll.');
    }

    const options = post.pollOptions || [];
    const votes = post.pollVotes || options.map(() => 0);

    const index = Number(optionIndex);

    if (!Number.isInteger(index) || index < 0 || index >= options.length) {
      return fail(res, 400, 'VALIDATION', 'Invalid poll option.');
    }

    votes[index] += 1;

    await post.update({ pollVotes: votes });

    return ok(res, {
      pollOptions: options,
      pollVotes: votes
    });
  } catch (error) {
    return fail(res, 500, 'SERVER_ERROR', 'Failed to vote on poll.');
  }
});

// ─── GET SINGLE POST ───
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'displayName', 'role', 'avatarUrl', 'sport', 'subscription'] },
        { model: PostMedia, as: 'postMedia', attributes: ['id', 'url', 'mediaType', 'mimeType', 'width', 'height', 'duration', 'sortOrder'], required: false }
      ]
    });

    if (!post || !post.isActive || post.status === 'removed') {
      return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    }

    // Visibility check
    if (post.visibility !== 'public') {
      if (!req.userId) return fail(res, 403, 'FORBIDDEN', 'Post not available.');
      if (post.visibility === 'private' && post.userId !== req.userId) {
        return fail(res, 403, 'FORBIDDEN', 'Post not available.');
      }
      if (post.visibility === 'followers') {
        const isFollowing = await Connection.findOne({
          where: { followerId: req.userId, followingId: post.userId, status: 'active' }
        });
        if (!isFollowing && post.userId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'Post not available.');
      }
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

    await createNotification({
      recipientId: post.userId,
      senderId: req.userId,
      type: 'like',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} liked your ${post.image ? 'photo' : 'post'}.`,
      href: '/feed.html'
    });

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

    const filterResult = checkComment(content.trim());
    if (filterResult.blocked) return fail(res, 400, 'CONTENT_POLICY', filterResult.reason);

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

    // Notify the post owner
    await createNotification({
      recipientId: post.userId,
      senderId: req.userId,
      type: 'comment',
      text: `${req.user.displayName || [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Someone'} commented on your post.`,
      href: '/feed.html'
    });

    created(res, fullComment);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to add comment.');
  }
});

// ─── REPOST ───
router.post('/:id/repost', authenticate, async (req, res) => {
  try {
    const original = await Post.findByPk(req.params.id);
    if (!original || !original.isActive) return fail(res, 404, 'NOT_FOUND', 'Post not found.');

    const caption = sanitizeString(req.body.caption, 500) || null;

    const [, wasCreated] = await PostShare.findOrCreate({
      where: { postId: original.id, userId: req.userId, shareType: 'repost' },
      defaults: { caption }
    });

    if (wasCreated) {
      await original.increment('repostsCount');
      await original.increment('sharesCount');
      await createNotification({
        recipientId: original.userId,
        senderId: req.userId,
        type: 'repost',
        text: `${req.user.displayName || req.user.firstName || 'Someone'} reposted your post.`,
        href: '/feed.html'
      });
    }

    await original.reload();
    ok(res, { reposted: wasCreated, repostsCount: original.repostsCount, sharesCount: original.sharesCount });
  } catch (error) {
    logger.error({ event: 'repost_error', message: error.message });
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

// ─── PATCH VISIBILITY ───
router.patch('/:id/visibility', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    if (post.userId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'You can only change visibility on your own posts.');

    const allowed = ['public', 'followers', 'private', 'group'];
    const { visibility } = req.body;
    if (!allowed.includes(visibility)) return fail(res, 400, 'VALIDATION', `visibility must be one of: ${allowed.join(', ')}`);

    await post.update({ visibility });
    await cache.delByPrefix('feed:');
    ok(res, { id: post.id, visibility: post.visibility });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update visibility.');
  }
});

// ─── SHARE / REPOST (formal record) ───
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const original = await Post.findByPk(req.params.id);
    if (!original || !original.isActive) return fail(res, 404, 'NOT_FOUND', 'Post not found.');

    const shareType = req.body.shareType || 'repost';
    const allowed = ['repost', 'external_share'];
    if (!allowed.includes(shareType)) return fail(res, 400, 'VALIDATION', 'Invalid shareType.');

    const [share, wasCreated] = await PostShare.findOrCreate({
      where: { postId: original.id, userId: req.userId, shareType },
      defaults: { caption: sanitizeString(req.body.caption, 500) || null }
    });

    if (wasCreated) {
      await original.increment('sharesCount');
      await createNotification({
        recipientId: original.userId,
        senderId: req.userId,
        type: 'share',
        text: `${req.user.displayName || req.user.firstName || 'Someone'} shared your post.`,
        href: `/feed.html`
      });
    }

    await original.reload();
    ok(res, { shared: wasCreated, sharesCount: original.sharesCount });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to share post.');
  }
});

// ─── ADD MEDIA TO POST ───
router.post('/:id/media', authenticate, uploadPost.array('media', 10), async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    if (post.userId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'Not your post.');
    if (!req.files || req.files.length === 0) return fail(res, 400, 'VALIDATION', 'No files uploaded.');

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    const results = [];

    for (const [idx, file] of req.files.entries()) {
      if (!allowedMime.includes(file.mimetype)) continue;
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const { url, publicId } = await persistFile(file, 'posts', req.userId);
      const pm = await PostMedia.create({
        postId: post.id,
        userId: req.userId,
        url,
        publicId: publicId || null,
        mediaType,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        sortOrder: idx
      });
      results.push(pm);
    }

    ok(res, results);
  } catch (error) {
    logger.error({ event: 'post_media_upload_error', message: error.message });
    fail(res, 500, 'SERVER_ERROR', 'Failed to upload media.');
  }
});

// ─── DELETE MEDIA FROM POST ───
router.delete('/:id/media/:mediaId', authenticate, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post || !post.isActive) return fail(res, 404, 'NOT_FOUND', 'Post not found.');
    if (post.userId !== req.userId && req.user.role !== 'admin') return fail(res, 403, 'FORBIDDEN', 'Not your post.');

    const media = await PostMedia.findOne({ where: { id: req.params.mediaId, postId: post.id } });
    if (!media) return fail(res, 404, 'NOT_FOUND', 'Media not found.');

    await media.destroy();
    ok(res, { message: 'Media removed.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to remove media.');
  }
});

module.exports = router;

