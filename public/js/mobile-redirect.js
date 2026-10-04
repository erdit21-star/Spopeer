(function () {
  var path = String(window.location.pathname || '/').toLowerCase().replace(/\\/+$/, '') || '/';
  var params = new URLSearchParams(window.location.search || '');

  // An explicit desktop override remains available for desktop testing.
  if (params.get('desktop') === '1' || localStorage.getItem('spopeer_force_desktop') === '1') return;

  var isMobileUa = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent || '');
  var isNarrowScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  if (!isMobileUa && !isNarrowScreen) return;

  // Keep dedicated mobile auth and public/legal pages on their own mobile endpoints.
  if (path.indexOf('/mobile') === 0 || path.indexOf('/pages/auth/') === 0 ||
      path.indexOf('/pages/legal/') === 0 || path.indexOf('/pages/contact/') === 0) return;

  var route = 'feed';
  if (path === '/search.html' || path === '/pages/search/search.html') route = 'search';
  else if (path.indexOf('/pages/community/') === 0) route = 'community';
  else if (path.indexOf('/pages/marketplace/') === 0) route = 'marketplace';
  else if (path.indexOf('/pages/events/') === 0) route = 'events';
  else if (path.indexOf('/pages/library/') === 0) route = 'library';
  else if (path.indexOf('/pages/messaging/') === 0) route = 'messages';
  else if (path.indexOf('/pages/sponsorship/') === 0) route = 'sponsorship';
  else if (path.indexOf('/pages/training/') === 0) route = 'training';
  else if (path.indexOf('/pages/profiles/edit-profile') === 0) route = 'profile';
  else if (path.indexOf('/pages/profiles/') === 0) route = 'public-profile';
  else if (path.indexOf('/pages/dashboard/') === 0) route = 'profile';
  else if (path !== '/' && path !== '/index.html' && path !== '/feed.html') return;

  // Replace the legacy desktop document with the mobile app shell.
  window.location.replace('/mobile.html?mobileRoute=' + encodeURIComponent(route));
})();
