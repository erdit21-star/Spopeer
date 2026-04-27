// Updated
(function () {
  'use strict';

  function isLoggedIn() {
    if (window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function') {
      return window.CurrentUserStore.isLoggedIn();
    }
    return !!localStorage.getItem('spopeer_token');
  }

  function clearLocalAuth() {
    localStorage.removeItem('spopeer_user');
    localStorage.removeItem('spopeer_loggedIn');
    localStorage.removeItem('user');
  }

  async function requireAuth(loginPath) {
    if (!loginPath) loginPath = '/pages/auth/login.html';
    // Prefer CurrentUserStore to deduplicate /api/auth/me calls
    if (window.CurrentUserStore) {
      try {
        const user = await window.CurrentUserStore.refreshCurrentUser();
        if (user) return true;
      } catch (err) { console.debug('auth-guard: CurrentUserStore check failed', err); }
      clearLocalAuth();
      window.location.href = loginPath;
      return false;
    }
    // Guard: api.js may not yet be loaded when requireAuth is called early in a page head.
    if (!window.SpopeerAPI) {
      if (!isLoggedIn()) {
        clearLocalAuth();
        window.location.href = loginPath;
        return false;
      }
      return true;
    }
    try {
      await window.SpopeerAPI.me();
      return true;
    } catch (err) {
      console.debug('auth-guard: SpopeerAPI.me check failed', err);
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
