(function () {
  'use strict';

  function ensureStatusCard(root, type, text) {
    if (!root) return null;
    const existing = root.querySelector(`[data-ux-status="${type}"]`);
    if (existing) return existing;

    const card = document.createElement('div');
    card.className = 'ad-card';
    card.setAttribute('data-ux-status', type);
    card.style.marginTop = '12px';
    card.style.display = 'none';
    card.innerHTML = `<strong style="display:block;margin-bottom:6px;">${text.title}</strong><span>${text.body}</span>`;
    root.prepend(card);
    return card;
  }

  function initFeedStates() {
    const mount = document.querySelector('#feedPostsMount');
    if (!mount) return;

    const loading = ensureStatusCard(mount, 'loading', {
      title: 'Loading your feed',
      body: 'Fetching the latest highlights from your network.'
    });
    const empty = ensureStatusCard(mount, 'empty', {
      title: 'No posts yet',
      body: 'Follow athletes, coaches, or teams to start building your feed.'
    });

    loading.style.display = 'block';

    window.setTimeout(() => {
      if (mount.children.length <= 2) {
        empty.style.display = 'block';
      }
      loading.style.display = 'none';
    }, 1200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFeedStates();
  });
})();
