/**
 * SpopeerSession — single source of truth for client-side session state.
 * Replaces duplicated isLoggedIn/getUser/setUser across api.js, auth.js,
 * auth-guard.js, and navigation.js.
 */
(function () {
  'use strict';

  var STORAGE_USER_KEY = 'spopeer_user';
  var STORAGE_LOGGED_IN_KEY = 'spopeer_loggedIn';

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function isLoggedIn() {
    return localStorage.getItem(STORAGE_LOGGED_IN_KEY) === 'true' && !!getUser();
  }

  function setUser(user) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem(STORAGE_LOGGED_IN_KEY, 'true');
  }

  function clear() {
    ['spopeer_user', 'spopeer_loggedIn', 'user', '_profileLastUpdated_'].forEach(function (key) {
      localStorage.removeItem(key);
    });
  }

  /** Bootstrap session from the server via SpopeerAPI.me(). */
  async function bootstrap() {
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.me !== 'function') return null;
    try {
      var result = await window.SpopeerAPI.me();
      var user = (result && result.data && result.data.user) || (result && result.user) || null;
      if (user) setUser(user);
      return user;
    } catch (_) {
      return null;
    }
  }

  window.SpopeerSession = {
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    setUser: setUser,
    clear: clear,
    bootstrap: bootstrap
  };
})();
