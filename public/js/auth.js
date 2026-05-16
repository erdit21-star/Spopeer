// Updated
const Auth = {
  tokenKey: "spopeer_loggedIn",
  userKey: "spopeer_user",

  hasAnyAuthToken() {
    return !!(
      localStorage.getItem('spopeer_token')
      || localStorage.getItem('spopeerToken')
      || localStorage.getItem('token')
    );
  },

  hasAnyStoredUser() {
    return !!(
      localStorage.getItem('spopeer_user')
      || localStorage.getItem('spopeerUser')
      || localStorage.getItem('user')
    );
  },

  hasLocalSessionSignal() {
    return this.hasAnyStoredUser()
      || localStorage.getItem('spopeer_loggedIn') === 'true'
      || this.hasAnyAuthToken();
  },

  isLoggedIn() {
    const hasUser = this.hasAnyStoredUser();
    const hasFlag = localStorage.getItem("spopeer_loggedIn") === "true";
    return (hasFlag && hasUser) || this.hasAnyAuthToken();
  },

  getToken() {
    return null; // Auth is now cookie-based — no client-side token
  },

  getUser() {
    try {
      const raw =
        localStorage.getItem(this.userKey) ||
        localStorage.getItem("spopeerUser") ||
        localStorage.getItem("user") ||
        "{}";
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  clearSessionCacheData() {
    [
      "spopeer_user_posts",
      "spopeer_saved_posts",
      "spopeer_followed_users",
      "spopeer_viewed_24h",
      "spopeer_notifications",
      "spopeer_feed_cache",
      "spopeer_stories",
      "spopeer_drafts",
      "spopeer_reactions",
      "spopeer_bookmarks",
      "spopeer_search_history",
      "spopeer_recent_profiles"
    ].forEach((key) => localStorage.removeItem(key));

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("spopeer_profile_cache_")) {
        localStorage.removeItem(key);
      }
    });
  },

  normalizeUserForSession(user) {
    return {
      ...user,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
      followersCount: user.followersCount ?? user.followers ?? 0,
      followingCount: user.followingCount ?? user.following ?? 0,
      postsCount: user.postsCount ?? 0,
      mediaCount: user.mediaCount ?? 0
    };
  },

  login(user) {
    this.clearSessionCacheData();

    const normalizedUser = this.normalizeUserForSession({ ...this.getUser(), ...user });

    localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("spopeer_loggedIn", "true");
    localStorage.setItem('spopeer_last_auth_at', Date.now().toString());
    localStorage.setItem("_profileLastUpdated_", Date.now().toString());

    window.dispatchEvent(new CustomEvent("profileUpdated", {
      detail: {
        profile: normalizedUser,
        timestamp: Date.now(),
        source: "auth-login"
      }
    }));

    if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
      try {
        window.CurrentUserStore.setCurrentUser(normalizedUser);
      } catch (err) {
        console.debug("CurrentUserStore.setCurrentUser failed in auth login", err);
      }
    }
  },

  async logout() {
    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.logout === "function") {
        await window.SpopeerAPI.logout();
        return;
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }

    [
      "spopeer_token",
      "spopeer_last_auth_at",
      "spopeer_user",
      "spopeer_loggedIn",
      "authToken",
      "token",
      "user",
      "userToken",
      "userData",
      "_profileLastUpdated_"
    ].forEach((key) => localStorage.removeItem(key));

    if (window.CurrentUserStore && typeof window.CurrentUserStore.clearCurrentUser === 'function') {
      try {
        window.CurrentUserStore.clearCurrentUser();
      } catch (err) {
        console.debug("CurrentUserStore.clearCurrentUser failed in auth logout", err);
      }
    }

    try {
      sessionStorage.clear();
    } catch (err) {
      console.debug('sessionStorage.clear failed during logout', err);
    }

    window.location.replace("/index.html");
  },

  async requireAuth() {
    // Fast-path: if localStorage already marks us as logged in, let the page
    // render immediately (prevents white-screen on mobile while awaiting the
    // API round-trip).  A background server check will still run; if it fails
    // we clear the stale local state and redirect then.
    const locallyLoggedIn = this.isLoggedIn();

    // Guard: api.js may not yet be loaded when requireAuth is called early in a page head.
    if (!window.SpopeerAPI) {
      if (!locallyLoggedIn) {
        window.location.href = '/pages/auth/login.html';
      }
      return; // page continues rendering optimistically
    }

    // If local signals are missing, still verify once with backend before redirecting.
    // This avoids false logout bounces when storage hydration lags behind cookie auth.
    if (!locallyLoggedIn) {
      try {
        if (window.CurrentUserStore) {
          const warmUser = await window.CurrentUserStore.refreshCurrentUser();
          if (warmUser) {
            return;
          }
        } else {
          const me = await window.SpopeerAPI.me();
          if (me && (me.user || (me.data && me.data.user) || me.payload || (me.payload && me.payload.user))) {
            return;
          }
        }
      } catch (err) {
        console.debug('Auth.requireAuth initial auth probe failed', err);
      }

      if (!this.hasLocalSessionSignal()) {
        window.location.href = '/pages/auth/login.html';
      }
      return;
    }

    // Background server validation — page is already rendering at this point.
    // Only redirect if the server also rejects the session (cookie expired/invalid).
    try {
      if (window.CurrentUserStore) {
        const user = await window.CurrentUserStore.refreshCurrentUser();
        if (!user) throw new Error('not authenticated');
      } else {
        await window.SpopeerAPI.me();
      }
    } catch (err) {
      console.debug("Auth.requireAuth background check failed — session expired", err);
      const hasUser = !!(localStorage.getItem('spopeer_user') || localStorage.getItem('user'));
      if (hasUser || this.hasAnyAuthToken()) {
        // Keep the user on-page; downstream API calls can retry/refresh without login bounce.
        return;
      }
      localStorage.removeItem('spopeer_user');
      localStorage.removeItem('spopeer_loggedIn');
      localStorage.removeItem('user');
      window.location.href = "/pages/auth/login.html";
    }
  },

  async redirectIfLoggedInToUserApp() {
    if (!window.SpopeerAPI) return;
    try {
      await window.SpopeerAPI.me();
      window.location.href = "/feed.html";
    } catch (err) {
      console.debug("redirectIfLoggedInToUserApp check failed", err);
      // Not authenticated — stay on page
    }
  },

  async syncUserFromBackend() {
    // Delegate to CurrentUserStore to avoid duplicate /api/auth/me calls
    if (window.CurrentUserStore) {
      const user = await window.CurrentUserStore.refreshCurrentUser();
      return user || null;
    }

    if (!this.isLoggedIn()) return null;
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.me !== "function") {
      return null;
    }

    try {
      const data = await window.SpopeerAPI.me();
      if (data.user) {
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("spopeer_loggedIn", "true");
        return data.user;
      }

      return null;
    } catch (err) {
      if (err && err.code === 'UNAUTHORIZED') {
        localStorage.removeItem(this.userKey);
        localStorage.removeItem("user");
        localStorage.removeItem("spopeer_loggedIn");
      } else {
        console.warn("[Spopeer] Backend user sync failed.", err);
      }
      return null;
    }
  }
};

window.Auth = Auth;

document.addEventListener("DOMContentLoaded", async () => {
  if (window.Auth && window.Auth.isLoggedIn() && window.SpopeerAPI) {
    try {
      await window.Auth.syncUserFromBackend();
    } catch (err) {
      console.debug("Best-effort syncUserFromBackend failed", err);
    }
  }
});
