(function () {
  'use strict';

  function getToken() {
    return null; // Auth is cookie-based — no client-side token
  }

  function isLoggedIn() {
    return localStorage.getItem('spopeer_loggedIn') === 'true' && !!localStorage.getItem('spopeer_user');
  }

  function requireAuth(loginPath) {
    if (!loginPath) loginPath = '/pages/auth/login.html';
    if (!isLoggedIn()) {
      window.location.href = loginPath;
      return false;
    }
    return true;
  }

  window.authGuard = {
    isLoggedIn: isLoggedIn,
    requireAuth: requireAuth
  };
})();
