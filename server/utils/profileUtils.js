// Updated
/**
 * Shared profile field definitions, normalizer and update picker.
 * Used by both /api/users/me (users.js) and /api/profile/me (profile.js)
 * to ensure identical field handling and response shape from both routes.
 */
const { sanitizeString } = require('./validation');

const PROFILE_STRING_FIELDS = {
  firstName: 100, lastName: 100, displayName: 150, username: 100,
  bio: 2000, role: 50, sport: 100, primarySport: 100, profession: 200,
  location: 200, nationality: 100, gender: 50,
  contactEmail: 255, contactPhone: 100, contactAddress: 500,
  playingLevel: 100, position: 100, currentTeam: 150,
  achievements: 2000, avatarUrl: 500, coverPhotoUrl: 500,
  profileVisibility: 50
};

const PROFILE_JSON_FIELDS = ['stats', 'mediaLinks', 'sharingPreferences', 'visibility', 'extendedProfile'];
const PROFILE_DATE_FIELDS = ['dateOfBirth'];
const PROFILE_BOOL_FIELDS = ['privacyPublic'];

const SYSTEM_FIELDS = new Set([
  'id', 'email', 'password', 'followersCount', 'followingCount', 'postsCount',
  'verified', 'subscription', 'isActive', 'lastLogin', 'createdAt', 'updatedAt',
  'emailVerified', 'emailVerifyToken', 'googleId', 'resetToken', 'resetExpires',
  'coverUrl', 'name'
]);

/**
 * Pick and sanitize allowed profile fields from a request body.
 * Unknown non-system fields overflow into extendedProfile JSONB.
 */
function pickAllowedUpdates(body) {
  const updates = {};
  const source = body && typeof body === 'object' ? (body.payload || body) : {};
  const knownFields = new Set();

  for (const [field, maxLen] of Object.entries(PROFILE_STRING_FIELDS)) {
    knownFields.add(field);
    if (source[field] !== undefined) {
      updates[field] = sanitizeString(String(source[field]), maxLen);
    }
  }

  for (const field of PROFILE_JSON_FIELDS) {
    knownFields.add(field);
    if (source[field] !== undefined && typeof source[field] === 'object') {
      updates[field] = source[field];
    }
  }

  for (const field of PROFILE_DATE_FIELDS) {
    knownFields.add(field);
    if (source[field] !== undefined) {
      updates[field] = source[field] || null;
    }
  }

  for (const field of PROFILE_BOOL_FIELDS) {
    knownFields.add(field);
    if (source[field] !== undefined) {
      updates[field] = !!source[field];
    }
  }

  // Normalize coverUrl alias
  knownFields.add('coverUrl');
  if (source.coverUrl !== undefined && updates.coverPhotoUrl === undefined) {
    updates.coverPhotoUrl = sanitizeString(String(source.coverUrl), 500);
  }

  // Derive privacyPublic from profileVisibility if not explicitly set
  if (updates.profileVisibility !== undefined && source.privacyPublic === undefined) {
    updates.privacyPublic = updates.profileVisibility !== 'private';
  }

  // Collect remaining unknown non-system fields into extendedProfile JSONB
  const extended = {};
  for (const key of Object.keys(source)) {
    if (!knownFields.has(key) && !SYSTEM_FIELDS.has(key)) {
      const val = source[key];
      if (val !== undefined && val !== null) {
        extended[key] = typeof val === 'string' ? sanitizeString(val, 5000) : val;
      }
    }
  }
  if (Object.keys(extended).length) {
    updates.extendedProfile = Object.assign({}, (updates.extendedProfile || {}), extended);
  }

  return updates;
}

/**
 * Return a safe, comprehensive user object for API responses.
 * Flattens extendedProfile fields to the top level for frontend compatibility.
 */
function normalizeUser(user) {
  const src = typeof user.toJSON === 'function' ? user.toJSON() : user;
  const ext = (src.extendedProfile && typeof src.extendedProfile === 'object') ? src.extendedProfile : {};

  return {
    // Core identity
    id: src.id, email: src.email,
    firstName: src.firstName, lastName: src.lastName,
    displayName: src.displayName, username: src.username,
    role: src.role, avatarUrl: src.avatarUrl, coverPhotoUrl: src.coverPhotoUrl,
    // Sport & career
    bio: src.bio, sport: src.sport, primarySport: src.primarySport,
    profession: src.profession, location: src.location,
    nationality: src.nationality, dateOfBirth: src.dateOfBirth,
    gender: src.gender, playingLevel: src.playingLevel,
    position: src.position, currentTeam: src.currentTeam, achievements: src.achievements,
    // Contact
    contactEmail: src.contactEmail, contactPhone: src.contactPhone,
    contactAddress: src.contactAddress,
    // Privacy & settings
    profileVisibility: src.profileVisibility, privacyPublic: src.privacyPublic,
    // JSON fields
    stats: src.stats || {}, mediaLinks: src.mediaLinks || {},
    sharingPreferences: src.sharingPreferences || {}, visibility: src.visibility || {},
    // Extended profile (flattened for frontend compatibility)
    extendedProfile: ext,
    ...ext,
    // Counts (keep at end so they can't be overridden by extendedProfile)
    followersCount: src.followersCount || 0,
    followingCount: src.followingCount || 0,
    postsCount: src.postsCount || 0
  };
}

module.exports = { pickAllowedUpdates, normalizeUser, PROFILE_STRING_FIELDS, SYSTEM_FIELDS };
