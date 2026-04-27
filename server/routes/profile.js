const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { sanitizeString } = require('../utils/validation');
const { ok, fail } = require('../utils/response');

const allowedFields = [
  'firstName',
  'lastName',
  'displayName',
  'username',
  'bio',
  'role',
  'sport',
  'primarySport',
  'location',
  'nationality',
  'dateOfBirth',
  'gender',
  'contactEmail',
  'contactPhone',
  'contactAddress',
  'playingLevel',
  'position',
  'currentTeam',
  'achievements',
  'stats',
  'avatarUrl',
  'coverPhotoUrl',
  'mediaLinks',
  'profileVisibility',
  'privacyPublic',
  'sharingPreferences',
  'visibility',
  'extendedProfile'
];

const stringFieldLimits = {
  firstName: 100,
  lastName: 100,
  displayName: 150,
  username: 100,
  bio: 2000,
  role: 50,
  sport: 100,
  primarySport: 100,
  location: 200,
  nationality: 100,
  gender: 50,
  contactEmail: 255,
  contactPhone: 100,
  contactAddress: 500,
  playingLevel: 100,
  position: 100,
  currentTeam: 150,
  achievements: 4000,
  avatarUrl: 500,
  coverPhotoUrl: 500,
  profileVisibility: 50
};

function normalizeUser(user) {
  const src = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return {
    id: src.id,
    email: src.email,
    firstName: src.firstName,
    lastName: src.lastName,
    displayName: src.displayName,
    username: src.username,
    bio: src.bio,
    role: src.role,
    sport: src.sport,
    primarySport: src.primarySport,
    location: src.location,
    nationality: src.nationality,
    dateOfBirth: src.dateOfBirth,
    gender: src.gender,
    contactEmail: src.contactEmail,
    contactPhone: src.contactPhone,
    contactAddress: src.contactAddress,
    playingLevel: src.playingLevel,
    position: src.position,
    currentTeam: src.currentTeam,
    achievements: src.achievements,
    stats: src.stats || {},
    avatarUrl: src.avatarUrl,
    coverPhotoUrl: src.coverPhotoUrl,
    mediaLinks: src.mediaLinks || {},
    profileVisibility: src.profileVisibility,
    privacyPublic: src.privacyPublic,
    sharingPreferences: src.sharingPreferences || {},
    visibility: src.visibility || {},
    extendedProfile: src.extendedProfile || {},
    followersCount: src.followersCount || 0,
    followingCount: src.followingCount || 0,
    postsCount: src.postsCount || 0
  };
}

function pickAllowedUpdates(body) {
  const updates = {};
  const source = body && typeof body === 'object' ? (body.payload || body) : {};

  for (const key of allowedFields) {
    if (source[key] === undefined) continue;
    const val = source[key];

    if (Object.prototype.hasOwnProperty.call(stringFieldLimits, key)) {
      updates[key] = sanitizeString(String(val), stringFieldLimits[key]);
      continue;
    }

    if (key === 'privacyPublic') {
      updates[key] = !!val;
      continue;
    }

    if (key === 'dateOfBirth') {
      updates[key] = val || null;
      continue;
    }

    updates[key] = val;
  }

  if (updates.profileVisibility !== undefined && source.privacyPublic === undefined) {
    updates.privacyPublic = updates.profileVisibility !== 'private';
  }

  return updates;
}

// GET /api/profile/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: { exclude: ['password'] } });
    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] get_me failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

// PATCH /api/profile/me
router.patch('/me', authenticate, async (req, res) => {
  try {
    const updates = pickAllowedUpdates(req.body);
    if (!Object.keys(updates).length) {
      return fail(res, 400, 'VALIDATION', 'No valid profile fields were provided.');
    }

    if (updates.username) {
      const existing = await User.findOne({ where: { username: updates.username } });
      if (existing && existing.id !== req.userId) {
        return fail(res, 409, 'CONFLICT', 'Username is already taken.');
      }
    }

    const user = await User.findByPk(req.userId);
    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    await user.update(updates);
    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] patch_me failed:', {
      userId: req.userId,
      path: req.originalUrl,
      method: req.method,
      message: error && error.message,
      stack: error && error.stack
    });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to update profile.');
  }
});

// GET /api/profile/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const idParam = String(req.params.id || '').trim();
    if (!idParam) {
      return fail(res, 400, 'VALIDATION', 'Profile id is required.');
    }

    let user;
    if (/^\d+$/.test(idParam)) {
      user = await User.findByPk(Number(idParam), { attributes: { exclude: ['password'] } });
    } else {
      user = await User.findOne({
        where: { username: idParam },
        attributes: { exclude: ['password'] }
      });
      if (!user) {
        user = await User.findOne({
          where: { email: idParam.toLowerCase() },
          attributes: { exclude: ['password'] }
        });
      }
    }

    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Profile not found.');
    }

    const sameUser = req.user && Number(req.user.id) === Number(user.id);
    if (!sameUser && user.privacyPublic === false) {
      return ok(res, { message: 'This profile is private.' });
    }

    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] get_by_id failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

module.exports = router;
