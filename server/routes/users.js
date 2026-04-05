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
const { User, Post, Connection, Comment, Like, Message, SavedPost, Notification, Report, Block } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadCover } = require('../middleware/upload');
const { Op } = require('sequelize');
const { sanitizeString, parsePagination } = require('../utils/validation');

// Full profile field allowlist — matches the fields the frontend collects.
// Login / /me / logout are NOT rate-limited so normal usage is never blocked.
const PROFILE_STRING_FIELDS = {
  firstName: 100, lastName: 100, displayName: 150, username: 100,
  sport: 100, primarySport: 100, profession: 200, bio: 1000, location: 200,
  gender: 50, nationality: 100, contactEmail: 255, contactPhone: 100,
  contactAddress: 500, playingLevel: 100, position: 100, currentTeam: 150,
  achievements: 2000, profileVisibility: 50, avatarUrl: 500, coverPhotoUrl: 500
};
const PROFILE_JSON_FIELDS = ['stats', 'mediaLinks', 'sharingPreferences', 'visibility'];
const PROFILE_DATE_FIELDS = ['dateOfBirth'];
const PROFILE_BOOL_FIELDS = ['privacyPublic'];

// Known columns that are NOT profile-editable — skip these in extendedProfile
const SYSTEM_FIELDS = new Set([
  'id','email','password','role','followersCount','followingCount','postsCount',
  'verified','subscription','isActive','lastLogin','createdAt','updatedAt',
  'extendedProfile','coverUrl','name'
]);

const { ok, fail } = require('../utils/response');
function pickProfileUpdates(body) {
  const updates = {};
  const knownFields = new Set();
  for (const [field, maxLen] of Object.entries(PROFILE_STRING_FIELDS)) {
    knownFields.add(field);
    if (body[field] !== undefined) {
      updates[field] = sanitizeString(String(body[field]), maxLen);
    }
  }
  for (const field of PROFILE_JSON_FIELDS) {
    knownFields.add(field);
    if (body[field] !== undefined && typeof body[field] === 'object') {
      updates[field] = body[field];
    }
  }
  for (const field of PROFILE_DATE_FIELDS) {
    knownFields.add(field);
    if (body[field] !== undefined) {
      updates[field] = body[field] || null;
    }
  }
  for (const field of PROFILE_BOOL_FIELDS) {
    knownFields.add(field);
    if (body[field] !== undefined) {
      updates[field] = !!body[field];
    }
  }
  // Normalize coverUrl alias
  knownFields.add('coverUrl');
  if (body.coverUrl !== undefined && updates.coverPhotoUrl === undefined) {
    updates.coverPhotoUrl = sanitizeString(String(body.coverUrl), 500);
  }
  // Derive privacyPublic from profileVisibility
  if (updates.profileVisibility !== undefined) {
    updates.privacyPublic = updates.profileVisibility !== 'private';
  }
  // Collect all remaining role-specific fields into extendedProfile JSONB
  const extended = {};
  for (const key of Object.keys(body)) {
    if (!knownFields.has(key) && !SYSTEM_FIELDS.has(key)) {
      const val = body[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string') {
          extended[key] = sanitizeString(val, 5000);
        } else {
          extended[key] = val;
        }
      }
    }
  }
  if (Object.keys(extended).length > 0) {
    // Merge with any existing extendedProfile (partial update, not overwrite)
    updates._extendedProfilePatch = extended;
  }
  return updates;
}

// Flatten extendedProfile into top-level for frontend compatibility
function flattenUserPayload(user) {
  const json = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  if (json.extendedProfile && typeof json.extendedProfile === 'object') {
    const ext = json.extendedProfile;
    delete json.extendedProfile;
    return { ...ext, ...json };
  }
  return json;
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

    ok(res, users, { pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit)
      } });
  } catch (error) {
    console.error('List users error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch users.');
  }
});

