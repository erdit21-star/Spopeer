// Updated
(function () {
  function getUser() {
    try {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        return window.CurrentUserStore.getCurrentUser() || {};
      }
    } catch (err) {
      console.debug('CurrentUserStore.getCurrentUser failed in role-router', err);
    }
    return {};
  }

  function isLoggedIn() {
    try {
      return !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
    } catch (err) {
      console.debug('CurrentUserStore.isLoggedIn failed in role-router', err);
      return false;
    }
  }

  function isAdmin(user) {
    return !!(user && (user.isAdmin === true || user.role === "admin"));
  }

  function goToUserApp() {
    window.location.href = "/feed.html";
  }

  function requireUser() {
    if (!isLoggedIn()) window.location.href = "/pages/auth/login.html";
  }

  function requireAdmin() {
    if (!isLoggedIn()) {
      window.location.href = "/pages/auth/login.html";
      return;
    }
    if (!isAdmin(getUser())) window.location.href = "/feed.html";
  }

  window.SpopeerRoleRouter = { getUser, isLoggedIn, isAdmin, goToUserApp, requireUser, requireAdmin };
})();
