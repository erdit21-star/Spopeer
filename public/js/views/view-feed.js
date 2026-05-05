(function () {
  'use strict';

  var teardownHandlers = [];

  var FEED_SHELL_HTML = [
    '<div class="feed-tabs">',
      '<button class="feed-tab active" data-tab="for-you">For You</button>',
      '<button class="feed-tab" data-tab="following">Following</button>',
      '<button class="feed-tab" data-tab="sport">Sport</button>',
      '<button class="feed-tab" data-tab="trending">Trending</button>',
    '</div>',
    '<section class="game-tape-container" aria-label="Stories highlights">',
      '<div class="game-tape-wrapper">',
        '<div class="game-tape-header">',
          '<div class="game-tape-title">',
            '<span class="game-tape-title-icon">🎥</span>',
            '<span>Highlights</span>',
            '<span class="game-tape-badge" id="gameTapeNewBadge">0 new</span>',
          '</div>',
        '</div>',
        '<div class="game-tape-strip" id="gameTapeStrip"></div>',
      '</div>',
    '</section>',
    '<div id="feedPostsMount"></div>'
  ].join('');

  function cleanup() {
    while (teardownHandlers.length) {
      var fn = teardownHandlers.pop();
      try { fn(); } catch (_err) {}
    }
  }

  function normalizeSports(user) {
    var primary = user && (user.primarySport || user.sport) ? String(user.primarySport || user.sport) : '';
    var secondary = user && Array.isArray(user.secondarySports) ? user.secondarySports : [];
    return [primary].concat(secondary).filter(Boolean);
  }

  async function renderTab(tabName, sports) {
    if (!window.SpopeerFeedEngine || typeof window.renderFeed !== 'function') return;

    var posts = [];
    if (tabName === 'following') {
      posts = await window.SpopeerFeedEngine.getFollowingFeed();
    } else if (tabName === 'sport') {
      posts = await window.SpopeerFeedEngine.getSportFeed(sports);
    } else if (tabName === 'trending') {
      posts = await window.SpopeerFeedEngine.getTrendingFeed();
    } else {
      posts = await window.SpopeerFeedEngine.getForYouFeed();
    }

    window.renderFeed(Array.isArray(posts) ? posts : []);
  }

  async function mount(outlet) {
    cleanup();
    outlet.innerHTML = FEED_SHELL_HTML;
    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);

    var currentUser = window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function'
      ? (window.CurrentUserStore.getCurrentUser() || {})
      : {};
    var sports = normalizeSports(currentUser);
    var selectedTab = 'for-you';

    var tabButtons = outlet.querySelectorAll('.feed-tab');
    tabButtons.forEach(function (btn) {
      var onClick = function () {
        selectedTab = String(btn.getAttribute('data-tab') || 'for-you');
        tabButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderTab(selectedTab, sports).catch(function (err) {
          console.debug('[view-feed] tab render failed', err);
        });
      };
      btn.addEventListener('click', onClick);
      teardownHandlers.push(function () { btn.removeEventListener('click', onClick); });
    });

    try {
      if (window.GameTapeStories && typeof window.GameTapeStories.loadStories === 'function') {
        window.GameTapeStories.loadStories();
      }
      if (window.SpopeerFeedEngine && typeof window.renderFeed === 'function') {
        await renderTab(selectedTab, sports);
      } else if (typeof window.loadFeed === 'function') {
        // Legacy fallback if feed helpers are not initialized yet.
        await window.loadFeed();
      }
    } catch (err) {
      console.debug('[view-feed] feed bootstrap failed', err);
      outlet.insertAdjacentHTML('beforeend', '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Could not load feed.</p></div>');
    }
  }

  function unmount() {
    cleanup();
  }

  if (window.SpaRouter) {
    window.SpaRouter.register('feed', { mount: mount, unmount: unmount });
  }
})();
