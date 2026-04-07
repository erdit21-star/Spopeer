// Updated
const Auth = {
  tokenKey: "spopeer_token",
  userKey: "spopeer_user",

  isLoggedIn() {
    return localStorage.getItem("spopeer_loggedIn") === "true" && !!localStorage.getItem(this.userKey);
  },

  getToken() {
    return null; // Auth is now cookie-based — no client-side token
  },

  getUser() {
    try {
      const raw =
        localStorage.getItem(this.userKey) ||
        localStorage.getItem("user") ||
        "{}";
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  clearDemoSessionData() {
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
    this.clearDemoSessionData();

    const normalizedUser = this.normalizeUserForSession({ ...this.getUser(), ...user });

    localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("spopeer_loggedIn", "true");
    localStorage.setItem("_profileLastUpdated_", Date.now().toString());

    window.dispatchEvent(new CustomEvent("profileUpdated", {
      detail: {
        profile: normalizedUser,
        timestamp: Date.now(),
        source: "auth-login"
      }
    }));

    if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
      try { window.CurrentUserStore.setCurrentUser(normalizedUser); } catch(e) {}
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
      try { window.CurrentUserStore.clearCurrentUser(); } catch(e) {}
    }

    try {
      sessionStorage.clear();
    } catch (err) {
      console.debug('sessionStorage.clear failed during logout', err);
    }

    window.location.replace("/index.html");
  },

  async requireAuth() {
    // Guard: api.js may not yet be loaded when requireAuth is called early in a page head.
    // Fall back to localStorage optimistic check to avoid a false redirect loop.
    if (!window.SpopeerAPI) {
      if (!this.isLoggedIn()) {
        window.location.href = '/pages/auth/login.html';
      }
      return;
    }
    try {
      await window.SpopeerAPI.me();
    } catch (_) {
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
    } catch (_) {
      // Not authenticated — stay on page
    }
  },

  async syncUserFromBackend() {
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
    } catch (_) { /* best-effort */ }
  }
});
