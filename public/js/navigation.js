// Updated
(function () {
  function isLoggedIn() {
    return localStorage.getItem("spopeer_loggedIn") === "true" && !!localStorage.getItem("spopeer_user");
  }

  function getHomeUrl() {
    return isLoggedIn() ? "/app.html" : "/index.html";
  }

  function goHome() {
    window.location.href = getHomeUrl();
  }

  function protectSignedInLinks() {
    const links = document.querySelectorAll(
      'a[href="/index.html"], a[href="index.html"], a[data-home-link]'
    );

    links.forEach(function (link) {
      link.setAttribute("href", getHomeUrl());
    });
  }

  async function protectGuestOnlyPages() {
    var guestOnlyPaths = [
      "/",
      "/index.html",
      "/pages/auth/login.html",
      "/pages/auth/signup.html",
      "/pages/auth/forgot-password.html"
    ];

    var current = window.location.pathname;
    if (!guestOnlyPaths.includes(current)) return;

    if (!window.SpopeerAPI) {
      if (isLoggedIn()) {
        window.location.href = "/app.html";
      }
      return;
    }

    try {
      await window.SpopeerAPI.me();
      window.location.href = "/app.html";
    } catch (err) {
      console.debug('navigation: guest page auth check failed', err);
      // Not authenticated: stay on guest page.
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    protectSignedInLinks();
    protectGuestOnlyPages();
  });

  window.SpopeerNavigation = {
    isLoggedIn: isLoggedIn,
    getHomeUrl: getHomeUrl,
    goHome: goHome
  };
})();
