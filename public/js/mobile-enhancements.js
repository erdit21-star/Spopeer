// Updated
/* ═══════════════════════════════════════════════════════════
   Spopeer — Shared Mobile Enhancements Runtime
   Adds mobile behaviours across the whole project.
   Loaded with defer — runs after DOM is ready.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 1. Mobile body class ── */
  function isMobileWidth() {
    return window.innerWidth <= 768;
  }

  function updateMobileClass() {
    document.body.classList.toggle('is-mobile', isMobileWidth());
  }
  updateMobileClass();
  window.addEventListener('resize', updateMobileClass);

  /* ── 2. Wrap bare tables in scroll containers ── */
  function wrapTables() {
    var tables = document.querySelectorAll('table');
    tables.forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('sp-table-scroll')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'sp-table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  /* ── 3. Make embedded content responsive ── */
  function makeEmbedsResponsive() {
    var embeds = document.querySelectorAll('iframe, embed, object, video');
    embeds.forEach(function (el) {
      if (el.style.maxWidth) return;
      el.style.maxWidth = '100%';
      if (el.tagName === 'IFRAME' || el.tagName === 'EMBED' || el.tagName === 'OBJECT') {
        if (!el.style.width) el.style.width = '100%';
        if (!el.closest('.sp-table-scroll')) {
          el.style.height = 'auto';
          el.style.aspectRatio = '16/9';
        }
      }
    });
  }

  /* ── 4. Guest/public nav mobile menu toggle ── */
  function setupPublicNavMobileMenu() {
    // Find the public-style nav (has .nav-links or .auth-row children)
    var navLinks = document.querySelector('.nav-links');
    var authRow = document.querySelector('.auth-row') || document.querySelector('.auth-buttons');
    if (!navLinks && !authRow) return;

    // Find the parent nav container
    var navContainer = null;
    if (navLinks) navContainer = navLinks.closest('.navbar') || navLinks.closest('.nav-inner') || navLinks.parentElement;
    else if (authRow) navContainer = authRow.closest('.navbar') || authRow.closest('.nav-inner') || authRow.parentElement;
    if (!navContainer) return;

    // Don't inject if already present
    if (navContainer.querySelector('.sp-public-hamburger')) return;

    // Create hamburger button
    var hamburger = document.createElement('button');
    hamburger.className = 'sp-public-hamburger';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    navContainer.appendChild(hamburger);

    // Create mobile panel
    var panel = document.createElement('div');
    panel.className = 'sp-public-mobile-panel';

    // Clone nav links into the panel
    if (navLinks) {
      var links = navLinks.querySelectorAll('a, button');
      links.forEach(function (el) {
        var clone = el.cloneNode(true);
        panel.appendChild(clone);
      });
    }

    // Clone auth buttons into the panel
    if (authRow) {
      var authEls = authRow.querySelectorAll('a, button');
      authEls.forEach(function (el) {
        var clone = el.cloneNode(true);
        clone.style.cssText = '';
        panel.appendChild(clone);
      });
    }

    // Insert panel after nav header
    var header = navContainer.closest('header') || navContainer.closest('nav') || navContainer.parentElement;
    if (header && header.parentElement) {
      header.parentElement.insertBefore(panel, header.nextSibling);
    } else {
      document.body.insertBefore(panel, document.body.firstChild);
    }

    // Toggle panel
    var panelOpen = false;
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      panelOpen = !panelOpen;
      panel.classList.toggle('open', panelOpen);
      hamburger.innerHTML = panelOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });

    // Close panel when clicking outside
    document.addEventListener('click', function (e) {
      if (panelOpen && !panel.contains(e.target) && !hamburger.contains(e.target)) {
        panelOpen = false;
        panel.classList.remove('open');
        hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panelOpen) {
        panelOpen = false;
        panel.classList.remove('open');
        hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
      }
    });

    // Close on link click inside panel
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        panelOpen = false;
        panel.classList.remove('open');
        hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
      }
    });

    // Expose close function for inline onclick handlers
    window.closeMobileMenu = function () {
      panelOpen = false;
      panel.classList.remove('open');
      hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    };
  }

  /* ── 5. Bottom navigation bar (logged-in pages) ── */
  function setupBottomNav() {
    // Only inject on app pages (has topnav with nav-icons)
    var topnav = document.querySelector('.topnav');
    if (!topnav) return;

    // Don't double-inject
    if (document.querySelector('.sp-bottom-nav')) return;

    var path = window.location.pathname;

    // Determine active tab
    function isActive(href) {
      return path === href || path.startsWith(href.replace(/\.html$/, ''));
    }

    var items = [
      { href: '/app.html', icon: 'fa-solid fa-house', label: 'Home' },
      { href: '/pages/search/search.html', icon: 'fa-regular fa-compass', label: 'Explore' },
      { href: null, icon: 'fa-solid fa-plus', label: '', post: true },
      { href: '/pages/messaging/inbox.html', icon: 'fa-regular fa-paper-plane', label: 'Messages' },
      { href: '/pages/profiles/edit-profile.html', icon: 'fa-regular fa-user', label: 'Profile' },
    ];

    var nav = document.createElement('nav');
    nav.className = 'sp-bottom-nav';
    nav.setAttribute('aria-label', 'Main navigation');

    var inner = document.createElement('div');
    inner.className = 'sp-bottom-nav-inner';

    items.forEach(function (item) {
      var el;

      if (item.post) {
        // Post button — opens post composer or scrolls to feed composer
        el = document.createElement('button');
        el.className = 'sp-bottom-nav-item sp-bottom-nav-post';
        el.setAttribute('aria-label', 'Create post');
        el.innerHTML = '<i class="' + item.icon + '"></i>';
        el.addEventListener('click', function () {
          // Try to find and focus the post composer on feed page
          var composer = document.querySelector('.composer-input, .post-input, [placeholder*="mind"], [placeholder*="share"], [placeholder*="post"]');
          if (composer) {
            composer.focus();
            composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            window.location.href = '/app.html#feed';
          }
        });
      } else {
        el = document.createElement('a');
        el.className = 'sp-bottom-nav-item';
        el.href = item.href;
        el.setAttribute('aria-label', item.label);
        if (isActive(item.href)) el.classList.add('active');
        el.innerHTML = '<i class="' + item.icon + '"></i><span class="sp-nav-label">' + item.label + '</span>';

        // Badge for messages
        if (item.href && item.href.includes('messaging')) {
          el.dataset.badgeTarget = 'messages';
        }
      }

      inner.appendChild(el);
    });

    nav.appendChild(inner);
    document.body.appendChild(nav);

    // Pull unread count from notification badge in topnav if available
    setTimeout(function () {
      var msgBadge = document.querySelector('#messagesBtn .notif-badge, #messagesBtn [class*="badge"]');
      if (msgBadge && msgBadge.textContent.trim()) {
        var mobileMsg = nav.querySelector('[data-badge-target="messages"]');
        if (mobileMsg) {
          var badge = document.createElement('span');
          badge.className = 'sp-nav-badge';
          badge.textContent = msgBadge.textContent.trim();
          mobileMsg.appendChild(badge);
        }
      }
    }, 1500);
  }

  /* ── 5b. Ensure global topnav normalizer is loaded ── */
  function ensureTopnavNormalizer(done) {
    var callback = typeof done === 'function' ? done : function () {};
    if (!document.querySelector('.topnav')) {
      callback();
      return;
    }

    if (document.querySelector('script[data-topnav-normalizer-loader="1"]')) {
      callback();
      return;
    }

    var script = document.createElement('script');
    script.src = '/js/topnav-normalizer.js';
    script.setAttribute('data-topnav-normalizer-loader', '1');
    script.onload = callback;
    script.onerror = callback;
    document.head.appendChild(script);
  }

  /* ── 6. Feed tabs horizontal scroll on mobile ── */
  function setupFeedTabs() {
    var tabBar = document.querySelector('.feed-tabs');
    if (!tabBar) return;

    // Scroll active tab into view
    var activeTab = tabBar.querySelector('.feed-tab.active, .feed-tab[data-active]');
    if (activeTab && isMobileWidth()) {
      setTimeout(function () {
        activeTab.scrollIntoView({ block: 'nearest', inline: 'center' });
      }, 100);
    }
  }

  /* ── 7. Smooth scroll to composer on #compose hash ── */
  function handleComposeHash() {
    if (window.location.hash === '#compose') {
      setTimeout(function () {
        var composer = document.querySelector('.composer-input, .post-input, [placeholder*="mind"], [placeholder*="share"]');
        if (composer) {
          composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          composer.focus();
        }
      }, 300);
    }
  }

  /* ── 8. Messaging mobile back button ── */
  function setupMessagingMobile() {
    var layout = document.querySelector('.messaging-layout');
    if (!layout) return;

    var panelLeft = layout.querySelector('.panel-left');
    var panelRight = layout.querySelector('.panel-right');
    if (!panelLeft || !panelRight) return;

    // Find the panel-right header area
    var rightHeader = panelRight.querySelector('.chat-header') ||
                      panelRight.querySelector('[class*="header"]') ||
                      panelRight.firstElementChild;
    if (!rightHeader) return;

    function showConversationList() {
      panelLeft.classList.add('mobile-open');
      panelRight.style.display = 'none';
    }

    function showConversationPanel() {
      panelLeft.classList.remove('mobile-open');
      panelRight.style.display = '';
    }

    // Don't double-inject
    if (rightHeader.querySelector('.sp-msg-back-btn')) return;

    // Create a back button for mobile
    var backBtn = document.createElement('button');
    backBtn.className = 'sp-msg-back-btn';
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
    backBtn.title = 'Back to chats';
    rightHeader.insertBefore(backBtn, rightHeader.firstChild);

    backBtn.addEventListener('click', function () {
      if (isMobileWidth()) {
        showConversationList();
      }
    });

    // When a conversation is clicked, show right panel on mobile
    var convItems = panelLeft.querySelectorAll('.convo-item, .thread-item, [class*="convo"], [class*="thread"]');
    convItems.forEach(function (item) {
      item.addEventListener('click', function () {
        if (isMobileWidth()) {
          showConversationPanel();
        }
      });
    });

    if (isMobileWidth()) {
      showConversationList();
    }

    window.addEventListener('resize', function () {
      if (isMobileWidth()) {
        if (!panelLeft.classList.contains('mobile-open')) {
          showConversationPanel();
        }
      } else {
        panelLeft.classList.remove('mobile-open');
        panelRight.style.display = '';
      }
    }, { passive: true });
  }

  /* ── 6. Ensure viewport meta exists ── */
  function ensureViewportMeta() {
    if (document.querySelector('meta[name="viewport"]')) return;
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(meta);
  }

  /* ── Init ── */
  function init() {
    ensureViewportMeta();
    wrapTables();
    makeEmbedsResponsive();
    setupPublicNavMobileMenu();
    ensureTopnavNormalizer(function () {
      setupBottomNav();
      setupMessagingMobile();
      setupFeedTabs();
      handleComposeHash();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
