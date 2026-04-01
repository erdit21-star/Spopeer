const Auth = {
  tokenKey: "spopeer_token",
  userKey: "spopeer_user",

  isLoggedIn() {
    const token =
      localStorage.getItem(this.tokenKey) ||
      localStorage.getItem("token");
    return !!token;
  },

  getToken() {
    return (
      localStorage.getItem(this.tokenKey) ||
      localStorage.getItem("token")
    );
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

  login(user, token) {
    this.clearDemoSessionData();

    const normalizedUser = this.normalizeUserForSession({ ...this.getUser(), ...user });

    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    localStorage.setItem("token", token);
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
  },

  logout() {
    [
      "spopeer_token",
      "spopeer_user",
      "spopeer_loggedIn",
      "authToken",
      "token",
      "user",
      "userToken",
      "userData"
    ].forEach((key) => localStorage.removeItem(key));

    window.location.href = "/index.html";
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "/pages/auth/login.html";
    }
  },

  redirectIfLoggedInToUserApp() {
    if (this.isLoggedIn()) {
      window.location.href = "/feed.html";
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
      console.warn("[Spopeer] Backend user sync failed.", err);
      if (err.message === "UNAUTHORIZED") {
        this.logout();
      }
      return null;
    }
  }
};

window.Auth = Auth;

document.addEventListener("DOMContentLoaded", async () => {
  if (window.Auth && window.Auth.isLoggedIn()) {
    await window.Auth.syncUserFromBackend();
  }
});
