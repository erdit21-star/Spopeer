// Updated
/**
 * User / Profile Routes
 * GET    /api/users          - List users
 * GET    /api/users/:id      - Get user by ID
 * PUT    /api/users/:id      - Update profile
 * POST   /api/users/avatar   - Upload avatar
 * POST   /api/users/cover    - Upload cover photo
 * GET    /api/profiles/:email - Get profile by email (public)
 * POST   /api/profiles       - Save/update profile (authenticated)
 */
const express = require('express');
const router = express.Router();
const { User, Post, Connection, Comment, Like, Message, SavedPost, Notification, Report, Block, Thread, Reply, Reel, Story, Sponsorship, PasswordResetToken, Media, RefreshSession, MarketplaceAnalyticsEvent, GroupMember, ConversationParticipant, EventResponse, AdminAuditLog, Group, Event, SavedListing, Inquiry } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadCover, persistFile, validateUploadedFile, enforceFileSizeLimits } = require('../middleware/upload');
const { Op } = require('sequelize');
const { sanitizeString, parsePagination } = require('../utils/validation');
const { profileUpdateSchema, validate } = require('../utils/schemas');
const logger = require('../utils/logger');
const { pickAllowedUpdates, normalizeUser: normalizeUserUtil } = require('../utils/profileUtils');
const { mapPrivacySettingsToUserUpdates } = require('../utils/privacySettings');

const { ok, fail } = require('../utils/response');
const { sanitizePublicProfile, sanitizeUserList } = require('../utils/privacy');

function handleUploadMiddleware(uploadMiddleware) {
  return uploadMiddleware;
}

// Apply extended-profile merge before saving
async function applyExtendedMerge(user, updates) {
  if (updates._extendedProfilePatch) {
    const existing = user.extendedProfile || {};
    updates.extendedProfile = { ...existing, ...updates._extendedProfilePatch };
    delete updates._extendedProfilePatch;
  }
  return updates;
}

/**
 * Unified profile update handler.
 * Handles username uniqueness, extended profile merge, and normalization.
 */
async function updateProfileHandler(user, updates) {
  if (updates.username) {
    const existing = await User.findOne({ where: { username: updates.username } });
    if (existing && existing.id !== user.id) {
      throw new Error('Username is already taken.');
    }
  }

  const privacyUpdates = mapPrivacySettingsToUserUpdates(updates);
  const mergedUpdates = { ...updates, ...privacyUpdates };

  await applyExtendedMerge(user, mergedUpdates);
  await user.update(mergedUpdates);

  if (mergedUpdates.profileVisibility || mergedUpdates.messagePermission || mergedUpdates.commentPermission || mergedUpdates.followersVisibility || mergedUpdates.followingVisibility || mergedUpdates.emailVisibility || mergedUpdates.phoneVisibility || mergedUpdates.dobVisibility) {
    const { UserPrivacySettings } = require('../models');
    const [settings] = await UserPrivacySettings.findOrCreate({
      where: { userId: user.id },
      defaults: { userId: user.id }
    });
    await settings.update({
      profileVisibility: mergedUpdates.profileVisibility || settings.profileVisibility || 'public',
      messagePermission: mergedUpdates.messagePermission || settings.messagePermission || 'everyone',
      commentPermission: mergedUpdates.commentPermission || settings.commentPermission || 'everyone',
      followersVisibility: mergedUpdates.followersVisibility || settings.followersVisibility || 'public',
      followingVisibility: mergedUpdates.followingVisibility || settings.followingVisibility || 'public',
      emailVisibility: mergedUpdates.emailVisibility || settings.emailVisibility || 'private',
      phoneVisibility: mergedUpdates.phoneVisibility || settings.phoneVisibility || 'private',
      dobVisibility: mergedUpdates.dobVisibility || settings.dobVisibility || 'private'
    });
  }

  return normalizeUserUtil(user);
}

// ─── LIST USERS ───
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { role, sport, search } = req.query;
    const where = { isActive: true };

    if (role) where.role = sanitizeString(role, 50);
    if (sport) where.sport = sanitizeString(sport, 100);
    if (search) {
      const term = sanitizeString(search, 100);
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${term}%` } },
        { lastName: { [Op.iLike]: `%${term}%` } },
        { bio: { [Op.iLike]: `%${term}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const pagination = {
      total: count,
      page,
      pages: Math.ceil(count / limit)
    };

    ok(res, sanitizeUserList(req.user || null, users), { pagination,
      meta: { pagination }
    });
  } catch (error) {
    console.error('List users error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch users.');
  }
});

