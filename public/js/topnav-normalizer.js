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
      path: '/pages/search/search.html',
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
    if (path.indexOf('/pages/search/') === 0 || path === '/search.html') return 'search';
    if (path === '/articles.html' || path.indexOf('/pages/company/blog') === 0) return 'articles';
    if (path.indexOf('/pages/marketplace/') === 0) return 'marketplace';
    if (path.indexOf('/pages/messaging/') === 0 || path === '/messages.html') return 'messages';
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

  function normalizeTopNav() {
    var topNav = document.querySelector('.topnav, .navbar');
    if (!topNav) return;

    if (!topNav.classList.contains('topnav')) {
      topNav.classList.add('topnav');
    }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeTopNav);
  } else {
    normalizeTopNav();
  }
})();
