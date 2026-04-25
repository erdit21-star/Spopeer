// Updated
(function () {
  'use strict';

  function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('spopeer_user') || '{}'); }
    catch (e) { return {}; }
  }

  /** Always returns the most stable identifier: numeric id first, email fallback */
  function getStableId(userObj) {
    var u = userObj || getStoredUser();
    return String(u.id || u.userId || u.email || u.userEmail || '');
  }

  function getCurrentProfileIdentifier() {
    return getStableId();
  }

  function getAppRootPathname() {
    var path = window.location.pathname || '/';
    var pagesIndex = path.indexOf('/pages/');

    if (pagesIndex !== -1) {
      return path.slice(0, pagesIndex + 1);
    }

    var lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? '/' : path.slice(0, lastSlash + 1);
  }

  /** Build a profile URL from any page depth — always uses stable id */
  function buildProfileUrl(basePath, userObj) {
    var identifier = getStableId(userObj);
    return new URL(
      'pages/profiles/public-profile.html?userId=' + encodeURIComponent(identifier),
      window.location.origin + getAppRootPathname()
    ).toString();
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