// ─── GET MY PROFILE (authenticated) ───
router.get('/me', authenticate, async (req, res) => {
  try {
    const freshUser = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!freshUser || !freshUser.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    const normalized = normalizeUserUtil(freshUser);
    ok(res, { user: normalized, payload: normalized });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

// ─── UPDATE MY PROFILE (authenticated) ───
router.put('/me', authenticate, validate(profileUpdateSchema), async (req, res) => {
  try {
    const updates = pickAllowedUpdates(req.body.payload || req.body);
    const user = await User.findByPk(req.userId);
    if (!user) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    const normalized = await updateProfileHandler(user, updates);
    ok(res, { user: normalized, payload: normalized }, { message: 'Profile updated.' });
  } catch (error) {
    logger.error({ event: 'update_my_profile_error', message: error.message });
    const code = error.message.includes('already taken') ? 'CONFLICT' : 'SERVER_ERROR';
    const status = code === 'CONFLICT' ? 409 : 500;
    fail(res, status, code, error.message || 'Failed to update profile.');
  }
});

router.patch('/me', authenticate, validate(profileUpdateSchema), async (req, res) => {
  try {
    const updates = pickAllowedUpdates(req.body.payload || req.body);
    const user = await User.findByPk(req.userId);
    if (!user) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    const normalized = await updateProfileHandler(user, updates);
    ok(res, { user: normalized, payload: normalized }, { message: 'Profile updated.' });
  } catch (error) {
    logger.error({ event: 'patch_my_profile_error', message: error.message });
    const code = error.message.includes('already taken') ? 'CONFLICT' : 'SERVER_ERROR';
    const status = code === 'CONFLICT' ? 409 : 500;
    fail(res, status, code, error.message || 'Failed to update profile.');
  }
});

// ─── GET PROFILE BY EMAIL (public, for frontend compatibility) ───
router.get('/profile/:email', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { email: req.params.email.toLowerCase(), isActive: true },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return fail(res, 404, 'NOT_FOUND', 'Profile not found.');
    }

    ok(res, sanitizePublicProfile(req.user || null, user, { level: 'full' }));
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

// ─── GET USER BY ID (or email) ───
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const param = req.params.id;
    let user;
    if (/^\d+$/.test(param)) {
      user = await User.findByPk(param, {
        attributes: { exclude: ['password', 'passwordHash'] }
      });
    } else {
      // Treat non-numeric param as email lookup
      user = await User.findOne({
        where: { email: param.toLowerCase(), isActive: true },
        attributes: { exclude: ['password', 'passwordHash'] }
      });
    }

    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    const payload = (typeof user.toJSON === 'function') ? user.toJSON() : { ...user };
    delete payload.password;
    delete payload.passwordHash;
    if (payload.role && !payload.userType) payload.userType = payload.role;

    ok(res, payload);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch user.');
  }
});

// ─── UPDATE PROFILE ───
router.put('/:id', authenticate, validate(profileUpdateSchema), async (req, res) => {
  try {
    const actingUserId = Number(req.userId || (req.user && req.user.id));
    const actingRole = (req.user && req.user.role) || '';

    // Users can only update their own profile (admins can update anyone)
    if (actingUserId !== parseInt(req.params.id, 10) && actingRole !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'You can only update your own profile.');
    }

    const updates = pickAllowedUpdates(req.body);
    const user = await User.findByPk(req.params.id);
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');

    const normalized = await updateProfileHandler(user, updates);
    ok(res, { payload: normalized }, { message: 'Profile updated.' });
  } catch (error) {
    logger.error({ event: 'update_profile_error', message: error.message });
    const code = error.message.includes('already taken') ? 'CONFLICT' : 'SERVER_ERROR';
    const status = code === 'CONFLICT' ? 409 : 500;
    fail(res, status, code, error.message || 'Failed to update profile.');
  }
});

// ─── UPLOAD AVATAR ───
router.post('/avatar', authenticate, handleUploadMiddleware(uploadAvatar.single('avatar')), validateUploadedFile, enforceFileSizeLimits, async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'VALIDATION', 'No file uploaded.');
    }

    const { url: avatarUrl } = await persistFile(req.file, 'avatars', req.userId);
    await req.user.update({ avatarUrl });

    ok(res, { avatarUrl }, { message: 'Avatar uploaded.' });
  } catch (error) {
    logger.error({
      event: 'avatar_upload_error',
      message: error.message,
      stack: error.stack,
      userId: req.userId
    });
    if (error.code === 'CLOUDINARY_NOT_CONFIGURED') {
      return fail(res, 500, 'CLOUDINARY_NOT_CONFIGURED', 'Cloud storage is not configured for uploads.');
    }
    fail(res, 500, 'SERVER_ERROR', 'Failed to upload avatar.');
  }
});

