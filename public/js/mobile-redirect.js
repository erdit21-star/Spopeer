(function () {
  var path = String(window.location.pathname || '/').toLowerCase();
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  var params = new URLSearchParams(window.location.search || '');

  // An explicit desktop override remains available for desktop testing.
  var forceDesktop = params.get('desktop') === '1';
  try { forceDesktop = forceDesktop || localStorage.getItem('spopeer_force_desktop') === '1'; } catch (_storageError) {}
  if (forceDesktop) return;

  var isMobileUa = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent || '');
  var isNarrowScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  if (!isMobileUa && !isNarrowScreen) return;

  if (path.indexOf('/mobile') === 0) return;

  var mobileStaticPages = {
    '/pages/auth/login.html': '/mobile-login.html',
    '/pages/auth/signup.html': '/mobile-signup.html',
    '/pages/auth/forgot-password.html': '/mobile-forgot-password.html',
    '/pages/auth/reset-password.html': '/mobile-forgot-password.html',
    '/pages/admin/login.html': '/mobile-login.html',
    '/pages/legal/terms.html': '/mobile-terms.html',
    '/pages/legal/privacy.html': '/mobile-privacy.html',
    '/pages/legal/about.html': '/mobile-about.html',
    '/pages/legal/community-guidelines.html': '/mobile-terms.html',
    '/pages/legal/cookies.html': '/mobile-privacy.html',
    '/pages/legal/report-abuse.html': '/mobile-report-abuse.html',
    '/pages/contact/index.html': '/mobile-contact.html',
    '/contact.html': '/mobile-contact.html',
    '/pages/company/faq.html': '/mobile-help-center.html',
    '/pages/company/help-center.html': '/mobile-help-center.html',
    '/pages/company/blog.html': '/mobile-blog.html',
    '/pages/company/careers.html': '/mobile-careers.html',
    '/pages/company/changelog.html': '/mobile-blog.html',
    '/pages/company/report-abuse.html': '/mobile-report-abuse.html',
    '/pages/company/about.html': '/mobile-about.html',
    '/pages/company/features.html': '/mobile-features.html',
    '/pages/company/who-its-for.html': '/mobile-who-its-for.html',
    '/pages/company/how-it-works.html': '/mobile-how-it-works.html'
  };
  if (mobileStaticPages[path]) {
    window.location.replace(mobileStaticPages[path] + (window.location.search || ''));
    return;
  }
  if (path.indexOf('/pages/auth/') === 0) {
    window.location.replace('/mobile-login.html' + (window.location.search || ''));
    return;
  }

  var route = 'feed';
  if (path === '/search.html' || path === '/pages/search/search.html') route = 'search';
  else if (path === '/articles.html' || path.indexOf('/pages/articles/') === 0) route = 'articles';
  else if (path === '/messages.html') route = 'messages';
  else if (path === '/app.html' || path === '/pages/stories/archive.html') route = 'feed';
  else if (path.indexOf('/pages/admin/') === 0 || path.indexOf('/pages/ads/') === 0) route = 'admin';
  else if (path === '/pages/dashboard/notifications.html') route = 'notifications';
  else if (path.indexOf('/pages/dashboard/') === 0) route = 'settings';
  else if (path === '/pages/profiles/edit-profile.html') route = 'edit-profile';
  else if (path === '/pages/profiles/public-profile.html') route = 'public-profile';
  else if (path === '/pages/profiles/followers.html') route = 'followers';
  else if (path === '/pages/profiles/user-posts.html') route = 'user-posts';
  else if (path.indexOf('/pages/profiles/') === 0) route = 'profile';
  else if (path.indexOf('/pages/articles/') === 0) route = 'articles';
  else if (path.indexOf('/pages/community/') === 0) route = 'community';
  else if (path.indexOf('/pages/marketplace/') === 0) route = 'marketplace';
  else if (path.indexOf('/pages/events/') === 0) route = 'events';
  else if (path.indexOf('/pages/library/') === 0) route = 'library';
  else if (path.indexOf('/pages/messaging/') === 0) route = 'messages';
  else if (path.indexOf('/pages/sponsorship/') === 0) route = 'sponsorship';
  else if (path.indexOf('/pages/training/') === 0) route = 'training';
  else if (path.endsWith('.html')) route = 'feed';
  else if (path !== '/' && path !== '/index.html' && path !== '/feed.html') return;

  // Server routing handles mobile user agents before HTML is sent. This fallback
  // covers narrow desktop windows and older deployments.
  window.location.replace('/mobile.html?mobileRoute=' + encodeURIComponent(route));
})();
