(function () {
  var path = String(window.location.pathname || '').toLowerCase();
  var params = new URLSearchParams(window.location.search || '');

  // Allow explicit desktop mode (useful for testing and SPA debugging).
  if (params.get('desktop') === '1' || localStorage.getItem('spopeer_force_desktop') === '1') {
    return;
  }

  // Never redirect if already on mobile endpoints.
  if (path.indexOf('/mobile') === 0 || path.indexOf('mobile.html') !== -1) {
    return;
  }

  // Detect mobile user agent or narrow screen
  var isMobileUa = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent || '');
  var isNarrowScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  var isMobileUser = isMobileUa || isNarrowScreen;

  // Redirect from desktop feed to mobile feed
  if (isMobileUser && path === '/feed.html') {
    window.location.replace('/mobile.html');
    return;
  }

  // Never redirect desktop app shell (pages/*) and API endpoints
  if (path.indexOf('/pages/') === 0 || path.indexOf('/api/') === 0) {
    return;
  }

  // Redirect only on lightweight top-level entry pages.
  var topLevelEntrypoints = {
    '/': true,
    '/index.html': true,
    '/articles.html': true,
    '/contact.html': true
  };

  if (!topLevelEntrypoints[path]) {
    return;
  }

  if (isMobileUser) {
    window.location.replace('/mobile.html');
  }
})();
