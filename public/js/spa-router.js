(function () {
  'use strict';

  var registry = {};
  var currentView = null;
  var currentRoute = null;

  function getOutlet() {
    return document.getElementById('spa-outlet');
  }

  function parseHash(hash) {
    var clean = String(hash || '').replace(/^#/, '');
    var qSplit = clean.split('?');
    var pathParts = qSplit[0].split('/');
    var route = pathParts[0] || 'feed';
    var params = {};
    var query = {};

    for (var i = 1; i + 1 < pathParts.length; i += 2) {
      params[decodeURIComponent(pathParts[i])] = decodeURIComponent(pathParts[i + 1] || '');
    }

    if (qSplit[1]) {
      qSplit[1].split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) {
          query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        }
      });
    }

    return { route: route, params: params, query: query };
  }

  function register(routeName, viewModule) {
    registry[routeName] = viewModule;
  }

  function navigate(route, params, query) {
    var hash = '#' + (route || 'feed');

    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (key) {
        hash += '/' + encodeURIComponent(key) + '/' + encodeURIComponent(params[key]);
      });
    }

    if (query && typeof query === 'object') {
      var qs = Object.keys(query)
        .filter(function (key) { return query[key] !== undefined && query[key] !== null; })
        .map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(query[key]); })
        .join('&');
      if (qs) hash += '?' + qs;
    }

    window.location.hash = hash;
  }

  function syncNavActive(route) {
    document.querySelectorAll('[data-spa-link]').forEach(function (el) {
      var target = String(el.getAttribute('data-spa-link') || '').replace(/^#/, '');
      el.classList.toggle('active', target === route);
    });
  }

  function showSkeleton() {
    var outlet = getOutlet();
    if (!outlet) return;
    outlet.innerHTML =
      '<div class="spa-loading">' +
        '<div class="spa-skeleton"></div>' +
        '<div class="spa-skeleton spa-skeleton--medium"></div>' +
        '<div class="spa-skeleton spa-skeleton--short"></div>' +
        '<div class="spa-skeleton"></div>' +
      '</div>';
  }

  async function handleRoute() {
    var outlet = getOutlet();
    if (!outlet) return;

    var parsed = parseHash(window.location.hash);
    var route = parsed.route;
    var view = registry[route];

    if (!view) {
      view = registry.feed || null;
      route = 'feed';
    }

    if (currentView && typeof currentView.unmount === 'function') {
      try {
        currentView.unmount();
      } catch (unmountErr) {
        console.warn('[SpaRouter] unmount failed:', unmountErr);
      }
    }

    currentRoute = route;
    currentView = view;
    syncNavActive(route);
    window.scrollTo(0, 0);
    showSkeleton();

    if (view && typeof view.mount === 'function') {
      try {
        await view.mount(outlet, parsed.params, parsed.query);
      } catch (mountErr) {
        console.error('[SpaRouter] mount failed for route', route, mountErr);
        outlet.innerHTML =
          '<div class="spa-error">' +
            '<i class="fa-regular fa-circle-xmark"></i>' +
            '<p>Something went wrong loading this page.</p>' +
            '<button onclick="window.SpaRouter.navigate(\'feed\')">Go back to Feed</button>' +
          '</div>';
      }
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);

    if (!window.location.hash || window.location.hash === '#') {
      window.history.replaceState(null, '', '#feed');
    }

    handleRoute();
  }

  window.SpaRouter = {
    register: register,
    navigate: navigate,
    parseHash: parseHash,
    getCurrentRoute: function () { return currentRoute; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