// ─── GET USER BY ID (or email) ───
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const param = req.params.id;
    let user;
    if (/^\d+$/.test(param)) {
      user = await User.findByPk(param, {
        attributes: { exclude: ['password'] }
      });
    } else {
      // Treat non-numeric param as email lookup
      user = await User.findOne({
        where: { email: param.toLowerCase(), isActive: true },
        attributes: { exclude: ['password'] }
      });
    }

    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    // Privacy enforcement: if profile is private, only the owner can see full details
    if (user.privacyPublic === false && (!req.user || req.user.id !== user.id)) {
      return res.json({
        status: 'ok',
        payload: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          private: true
        }
      });
    }

    ok(res, flattenUserPayload(user));
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch user.');
  }
});

// ─── UPDATE PROFILE ───
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Users can only update their own profile (admins can update anyone)
    if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'You can only update your own profile.');
    }

    const updates = pickProfileUpdates(req.body);

    // Username uniqueness check
    if (updates.username) {
      const existing = await User.findOne({ where: { username: updates.username } });
      if (existing && existing.id !== req.user.id) {
        return fail(res, 409, 'CONFLICT', 'Username is already taken.');
      }
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');

    await applyExtendedMerge(user, updates);
    await user.update(updates);

    res.json({
      status: 'ok',
      message: 'Profile updated.',
      payload: flattenUserPayload(user)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to update profile.');
  }
});

// ─── UPLOAD AVATAR ───
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'VALIDATION', 'No file uploaded.');
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await req.user.update({ avatarUrl });

    res.json({
      status: 'ok',
      message: 'Avatar uploaded.',
      avatarUrl
    });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to upload avatar.');
  }
});

// ─── UPLOAD COVER PHOTO ───
router.post('/cover', authenticate, uploadCover.single('cover'), async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, 'VALIDATION', 'No file uploaded.');
    }

    const coverPhotoUrl = `/uploads/covers/${req.file.filename}`;
    await req.user.update({ coverPhotoUrl });

    res.json({
      status: 'ok',
      message: 'Cover photo uploaded.',
      coverPhotoUrl
    });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to upload cover photo.');
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

    ok(res, flattenUserPayload(user));
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

// ─── SAVE/UPDATE PROFILE (frontend compatibility endpoint) ───
async function saveProfileHandler(req, res) {
  try {
    const profileData = req.body.payload || req.body;
    const updates = pickProfileUpdates(profileData);

    // Username uniqueness check
    if (updates.username) {
      const existing = await User.findOne({ where: { username: updates.username } });
      if (existing && existing.id !== req.user.id) {
        return fail(res, 409, 'CONFLICT', 'Username is already taken.');
      }
    }

    await applyExtendedMerge(req.user, updates);
    await req.user.update(updates);

    res.json({
      status: 'ok',
      message: 'Profile saved.',
      payload: flattenUserPayload(req.user)
    });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to save profile.');
  }
}

router.post('/', authenticate, saveProfileHandler);
router.post('/profile', authenticate, saveProfileHandler);

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

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: user.toJSON(),
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

    // Delete user-owned data in order (foreign key safety)
    await Promise.all([
      Notification.destroy({ where: { [Op.or]: [{ userId }, { actorId: userId }] } }),
      SavedPost.destroy({ where: { userId } }),
      Like.destroy({ where: { userId } }),
      Comment.destroy({ where: { userId } }),
      Report.destroy({ where: { reporterId: userId } }),
      Block.destroy({ where: { [Op.or]: [{ blockerId: userId }, { blockedId: userId }] } })
    ]);

    await Post.destroy({ where: { userId } });
    await Message.destroy({ where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] } });
    await Connection.destroy({ where: { [Op.or]: [{ followerId: userId }, { followingId: userId }] } });

    await user.destroy();

    ok(res, { message: 'Account and associated data deleted.' });
  } catch (error) {
    console.error('Account deletion error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete account.');
  }
});

module.exports = router;

