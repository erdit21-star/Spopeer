// Updated
(function () {
  function getUser() {
    try {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        return window.CurrentUserStore.getCurrentUser() || {};
      }
      return JSON.parse(localStorage.getItem("spopeer_user") || "{}");
    } catch {
      return {};
    }
  }

  function isLoggedIn() {
    if (window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function') {
      return window.CurrentUserStore.isLoggedIn();
    }
    var hasUser = !!localStorage.getItem('spopeer_user');
    return localStorage.getItem('spopeer_loggedIn') === 'true' && hasUser;
  }

  function isAdmin(user) {
    return !!(user && (user.isAdmin === true || user.role === "admin"));
  }

  function goToUserApp() {
    window.location.href = "/feed.html";
  }

  function requireUser() {
    if (!isLoggedIn()) {
      window.location.href = "/pages/auth/login.html";
    }
  }

  function requireAdmin() {
    if (!isLoggedIn()) {
      window.location.href = "/pages/auth/login.html";
      return;
    }

    const user = getUser();

    if (!isAdmin(user)) {
      window.location.href = "/feed.html";
    }
  }

  window.SpopeerRoleRouter = {
    getUser,
    isLoggedIn,
    isAdmin,
    goToUserApp,
    requireUser,
    requireAdmin
  };
})();
