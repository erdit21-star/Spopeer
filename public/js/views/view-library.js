(function () {
  'use strict';

  var cachedHtml = null;

  async function mount(outlet) {
    outlet.innerHTML = '<div class="spa-loading"><div class="spa-skeleton"></div><div class="spa-skeleton spa-skeleton--medium"></div></div>';
    try {
      if (!cachedHtml) {
        var resp = await fetch('/pages/library/index.html', { credentials: 'include' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        cachedHtml = await resp.text();
      }
      var doc = new DOMParser().parseFromString(cachedHtml, 'text/html');
      var content = doc.querySelector('.library-col') || doc.querySelector('main') || doc.body;
      outlet.innerHTML = content.outerHTML;
      outlet.classList.add('spa-view-enter');
      setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);
    } catch (_err) {
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Could not load library.</p></div>';
    }
  }

  function unmount() {}

  if (window.SpaRouter) {
    window.SpaRouter.register('library', { mount: mount, unmount: unmount });
  }
})();
