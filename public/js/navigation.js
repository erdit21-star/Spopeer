(function () {
  function isLoggedIn() {
    return localStorage.getItem("spopeer_loggedIn") === "true" && !!localStorage.getItem("spopeer_user");
  }

  function getHomeUrl() {
    return isLoggedIn() ? "/feed.html" : "/index.html";
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

  function protectGuestOnlyPages() {
    if (!isLoggedIn()) return;

    var guestOnlyPaths = [
      "/index.html",
      "/pages/auth/login.html",
      "/pages/auth/login-modern.html",
      "/pages/auth/signup.html",
      "/pages/auth/forgot-password.html"
    ];

    var current = window.location.pathname;
    if (guestOnlyPaths.includes(current)) {
      window.location.href = "/feed.html";
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
