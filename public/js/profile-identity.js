// Updated
(function () {
  'use strict';

  function getStoredUser() {
    try {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        return window.CurrentUserStore.getCurrentUser() || {};
      }
      return JSON.parse(localStorage.getItem('spopeer_user') || '{}');
    } catch (e) { return {}; }
  }

  /** Always returns the most stable identifier: numeric id first, email fallback */
  function getStableId(userObj) {
    var u = userObj || getStoredUser();
    return String(u.id || u.userId || u.email || u.userEmail || '');
  }

  function getCurrentProfileIdentifier() {
    return getStableId();
  }

  /** Build a profile URL from any page depth — always uses stable id */
  function buildProfileUrl(basePath, userObj) {
    var identifier = getStableId(userObj);
    return (basePath || '') + 'pages/profiles/public-profile.html?userId=' + encodeURIComponent(identifier);
  }

  function buildOwnProfileUrl(basePath) {
    return buildProfileUrl(basePath);
  }

  function matchesCurrentUser(profileIdentifier) {
    var user = getStoredUser();
    var id = String(profileIdentifier || '');
    if (!id) return false;
    var userId = String(user.id || user.userId || '');
    var userEmail = String(user.email || user.userEmail || '').toLowerCase();
    return (userId && id === userId) || (userEmail && id.toLowerCase() === userEmail);
  }

  window.SpopeerProfileIdentity = {
    getStoredUser: getStoredUser,
    getStableId: getStableId,
    getCurrentProfileIdentifier: getCurrentProfileIdentifier,
    buildProfileUrl: buildProfileUrl,
    buildOwnProfileUrl: buildOwnProfileUrl,
    matchesCurrentUser: matchesCurrentUser
  };
})();
