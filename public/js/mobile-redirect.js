(function () {
  var path = String(window.location.pathname || '/').toLowerCase();
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  var params = new URLSearchParams(window.location.search || '');

  // An explicit desktop override remains available for desktop testing.
  if (params.get('desktop') === '1' || localStorage.getItem('spopeer_force_desktop') === '1') return;

  var isMobileUa = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent || '');
  var isNarrowScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  if (!isMobileUa && !isNarrowScreen) return;

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
  else if (path !== '/' && path !== '/index.html' && path !== '/feed.html') return;

  // Server routing handles mobile user agents before HTML is sent. This fallback
  // covers narrow desktop windows and older deployments.
  window.location.replace('/mobile.html?mobileRoute=' + encodeURIComponent(route));
})();
