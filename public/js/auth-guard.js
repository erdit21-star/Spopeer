// Updated
(function () {
  'use strict';

  function isLoggedIn() {
    return localStorage.getItem('spopeer_loggedIn') === 'true' && !!localStorage.getItem('spopeer_user');
  }

  function clearLocalAuth() {
    localStorage.removeItem('spopeer_user');
    localStorage.removeItem('spopeer_loggedIn');
    localStorage.removeItem('user');
  }

  async function requireAuth(loginPath) {
    if (!loginPath) loginPath = '/pages/auth/login.html';
    try {
      await window.SpopeerAPI.me();
      return true;
    } catch (_) {
      clearLocalAuth();
      window.location.href = loginPath;
      return false;
    }
  }

  window.authGuard = {
    isLoggedIn: isLoggedIn,
    requireAuth: requireAuth
  };
})();
