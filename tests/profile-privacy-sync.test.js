const test = require('node:test');
const assert = require('node:assert/strict');

const { pickAllowedUpdates } = require('../server/utils/profileUtils');
const { normalizePrivacySettingsFromProfile, mapPrivacySettingsToUserUpdates } = require('../server/utils/privacySettings');

test('pickAllowedUpdates preserves media and privacy fields', () => {
  const updates = pickAllowedUpdates({
    payload: {
      bio: 'Sports profile',
      mediaLinks: { highlightVideo: 'https://youtu.be/demo' },
      visibility: { bio: 'private', dob: 'private' },
      sharingPreferences: { contact: false, messaging: true },
      profileVisibility: 'private'
    }
  });

  assert.equal(updates.bio, 'Sports profile');
  assert.deepEqual(updates.mediaLinks, { highlightVideo: 'https://youtu.be/demo' });
  assert.deepEqual(updates.visibility, { bio: 'private', dob: 'private' });
  assert.deepEqual(updates.sharingPreferences, { contact: false, messaging: true });
  assert.equal(updates.profileVisibility, 'private');
  assert.equal(updates.privacyPublic, false);
});

test('privacy settings are normalized and mapped to user updates', () => {
  const source = {
    profileVisibility: 'private',
    privacyPublic: false,
    sharingPreferences: { contact: false, messaging: true },
    visibility: { bio: 'public', dob: 'private', contactEmail: 'private' }
  };

  const normalized = normalizePrivacySettingsFromProfile(source);
  const mapped = mapPrivacySettingsToUserUpdates(source);

  assert.deepEqual(normalized, {
    profileVisibility: 'private',
    privacyPublic: false,
    messagePermission: 'followers',
    commentPermission: 'everyone',
    emailVisibility: 'private',
    phoneVisibility: 'private',
    dobVisibility: 'private',
    followersVisibility: 'public',
    followingVisibility: 'public'
  });

  assert.deepEqual(mapped, {
    profileVisibility: 'private',
    privacyPublic: false,
    sharingPreferences: { contact: false, messaging: true },
    visibility: { bio: 'public', dob: 'private', contactEmail: 'private' },
    messagePermission: 'followers',
    commentPermission: 'everyone',
    emailVisibility: 'private',
    phoneVisibility: 'private',
    dobVisibility: 'private',
    followersVisibility: 'public',
    followingVisibility: 'public'
  });
});
