(function () {
  'use strict';

  var cacheHtml = null;

  async function mount(outlet) {
    if (!cacheHtml) {
      var resp = await fetch('/feed.html', { credentials: 'include' });
      if (!resp.ok) throw new Error('Feed template request failed: ' + resp.status);
      var fullHtml = await resp.text();
      var doc = new DOMParser().parseFromString(fullHtml, 'text/html');
      var feedCol = doc.querySelector('main.feed-col');
      if (!feedCol) throw new Error('Feed column not found in feed.html');
      cacheHtml = feedCol.innerHTML;
    }

    outlet.innerHTML = cacheHtml;
    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);

    try {
      if (window.GameTapeStories && typeof window.GameTapeStories.loadStories === 'function') {
        window.GameTapeStories.loadStories();
      }
      if (typeof window.loadFeed === 'function') {
        await window.loadFeed();
      }
    } catch (err) {
      console.debug('[view-feed] feed bootstrap failed', err);
    }
  }

  function unmount() {}

  if (window.SpaRouter) {
    window.SpaRouter.register('feed', { mount: mount, unmount: unmount });
  }
})();
