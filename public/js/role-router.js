// Updated
(function () {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("spopeer_user") || "{}");
    } catch {
      return {};
    }
  }

  function isLoggedIn() {
    return localStorage.getItem('spopeer_loggedIn') === 'true';
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
