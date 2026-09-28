(function () {
  'use strict';

  var NAV_ITEMS = [
    {
      key: 'home',
      id: 'homeBtn',
      legacyId: null,
      title: 'Home',
      path: '/feed.html',
      iconClass: 'fa-solid fa-house'
    },
    {
      key: 'search',
      id: 'exploreBtn',
      legacyId: null,
      title: 'Search',
      path: '/search.html',
      iconClass: 'fa-solid fa-magnifying-glass'
    },
    {
      key: 'articles',
      id: 'articlesBtn',
      legacyId: null,
      title: 'Articles',
      path: '/articles.html',
      iconClass: 'fa-regular fa-newspaper'
    },
    {
      key: 'marketplace',
      id: 'marketplaceBtn',
      legacyId: null,
      title: 'Marketplace',
      path: '/pages/marketplace/marketplace.html',
      iconClass: 'fa-solid fa-store'
    },
    {
      key: 'messages',
      id: 'messagesBtn',
      legacyId: null,
      title: 'Messages',
      path: '/pages/messaging/inbox.html',
      iconClass: 'fa-regular fa-paper-plane'
    },
    {
      key: 'notifications',
      id: 'notifBtn',
      legacyId: null,
      title: 'Notifications',
      path: '/pages/dashboard/notifications.html',
      iconClass: 'fa-regular fa-bell',
      hasBadge: true
    }
  ];

  function normalizePath(pathname) {
    var path = pathname || '/';
    if (!path.startsWith('/')) path = '/' + path;
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path;
  }

  function getActiveKey(pathname) {
    var path = normalizePath(pathname);

    if (path === '/feed.html' || path === '/' || path === '/index.html') return 'home';
    if (path === '/search.html' || path.indexOf('/pages/search/') === 0) return 'search';
    if (path === '/articles.html' || path.indexOf('/pages/company/blog') === 0) return 'articles';
    if (path.indexOf('/pages/marketplace/') === 0) return 'marketplace';
    if (path.indexOf('/pages/messaging/') === 0) return 'messages';
    if (path.indexOf('/pages/dashboard/notifications') === 0) return 'notifications';

    return null;
  }

  function createNavIcon(item, activeKey) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-icon';
    btn.id = item.id;
    btn.setAttribute('title', item.title);
    btn.setAttribute('aria-label', item.title);
    btn.dataset.topnavAction = item.key;
    if (item.legacyId) btn.dataset.legacyId = item.legacyId;

    var icon = document.createElement('i');
    icon.className = item.iconClass;
    btn.appendChild(icon);

    if (item.hasBadge) {
      var badge = document.createElement('span');
      badge.className = 'notif-badge';
      badge.id = 'notifBadge';
      btn.appendChild(badge);
    }

    if (item.key === activeKey) {
      btn.classList.add('active-page');
    }

    btn.addEventListener('click', function () {
      window.location.href = item.path;
    });

    return btn;
  }

  function removeExistingActionNodes(navRight) {
    var removable = navRight.querySelectorAll('.nav-icon, .nav-icon-btn, [data-topnav-action]');
    removable.forEach(function (node) {
      if (node.classList.contains('sp-mobile-hamburger')) return;
      node.remove();
    });

    var clickable = navRight.querySelectorAll('button[onclick], a[onclick]');
    clickable.forEach(function (node) {
      var onClickValue = (node.getAttribute('onclick') || '').toLowerCase();
      if (onClickValue.indexOf('location.href') === -1 && onClickValue.indexOf('window.location') === -1) return;
      if (node.closest('[data-user-chip], [data-user-menu], .notif-popover')) return;
      if (node.classList.contains('sp-mobile-hamburger')) return;
      node.remove();
    });
  }

  function ensureCanonicalNavStyles() {
    if (document.getElementById('sp-canonical-topnav-style')) return;
    var style = document.createElement('style');
    style.id = 'sp-canonical-topnav-style';
    style.textContent = [
      '.topnav,.navbar{height:64px!important;background:rgba(250,250,248,.94)!important;border-bottom:1px solid var(--border,#ebebe7)!important}',
      '.topnav .nav-inner,.navbar .nav-inner{max-width:1280px!important;margin:0 auto!important;height:100%!important;padding:0 24px!important;display:flex!important;align-items:center!important;gap:16px!important;justify-content:flex-start!important}',
      '.topnav .logo,.navbar .logo{display:inline-flex!important;align-items:center!important;gap:7px!important;flex-shrink:0!important;text-decoration:none!important;font-family:var(--fD,sans-serif)!important;font-size:21px!important;font-weight:800!important;color:var(--ink,#111)!important;letter-spacing:-.02em!important}',
      '.topnav .logo-mark,.navbar .logo-mark{width:28px!important;height:28px!important;border-radius:50%!important;overflow:hidden!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important}',
      '.topnav .logo-mark img,.navbar .logo-mark img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}',
      '.topnav .logo-text,.navbar .logo-text{font-family:var(--fD,sans-serif)!important;font-size:20px!important;font-weight:800!important;color:var(--ink,#111)!important;letter-spacing:-.03em!important}',
      '.topnav .nav-search,.navbar .nav-search{flex:1 1 auto!important;max-width:360px!important;position:relative!important;display:block!important}',
      '.topnav .nav-search input,.navbar .nav-search input{width:100%!important;box-sizing:border-box!important}',
      '.topnav .nav-right,.navbar .nav-right{margin-left:auto!important;display:flex!important;align-items:center!important;gap:6px!important;position:relative!important}',
      '.topnav .nav-icon,.navbar .nav-icon{width:38px!important;height:38px!important;border-radius:50%!important;border:0!important;background:transparent!important;color:var(--muted,#7a7a7a)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:17px!important;cursor:pointer!important}',
      '.topnav .nav-icon:hover,.navbar .nav-icon:hover{background:var(--surface,#f3f3ef)!important;color:var(--ink,#111)!important}',
      '.topnav .nav-icon.active-page,.navbar .nav-icon.active-page{color:var(--accent,#001233)!important}',
      '.topnav [data-user-chip],.navbar [data-user-chip],.topnav #userChip,.navbar #userChip{display:inline-flex!important;align-items:center!important;gap:8px!important;padding:5px 12px 5px 6px!important;background:var(--white,#fff)!important;border:1.5px solid var(--border,#ebebe7)!important;border-radius:999px!important;box-shadow:none!important}',
      '.topnav [data-user-chip]:hover,.topnav [data-user-chip].open,.topnav [data-user-chip]:focus,.topnav [data-user-chip]:focus-visible,.navbar [data-user-chip]:hover,.navbar [data-user-chip].open,.navbar [data-user-chip]:focus,.navbar [data-user-chip]:focus-visible{background:var(--white,#fff)!important;border-color:var(--border,#ebebe7)!important;outline:none!important;box-shadow:none!important}',
      '.topnav [data-user-chip] .chip-avatar,.navbar [data-user-chip] .chip-avatar,.topnav #userChip .chip-avatar,.navbar #userChip .chip-avatar{width:28px!important;height:28px!important;border-radius:50%!important;background:var(--surface,#f3f3ef)!important;color:var(--ink-2,#333)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:11px!important;font-weight:700!important;overflow:hidden!important;flex-shrink:0!important}',
      '.topnav [data-user-chip] .chip-name,.navbar [data-user-chip] .chip-name,.topnav #userChip .chip-name,.navbar #userChip .chip-name{font-size:13px!important;font-weight:600!important;color:var(--ink,#111)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:160px!important}',
      '.topnav [data-user-chip] .chip-caret,.navbar [data-user-chip] .chip-caret,.topnav #userChip .chip-caret,.navbar #userChip .chip-caret{font-size:9px!important;color:var(--muted,#7a7a7a)!important;flex-shrink:0!important}',
      '@media(max-width:768px){.topnav .nav-inner,.navbar .nav-inner{padding:0 12px!important}.topnav .chip-name,.navbar .chip-name{display:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function normalizeUserChip(navRight) {
    var chip = navRight.querySelector('[data-user-chip]') || navRight.querySelector('#userChip');
    if (!chip) return;
    chip.setAttribute('data-user-chip', '');
    var avatar = chip.querySelector('[data-user-chip-avatar]') || chip.querySelector('.chip-avatar');
    var name = chip.querySelector('[data-user-chip-name]') || chip.querySelector('.chip-name');
    var themeToggle = chip.querySelector('.chip-theme-toggle');
    var caret = chip.querySelector('.chip-caret');
    if (!avatar) {
      avatar = document.createElement('span');
      avatar.className = 'chip-avatar';
      avatar.textContent = 'U';
    }
    if (!name) {
      name = document.createElement('span');
      name.className = 'chip-name';
      name.textContent = 'User';
    }
    if (!caret) {
      caret = document.createElement('i');
      caret.className = 'fa-solid fa-chevron-down chip-caret';
    }
    [avatar, name].forEach(function (node) { chip.appendChild(node); });
    if (themeToggle) chip.appendChild(themeToggle);
    chip.appendChild(caret);
    Array.prototype.slice.call(chip.children).forEach(function (child) {
      if (child === avatar || child === name || child === themeToggle || child === caret) return;
      if (child.matches && (child.matches('.chip-text,.chip-handle,.chip-online-dot') || child.hasAttribute('data-user-chip-handle') || child.hasAttribute('data-chip-online-dot'))) child.remove();
    });
    chip.appendChild(avatar);
    chip.appendChild(name);
    chip.appendChild(caret);
  }

  function stripPageSpecificNavStyles(topNav) {
    if (!topNav) return;
    [
      '.nav-inner',
      '.logo',
      '.logo-mark',
      '.logo-mark img',
      '.logo-text',
      '.nav-search',
      '.nav-search input',
      '.nav-right',
      '.user-chip',
      '#userChip'
    ].forEach(function (selector) {
      topNav.querySelectorAll(selector).forEach(function (node) {
        if (node.hasAttribute('style')) node.removeAttribute('style');
      });
    });
  }

  function normalizeTopNav() {
    ensureCanonicalNavStyles();
    var topNav = document.querySelector('.topnav, .navbar');
    if (!topNav) return;

    if (!topNav.classList.contains('topnav')) {
      topNav.classList.add('topnav');
    }

    stripPageSpecificNavStyles(topNav);

    var navInner = topNav.querySelector('.nav-inner') || topNav;
    var navRight = navInner.querySelector('.nav-right');
    if (!navRight) {
      navRight = document.createElement('div');
      navRight.className = 'nav-right';
      navInner.appendChild(navRight);
    }

    var userChip = navRight.querySelector('[data-user-chip]') || navRight.querySelector('#userChip');
    var profileMenu = navRight.querySelector('[data-user-menu]') || navRight.querySelector('#profileMenu');
    var notifPopover = navRight.querySelector('#notifPopover') || navRight.querySelector('.notif-popover');
    var mobileHamburger = navRight.querySelector('.sp-mobile-hamburger');

    normalizeUserChip(navRight);

    removeExistingActionNodes(navRight);

    var activeKey = getActiveKey(window.location.pathname);
    NAV_ITEMS.forEach(function (item) {
      var btn = createNavIcon(item, activeKey);
      navRight.appendChild(btn);
    });

    if (notifPopover) navRight.appendChild(notifPopover);
    if (userChip) navRight.appendChild(userChip);
    if (profileMenu) navRight.appendChild(profileMenu);
    if (mobileHamburger) navRight.appendChild(mobileHamburger);

    topNav.setAttribute('data-topnav-normalized', 'true');
  }

  function watchTopNav() {
    var observer = new MutationObserver(function () {
      var topNav = document.querySelector('.topnav, .navbar');
      if (!topNav) return;

      var navRight = topNav.querySelector('.nav-right');
      if (!navRight) return;

      var hasPageStyle = !!topNav.querySelector('.nav-inner[style],.logo[style],.logo-mark[style],.logo-text[style],.nav-search[style],.nav-search input[style],.nav-right[style],.user-chip[style],#userChip[style]');
      var actionCount = navRight.querySelectorAll('[data-topnav-action]').length;

      if (!hasPageStyle && actionCount === NAV_ITEMS.length) return;

      if (window.__spTopNavNormalizing) return;
      window.__spTopNavNormalizing = true;
      try { normalizeTopNav(); } finally { window.__spTopNavNormalizing = false; }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { normalizeTopNav(); watchTopNav(); });
  } else {
    normalizeTopNav();
    watchTopNav();
  }
})();
