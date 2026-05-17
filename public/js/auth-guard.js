// Updated
(function () {
  'use strict';

  function isLoggedIn() {
    if (window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function') {
      return window.CurrentUserStore.isLoggedIn();
    }
    var hasUser = !!localStorage.getItem('spopeer_user');
    return localStorage.getItem('spopeer_loggedIn') === 'true' && hasUser;
  }

  function clearLocalAuth() {
    localStorage.removeItem('spopeer_user');
    localStorage.removeItem('spopeer_loggedIn');
  }

  async function requireAuth(loginPath) {
    if (!loginPath) loginPath = '/pages/auth/login.html';
    // Prefer CurrentUserStore to deduplicate /api/auth/me calls
    if (window.CurrentUserStore) {
      try {
        const user = await window.CurrentUserStore.refreshCurrentUser();
        if (user) return true;
        // refreshCurrentUser returned null — the API call failed (expired token, network error, etc.).
        // Fall back to local state before hard-redirecting: the auto-refresh in api.js may have
        // already renewed the token, and local storage may still hold a valid user.
        if (isLoggedIn()) return true;
      } catch (err) { console.debug('auth-guard: CurrentUserStore check failed', err); }
      if (!isLoggedIn()) {
        clearLocalAuth();
        window.location.href = loginPath;
        return false;
      }
      return true;
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

  // When the browser restores a page from the back/forward cache (bfcache),
  // re-check auth so a logged-out user can never see protected pages by pressing Back.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      // Page was restored from bfcache — verify the session is still valid.
      if (!isLoggedIn()) {
        // Local auth is already cleared; redirect immediately.
        window.location.replace('/pages/auth/login.html');
        return;
      }
      // Also verify with the server in case the session expired server-side.
      if (window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
        window.SpopeerAPI.me().catch(function () {
          // api.js already attempted an auto-refresh before this error reached us.
          // Only redirect if local state is also gone — avoid false logout on transient failures.
          if (!isLoggedIn()) {
            clearLocalAuth();
            window.location.replace('/pages/auth/login.html');
          }
        });
      }
    }
  });
})();
