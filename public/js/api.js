// Updated
(function () {
  const API_BASE = (
    window.__SPOPEER_API_BASE__ ||
    localStorage.getItem("spopeer_api_base") ||
    ""
  ).replace(/\/+$/, "");

  function buildUrl(path) {
    return API_BASE ? API_BASE + path : path;
  }

  function parseStoredJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function getToken() {
    return null; // Auth is cookie-based — no client-side token
  }

  function getUser() {
    return parseStoredJson("spopeer_user") || parseStoredJson("user") || null;
  }

  function dispatchProfileUpdated(profile, source) {
    window.dispatchEvent(new CustomEvent("profileUpdated", {
      detail: {
        profile,
        timestamp: Date.now(),
        source
      }
    }));
  }

  function setUser(user, source) {
    localStorage.setItem("spopeer_user", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("spopeer_loggedIn", "true");
    localStorage.setItem("_profileLastUpdated_", Date.now().toString());
    dispatchProfileUpdated(user, source || "api-set-user");
    return user;
  }

  function clearAuthStorage() {
    [
      "spopeer_user",
      "spopeer_loggedIn",
      "user",
      "_profileLastUpdated_"
    ].forEach((key) => localStorage.removeItem(key));
  }

  async function logout() {
    try {
      await fetch(buildUrl("/api/auth/logout"), {
        method: "POST",
        credentials: "include"
      });
    } catch (_) {
      // Ignore network failure and still clear local state.
    }

    clearAuthStorage();
    try { sessionStorage.clear(); } catch (err) { console.debug('sessionStorage.clear failed during logout', err); }
    window.location.replace("/index.html");
  }

  function showNotification(message, type, duration) {
    const tone = type || "info";
    const timeout = typeof duration === "number"
      ? duration
      : (tone === "error" || tone === "warning" ? 8000 : 3000);
    const existing = document.querySelector(".api-notification");
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement("div");
    notification.className = "api-notification api-notification-" + tone;
    notification.textContent = message;
    notification.style.cssText = [
      "position:fixed",
      "top:20px",
      "right:20px",
      "max-width:360px",
      "padding:12px 18px",
      "border-radius:10px",
      "color:#fff",
      "font:600 14px/1.45 'Plus Jakarta Sans',sans-serif",
      "z-index:9999",
      "box-shadow:0 10px 28px rgba(0,0,0,.18)",
      "animation:spopeer-slide-in .2s ease"
    ].join(";");
    const colorMap = {
      success: "#16a34a",
      error: "#dc2626",
      warning: "#d97706",
      info: "#1a6bff"
    };
    notification.style.background = colorMap[tone] || colorMap.info;
    document.body.appendChild(notification);

    if (timeout > 0) {
      window.setTimeout(function () {
        notification.style.animation = "spopeer-slide-out .2s ease forwards";
        window.setTimeout(function () {
          notification.remove();
        }, 200);
      }, timeout);
    }

    return notification;
  }

  async function request(path, options) {
    const config = options || {};
    const headers = { ...(config.headers || {}) };
    const isFormData = config.body instanceof FormData;

    if (!isFormData) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    let response;
    try {
      response = await fetch(buildUrl(path), {
        ...config,
        headers,
        credentials: "include"
      });
    } catch (_networkError) {
      const err = new Error("Cannot reach the server. Check your connection and try again.");
      err.code = "NETWORK_ERROR";
      throw err;
    }

    const data = await response.json().catch(function () { return {}; });
    if (response.status === 401) {
      // Try to refresh token once before giving up
      if (!config._retried && path !== "/api/auth/refresh") {
        try {
          const refreshResp = await fetch(buildUrl("/api/auth/refresh"), {
            method: "POST",
            credentials: "include"
          });
          if (refreshResp.ok) {
            config._retried = true;
            return request(path, config);
          }
        } catch (_) { /* refresh failed */ }
      }
      // Don't clear storage here — let the caller decide (e.g. show
      // "session expired" UI vs. silently retrying on next navigation).
      const msg = (data.error && data.error.message) || data.message || data.error || "Session expired. Please log in again.";
      const err = new Error(msg);
      err.code = "UNAUTHORIZED";
      throw err;
    }
    if (!response.ok) {
      throw new Error((data.error && data.error.message) || data.message || data.error || "Request failed");
    }

    return data;
  }

  /**
   * Unwrap a backend response to get the data payload.
   * Backend may return { payload: ... }, { user: ... }, { results: ... }, or raw data.
   */
  function unwrap(data, hint) {
    if (!data || typeof data !== "object") return data;
    if (hint && data[hint] !== undefined) return data[hint];
    if (data.payload !== undefined) return data.payload;
    if (data.user !== undefined) return data.user;
    if (data.results !== undefined) return data.results;
    return data;
  }

  async function login(payloadOrEmail, password) {
    const payload = typeof payloadOrEmail === "string"
      ? { email: payloadOrEmail, password }
      : payloadOrEmail;
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    // Store user profile (not token) for UI — auth is cookie-based now
    const user = (data.data && data.data.user) || data.user;
    if (user) {
      setUser(user, "api-login");
    }
    return data;
  }

  async function signup(payload) {
    const data = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const user = (data.data && data.data.user) || data.user;
    if (user) {
      setUser(user, "api-signup");
    }
    return data;
  }

  async function me() {
    const data = await request("/api/auth/me");
    const user = (data.data && data.data.user) || data.user;
    if (user) {
      setUser(user, "api-me");
    }
    return data;
  }

  async function getProfile() {
    const data = await me();
    const user = (data.data && data.data.user) || data.user;
    if (user) {
      setUser(user, "api-profile");
    }
    return data;
  }

  async function updateProfile(payload) {
    const data = await request("/api/profiles", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const savedUser = data.payload || data.user;
    if (savedUser) {
      setUser(savedUser, "api-profile-update");
    }
    return data;
  }

  const api = {
    API_BASE,
    buildUrl,
    getToken,
    getUser,
    setUser,
    clearAuthStorage,
    logout,
    showNotification,
    request,
    isAuthenticated: function () { return localStorage.getItem("spopeer_loggedIn") === "true" && !!getUser(); },
    requireAuth: function () {
      if (!getUser()) {
        window.location.href = "/pages/auth/login.html";
      }
    },
    signup,
    login,
    me,
    getProfile,
    updateProfile,
    saveProfile: updateProfile,
    getPublicProfile: function (identifier) {
      return request("/api/profiles/" + encodeURIComponent(identifier));
    },
    getPublicProfileByEmail: function (email) {
      return request("/api/profiles/profile/" + encodeURIComponent(email));
    },
    getForYouFeed: function () { return request("/api/posts/feed/for-you"); },
    getFollowingFeed: function () { return request("/api/posts/feed/following"); },
    getSportFeed: function (sport) {
      return request("/api/posts/feed/sport" + (sport ? "?sport=" + encodeURIComponent(sport) : ""));
    },
    getTrendingFeed: function () { return request("/api/posts/feed/trending"); },
    createPost: function (payload) {
      return request("/api/posts", { method: "POST", body: JSON.stringify(payload) });
    },
    registerView: function (postId) {
      return request("/api/posts/" + encodeURIComponent(postId) + "/view", { method: "POST" });
    },
    followUser: function (userId) {
      return request("/api/follows/" + encodeURIComponent(userId), { method: "POST" });
    },
    unfollowUser: function (userId) {
      return request("/api/follows/" + encodeURIComponent(userId), { method: "DELETE" });
    },
    getFollowStatus: function (userId) {
      return request("/api/follows/status/" + encodeURIComponent(userId));
    },
    getFollowers: function (userId) {
      return request("/api/follows/followers/" + encodeURIComponent(userId));
    },
    getFollowing: function (userId) {
      return request("/api/follows/following/" + encodeURIComponent(userId));
    },
    getProfileStats: function (userId) {
      return request("/api/follows/stats/" + encodeURIComponent(userId));
    },
    listBookmarks: function () { return request("/api/bookmarks"); },
    createBookmark: function (payload) {
      return request("/api/bookmarks", { method: "POST", body: JSON.stringify(payload) });
    },
    removeBookmark: function (bookmarkId) {
      return request("/api/bookmarks/" + encodeURIComponent(bookmarkId), { method: "DELETE" });
    },
    listEvents: function () { return request("/api/events"); },
    createEvent: function (payload) {
      return request("/api/events", { method: "POST", body: JSON.stringify(payload) });
    },
    respondToEventInvite: function (eventId, status) {
      return request("/api/events/" + encodeURIComponent(eventId) + "/respond", {
        method: "POST",
        body: JSON.stringify({ status: status })
      });
    },
    adminDashboard: function () { return request("/api/admin/dashboard"); },
    unwrap: unwrap
  };

  const style = document.createElement("style");
  style.textContent = "@keyframes spopeer-slide-in{from{transform:translate3d(16px,0,0);opacity:0}to{transform:translate3d(0,0,0);opacity:1}}@keyframes spopeer-slide-out{from{transform:translate3d(0,0,0);opacity:1}to{transform:translate3d(16px,0,0);opacity:0}}";
  document.head.appendChild(style);

  window.SpopeerAPI = api;
  window.API = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();

