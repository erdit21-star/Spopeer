/**
 * Centralized public-profile privacy filter.
 *
 * sanitizePublicProfile(viewer, user)
 *   - viewer: the authenticated user object (or null/undefined for anonymous)
 *   - user:   the target user (Sequelize instance or plain object)
 *
 * Returns a safe plain object with private fields stripped according to
 * the target user's visibility settings and profile-level privacy flag.
 */

// Fields that are ALWAYS safe to return on any public query
// (needed for search results, follow lists, profile previews).
const PUBLIC_CARD_FIELDS = [
  'id', 'firstName', 'lastName', 'displayName', 'username',
  'avatarUrl', 'role', 'sport', 'primarySport',
  'followersCount', 'followingCount', 'postsCount',
  'verified', 'createdAt'
];

// Additional fields returned on a full public profile view (not search/list).
const FULL_PROFILE_FIELDS = [
  ...PUBLIC_CARD_FIELDS,
  'bio', 'location', 'profession', 'nationality',
  'playingLevel', 'position', 'currentTeam', 'achievements',
  'gender', 'dateOfBirth',
  'contactEmail', 'contactPhone', 'contactAddress',
  'coverPhotoUrl', 'coverUrl',
  'profileVisibility', 'profileCardStyle',
  'mediaLinks', 'stats',
  'userType', 'subscription', 'lastLogin',
  'height', 'weight', 'eyeColor', 'hairColor',
  'trainingRoutine', 'injuryHistory', 'currentInjuries',
  'medicalHistory', 'nutritionDiet',
  'experience', 'trainingDays', 'trainingHours', 'trainingLocation',
  'coaches', 'availability',
  'highestLevel', 'upcomingEvents', 'competitionHistory', 'teamInfo'
];

// Fields that are private-by-default when no explicit visibility setting exists.
const PRIVATE_BY_DEFAULT = new Set([
  'contactEmail', 'contactPhone', 'contactAddress',
  'dateOfBirth', 'gender', 'height', 'weight',
  'medicalHistory', 'injuryHistory', 'currentInjuries',
  'nutritionDiet', 'trainingRoutine',
  'feeStructure', 'billingInfo',
  'clubEmail', 'clubPhone', 'clubAddress', 'clubBudget', 'revenueStreams'
]);

// Fields that should NEVER be returned to non-owners.
const OWNER_ONLY_FIELDS = new Set([
  'password', 'email', 'emailVerified', 'resetToken', 'resetTokenExpiry',
  'verifyToken', 'verifyTokenExpiry', 'sharingPreferences', 'visibility',
  'privacyPublic', 'extendedProfile'
]);

/**
 * Check whether a single field is visible to a public viewer.
 */
function isFieldVisible(visibilityMap, fieldName) {
  if (!visibilityMap || visibilityMap[fieldName] === undefined) {
    // No explicit setting → use default
    return !PRIVATE_BY_DEFAULT.has(fieldName);
  }
  return visibilityMap[fieldName] === 'public';
}

/**
 * Flatten extendedProfile into top-level keys (same as flattenUserPayload
 * but works on plain objects too).
 */
function flatten(obj) {
  if (obj.extendedProfile && typeof obj.extendedProfile === 'object') {
    const ext = obj.extendedProfile;
    delete obj.extendedProfile;
    return { ...ext, ...obj };
  }
  return obj;
}

/**
 * Build a PRIVATE profile stub — minimal info only.
 */
function privateStub(json) {
  return {
    id: json.id,
    firstName: json.firstName,
    lastName: json.lastName,
    displayName: json.displayName || `${json.firstName || ''} ${json.lastName || ''}`.trim() || undefined,
    avatarUrl: json.avatarUrl,
    role: json.role,
    private: true
  };
}

/**
 * Main sanitizer — call this before returning any user data to a client.
 *
 * @param {object|null} viewer   - req.user (null for anonymous visitors)
 * @param {object}      user     - Sequelize User instance or plain object
 * @param {object}      options
 * @param {'full'|'card'} options.level  - 'full' for profile page, 'card' for
 *                                          search/list/follow results (default 'full')
 * @returns {object}  sanitised plain object
 */
function sanitizePublicProfile(viewer, user, options = {}) {
  const level = options.level || 'full';
  const json = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  const flat = flatten(json);

  // Owner always sees everything (minus password)
  const isOwner = viewer && viewer.id === flat.id;
  if (isOwner) {
    delete flat.password;
    return flat;
  }

  // Profile-level privacy gate
  if (flat.privacyPublic === false || flat.profileVisibility === 'private') {
    return privateStub(flat);
  }

  // Pick allowed field set based on level
  const allowedSet = level === 'card' ? PUBLIC_CARD_FIELDS : FULL_PROFILE_FIELDS;
  const visMap = flat.visibility || {};

  const result = {};
  for (const key of allowedSet) {
    if (flat[key] === undefined) continue;
    if (OWNER_ONLY_FIELDS.has(key)) continue;

    // For full profile, apply per-field visibility.
    // For card level, the field list is already minimal so no per-field check.
    if (level === 'full' && !isFieldVisible(visMap, key)) continue;

    result[key] = flat[key];
  }

  // For full profiles, also include any remaining role-specific extended fields
  // that are not owner-only and pass visibility.
  if (level === 'full') {
    for (const key of Object.keys(flat)) {
      if (result[key] !== undefined) continue;          // already copied
      if (OWNER_ONLY_FIELDS.has(key)) continue;
      if (key === 'password') continue;
      if (allowedSet.indexOf(key) !== -1) continue;     // already handled
      if (!isFieldVisible(visMap, key)) continue;
      result[key] = flat[key];
    }
  }

  return result;
}

/**
 * Convenience: sanitize an array of users at 'card' level — for search results,
 * follow lists, etc.
 */
function sanitizeUserList(viewer, users) {
  return users.map(u => sanitizePublicProfile(viewer, u, { level: 'card' }));
}

module.exports = {
  sanitizePublicProfile,
  sanitizeUserList,
  isFieldVisible,
  PUBLIC_CARD_FIELDS,
  PRIVATE_BY_DEFAULT,
  OWNER_ONLY_FIELDS
};
