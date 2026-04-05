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
  }

  /* ── 5. Messaging mobile back button ── */
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
        panelLeft.classList.add('mobile-open');
        panelRight.style.display = 'none';
      }
    });

    // When a conversation is clicked, show right panel on mobile
    var convItems = panelLeft.querySelectorAll('.convo-item, .thread-item, [class*="convo"], [class*="thread"]');
    convItems.forEach(function (item) {
      item.addEventListener('click', function () {
        if (isMobileWidth()) {
          panelLeft.classList.remove('mobile-open');
          panelRight.style.display = '';
        }
      });
    });
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
    setupMessagingMobile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
