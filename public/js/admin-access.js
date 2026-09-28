// Updated
(function () {
  function getUser() {
    try {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        return window.CurrentUserStore.getCurrentUser() || {};
      }
      return {};
    } catch {
      return {};
    }
  }

  function isAdmin(user) {
    return !!(user && (user.isAdmin === true || user.role === "admin"));
  }

  function requireAdmin() {
    const loggedIn = !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
    const user = getUser();

    if (!loggedIn) {
      window.location.href = "/pages/auth/login.html";
      return;
    }

    if (!isAdmin(user)) {
      if (window.SpopeerToast) window.SpopeerToast.error("You do not have admin access.");
      window.location.href = "/feed.html";
    }
  }

  function openAdminDashboard() {
    const user = getUser();

    if (!isAdmin(user)) {
      if (window.SpopeerToast) window.SpopeerToast.error("Admin access only.");
      return;
    }

    window.location.href = "/pages/admin/dashboard.html";
  }

  window.SpopeerAdminAccess = {
    isAdmin,
    requireAdmin,
    openAdminDashboard
  };
})();
