(function () {
  'use strict';

  var cachedHtml = null;
  var FETCH_URL = '/pages/dashboard/settings.html';
  var CONTENT_SEL = '.settings-main';
  var ROUTE_NAME = 'settings';

  async function mount(outlet) {
    outlet.innerHTML = '<div class="spa-loading"><div class="spa-skeleton"></div><div class="spa-skeleton spa-skeleton--medium"></div></div>';

    try {
      if (!cachedHtml) {
        var resp = await fetch(FETCH_URL, { credentials: 'include' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        cachedHtml = await resp.text();
      }

      var doc = new DOMParser().parseFromString(cachedHtml, 'text/html');
      var content = doc.querySelector(CONTENT_SEL);
      if (!content) {
        outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Settings content container not found.</p></div>';
        return;
      }

      outlet.innerHTML = content.outerHTML;
      outlet.classList.add('spa-view-enter');
      setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);
    } catch (err) {
      console.error('[settings view] load failed', err);
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Could not load settings.</p><button onclick="window.SpaRouter.navigate(\'settings\')">Retry</button></div>';
    }
  }

  function unmount() {}

  if (window.SpaRouter) {
    window.SpaRouter.register(ROUTE_NAME, { mount: mount, unmount: unmount });
  }
})();
