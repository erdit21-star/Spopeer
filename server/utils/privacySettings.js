function normalizePrivacySettingsFromProfile(profile = {}) {
  const visibility = profile.visibility && typeof profile.visibility === 'object' ? profile.visibility : {};
  const sharingPreferences = profile.sharingPreferences && typeof profile.sharingPreferences === 'object' ? profile.sharingPreferences : {};

  const profileVisibility = profile.profileVisibility || 'public';
  const privacyPublic = profile.privacyPublic !== undefined ? profile.privacyPublic : profileVisibility !== 'private';

  return {
    profileVisibility,
    privacyPublic,
    messagePermission: profile.messagePermission || (sharingPreferences.messaging ? 'followers' : 'everyone'),
    commentPermission: profile.commentPermission || (sharingPreferences.comments === false ? 'followers' : 'everyone'),
    followersVisibility: profile.followersVisibility || (visibility.followers === 'private' ? 'private' : 'public'),
    followingVisibility: profile.followingVisibility || (visibility.following === 'private' ? 'private' : 'public'),
    emailVisibility: profile.emailVisibility || (visibility.contactEmail === 'public' ? 'public' : 'private'),
    phoneVisibility: profile.phoneVisibility || (visibility.contactPhone === 'public' ? 'public' : 'private'),
    dobVisibility: profile.dobVisibility || (visibility.dob === 'public' ? 'public' : 'private')
  };
}

function mapPrivacySettingsToUserUpdates(profile = {}) {
  const normalized = normalizePrivacySettingsFromProfile(profile);
  const sharingPreferences = profile.sharingPreferences && typeof profile.sharingPreferences === 'object' && !Array.isArray(profile.sharingPreferences)
    ? profile.sharingPreferences
    : {};
  const visibility = profile.visibility && typeof profile.visibility === 'object' && !Array.isArray(profile.visibility)
    ? profile.visibility
    : {};

  return {
    ...normalized,
    sharingPreferences,
    visibility
  };
}

module.exports = {
  normalizePrivacySettingsFromProfile,
  mapPrivacySettingsToUserUpdates
};