// ─── UPLOAD COVER PHOTO ───
router.post('/cover', authenticate, handleUploadMiddleware(uploadCover.single('cover')), validateUploadedFile, enforceFileSizeLimits, async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'VALIDATION', 'No file uploaded.');
    }

    const { url: coverPhotoUrl } = await persistFile(req.file, 'covers', req.userId);
    await req.user.update({ coverPhotoUrl });

    ok(res, { coverPhotoUrl }, { message: 'Cover photo uploaded.' });
  } catch (error) {
    if (error.code === 'CLOUDINARY_NOT_CONFIGURED') {
      return fail(res, 500, 'CLOUDINARY_NOT_CONFIGURED', 'Cloud storage is not configured for uploads.');
    }
    fail(res, 500, 'SERVER_ERROR', 'Failed to upload cover photo.');
  }
});

// ─── SAVE/UPDATE PROFILE (frontend compatibility endpoint) ───
async function saveProfileHandler(req, res) {
  try {
    const profileData = req.body.payload || req.body;
    const updates = pickAllowedUpdates(profileData);
    const normalized = await updateProfileHandler(req.user, updates);
    ok(res, { payload: normalized }, { message: 'Profile saved.' });
  } catch (error) {
    logger.error({ event: 'save_profile_error', message: error.message });
    const code = error.message.includes('already taken') ? 'CONFLICT' : 'SERVER_ERROR';
    const status = code === 'CONFLICT' ? 409 : 500;
    fail(res, status, code, error.message || 'Failed to save profile.');
  }
}

router.post('/', authenticate, validate(profileUpdateSchema), saveProfileHandler);
router.post('/profile', authenticate, validate(profileUpdateSchema), saveProfileHandler);

// ─── DATA EXPORT (GDPR / privacy) ───
router.post('/me/export', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');

    const [posts, connections, comments, likes, messages, savedPosts] = await Promise.all([
      Post.findAll({ where: { userId }, raw: true }),
      Connection.findAll({ where: { [Op.or]: [{ followerId: userId }, { followingId: userId }] }, raw: true }),
      Comment.findAll({ where: { userId }, raw: true }),
      Like.findAll({ where: { userId }, raw: true }),
      Message.findAll({ where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] }, raw: true }),
      SavedPost.findAll({ where: { userId }, raw: true })
    ]);

    // Curate user account fields for GDPR export
    const exportData = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        sport: user.sport,
        bio: user.bio,
        location: user.location,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl
      },
      posts,
      connections,
      comments,
      likes,
      messages,
      savedPosts
    };

    res.setHeader('Content-Disposition', 'attachment; filename="spopeer-data-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error) {
    console.error('Data export error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to export data.');
  }
});

// ─── DELETE ACCOUNT (GDPR / privacy) ───
router.delete('/me', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');

    // Phase 1: Delete direct user references (non-cascade dependencies)
    await Promise.all([
      Notification.destroy({ where: { [Op.or]: [{ userId }, { actorId: userId }] } }),
      SavedPost.destroy({ where: { userId } }),
      SavedListing.destroy({ where: { userId } }),
      Like.destroy({ where: { userId } }),
      Comment.destroy({ where: { userId } }),
      Report.destroy({ where: { reporterId: userId } }),
      Block.destroy({ where: { [Op.or]: [{ blockerId: userId }, { blockedId: userId }] } }),
      Message.destroy({ where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] } }),
      Connection.destroy({ where: { [Op.or]: [{ followerId: userId }, { followingId: userId }] } }),
      PasswordResetToken.destroy({ where: { userId } }),
      RefreshSession.destroy({ where: { userId } }),
      MarketplaceAnalyticsEvent.destroy({ where: { userId } }),
      GroupMember.destroy({ where: { userId } }),
      ConversationParticipant.destroy({ where: { userId } }),
      EventResponse.destroy({ where: { userId } }),
      AdminAuditLog.destroy({ where: { [Op.or]: [{ userId }, { actorId: userId }] } })
    ]);

    // Phase 2: Delete user-created content
    await Promise.all([
      Post.destroy({ where: { userId } }),
      Thread.destroy({ where: { userId } }),
      Reply.destroy({ where: { userId } }),
      Reel.destroy({ where: { userId } }),
      Story.destroy({ where: { userId } }),
      Sponsorship.destroy({ where: { userId } }),
      Media.destroy({ where: { userId } }),
      Group.destroy({ where: { createdBy: userId } }),
      Event.destroy({ where: { createdBy: userId } }),
      Inquiry.destroy({ where: { userId } })
    ]);

    // Phase 3: Delete user account
    await user.destroy();

    ok(res, { message: 'Account and all associated data permanently deleted per GDPR right to erasure.' });
  } catch (error) {
    console.error('Account deletion error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete account.');
  }
});

module.exports = router;

