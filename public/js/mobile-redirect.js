(function () {
  // Do not redirect if already on mobile app
  if (window.location.pathname.includes("mobile.html")) return;

  // Detect mobile device
  const isMobile =
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768;

  if (isMobile) {
    window.location.href = "/mobile.html";
  }
})();
