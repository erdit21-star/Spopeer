(function () {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("spopeer_user") || "{}");
    } catch {
      return {};
    }
  }

  function isAdmin(user) {
    return !!(user && (user.isAdmin === true || user.role === "admin"));
  }

  function requireAdmin() {
    const token = localStorage.getItem("spopeer_token");
    const user = getUser();

    if (!token) {
      window.location.href = "/pages/auth/login.html";
      return;
    }

    if (!isAdmin(user)) {
      alert("You do not have admin access.");
      window.location.href = "/feed.html";
    }
  }

  function openAdminDashboard() {
    const user = getUser();

    if (!isAdmin(user)) {
      alert("Admin access only.");
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
