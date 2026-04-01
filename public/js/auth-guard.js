(function () {
  'use strict';

  function getToken() {
    return (
      localStorage.getItem('spopeer_token') ||
      localStorage.getItem('token')
    );
  }

  function isLoggedIn() {
    return !!getToken();
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
