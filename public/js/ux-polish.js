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

  function initOnboardingHint() {
    const key = 'spopeer:onboarding:v1';
    if (localStorage.getItem(key)) return;

    const host = document.querySelector('main, .main-content, body');
    if (!host) return;

    const banner = document.createElement('div');
    banner.className = 'ad-card';
    banner.style.marginBottom = '12px';
    banner.innerHTML = [
      '<strong style="display:block;margin-bottom:6px;">New here?</strong>',
      '<span>Set your visibility, add hashtags, and use Safety Tools to report or block quickly.</span>',
      '<div style="margin-top:10px;">',
      '<button type="button" data-ux-close class="composer-post-btn">Got it</button>',
      '</div>'
    ].join('');

    host.prepend(banner);
    const close = banner.querySelector('[data-ux-close]');
    if (close) {
      close.addEventListener('click', () => {
        localStorage.setItem(key, '1');
        banner.remove();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFeedStates();
    initOnboardingHint();
  });
})();
