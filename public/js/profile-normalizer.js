(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ProfileNormalizer = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    var num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  function resolveExperience(profile) {
    var raw = profile.experience || profile.sportsYears || profile.profExperience || profile.yearsOfExperience || profile.yearsOfCoaching;
    var numeric = toNumberOrNull(raw);
    if (numeric !== null) return numeric;
    return raw || '';
  }

  function normalizeLocation(profile) {
    if (profile.location) return profile.location;
    var location = [profile.city, profile.country].filter(Boolean).join(', ').trim();
    return location;
  }

  function normalizeProfile(profile) {
    var source = profile || {};
    var next = Object.assign({}, source);

    next.primarySport = next.primarySport || next.sport || '';
    next.sport = next.sport || next.primarySport || '';

    next.playingLevel = next.playingLevel || next.sportsLevel || '';
    next.sportsLevel = next.sportsLevel || next.playingLevel || '';

    next.experience = resolveExperience(next);
    if (!next.sportsYears && typeof next.experience === 'number') {
      next.sportsYears = next.experience;
    }

    next.highestLevel = next.highestLevel || next.highestLevelAchieved || '';
    next.highestLevelAchieved = next.highestLevelAchieved || next.highestLevel || '';

    next.coaches = next.coaches || next.coachesTrainers || '';
    next.coachesTrainers = next.coachesTrainers || next.coaches || '';

    next.philosophy = next.philosophy || next.coachingPhilosophy || '';
    next.coachingPhilosophy = next.coachingPhilosophy || next.philosophy || '';

    next.education = next.education || next.coachEducation || next.profEducation || '';
    next.coachEducation = next.coachEducation || next.education || '';

    next.clubWebsite = next.clubWebsite || next.website || '';
    next.website = next.website || next.clubWebsite || '';

    next.profEmail = next.profEmail || next.contactEmail || '';
    next.clubEmail = next.clubEmail || next.contactEmail || '';

    next.location = normalizeLocation(next);

    return next;
  }

  function withProfileTimestamp(profile, timestamp) {
    var next = normalizeProfile(profile || {});
    var ts = Number(timestamp || Date.now());
    next._profileUpdatedAt = ts;
    return next;
  }

  function getProfileTimestamp(profile) {
    return Number((profile && profile._profileUpdatedAt) || 0) || 0;
  }

  function isIncomingNewer(incomingTimestamp, currentTimestamp) {
    var incoming = Number(incomingTimestamp || 0) || 0;
    var current = Number(currentTimestamp || 0) || 0;
    return incoming >= current;
  }

  function getIdentifierSet(profile) {
    if (!profile) return [];
    return [profile.id, profile.userId, profile.email, profile.userEmail]
      .filter(function (value) { return value !== null && value !== undefined && String(value).trim() !== ''; })
      .map(function (value) { return String(value).toLowerCase(); });
  }

  function matchesIdentifier(profile, targetIdentifier) {
    var target = String(targetIdentifier || '').trim().toLowerCase();
    if (!target) return false;
    return getIdentifierSet(profile).indexOf(target) !== -1;
  }

  return {
    normalizeProfile: normalizeProfile,
    normalizeLocation: normalizeLocation,
    withProfileTimestamp: withProfileTimestamp,
    getProfileTimestamp: getProfileTimestamp,
    isIncomingNewer: isIncomingNewer,
    matchesIdentifier: matchesIdentifier,
    getIdentifierSet: getIdentifierSet
  };
});
