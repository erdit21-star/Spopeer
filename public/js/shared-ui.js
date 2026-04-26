// Updated
(function () {
  'use strict';

  function getUserProfile() {
    try {
      return JSON.parse(localStorage.getItem('spopeer_user') || '{}');
    } catch (error) {
      return {};
    }
  }

  /* Helpers: prefer data-attributes but fallback to legacy ids */
  window.getUserChipElement = function() {
    return document.querySelector('[data-user-chip]') || document.getElementById('userChip');
  };

  window.getUserChipAvatarElement = function() {
    return document.querySelector('[data-user-chip-avatar]') || document.getElementById('chipAvatar');
  };

  window.getUserChipNameElement = function() {
    return document.querySelector('[data-user-chip-name]') || document.getElementById('chipName');
  };

  window.getProfileMenuElement = function() {
    return document.querySelector('[data-user-menu]') || document.getElementById('profileMenu');
  };

  function getAppRootPathname() {
    var path = window.location.pathname || '/';
    var pagesIndex = path.indexOf('/pages/');

    if (pagesIndex !== -1) {
      return path.slice(0, pagesIndex + 1);
    }

    var lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? '/' : path.slice(0, lastSlash + 1);
  }

  function buildAppUrl(relativePath) {
    var normalizedPath = String(relativePath || '').replace(/^\/+/, '');
    return new URL(normalizedPath, window.location.origin + getAppRootPathname()).toString();
  }

  function navigateToAppPath(relativePath) {
    window.location.href = buildAppUrl(relativePath);
  }

  function getProfileUrl(basePath) {
    if (window.SpopeerProfileIdentity) {
      return window.SpopeerProfileIdentity.buildProfileUrl(basePath);
    }
    var user = getUserProfile();
    var identifier = user.id || user.userId || user.email || user.userEmail || '';
    return buildAppUrl('pages/profiles/public-profile.html?userId=' + encodeURIComponent(identifier));
  }

  function getEditProfileUrl(basePath) {
    return buildAppUrl('pages/profiles/edit-profile.html');
  }

  function getProfileMenuActionUrl(action, basePath) {
    switch (action) {
      case 'view-profile':
        return getProfileUrl(basePath);
      case 'edit-profile':
        return getEditProfileUrl(basePath);
      case 'your-activity':
        return buildAppUrl('pages/profiles/user-posts.html');
      case 'account-settings':
        return buildAppUrl('pages/dashboard/settings.html');
      case 'notifications':
        return buildAppUrl('pages/dashboard/notifications.html');
      case 'privacy':
        return buildAppUrl('pages/legal/privacy.html');
      case 'connections':
        return buildAppUrl('pages/messaging/inbox.html');
      case 'library':
        return buildAppUrl('pages/library/index.html');
      case 'events':
        return buildAppUrl('pages/events/event.html');
      case 'help':
        return buildAppUrl('pages/company/help-center.html');
      case 'report':
        return buildAppUrl('pages/contact/index.html');
      case 'my-analytics':
        return buildAppUrl('pages/marketplace/analytics.html');
      case 'ads-manager':
        return buildAppUrl('pages/ads/ads-manager.html');
      case 'achievements':
        return buildAppUrl('pages/profiles/user-posts.html');
      case 'my-sports':
        return buildAppUrl('pages/profiles/edit-profile.html#section-sports');
      case 'invite-friends':
        return buildAppUrl('pages/contact/index.html');
      case 'switch-account':
        return buildAppUrl('pages/auth/login.html');
      default:
        return null;
    }
  }

  function downloadUserData() {
    var userData = getUserProfile();
    var exportData = {
      profile: userData,
      posts: JSON.parse(localStorage.getItem('spopeer_user_posts') || '[]'),
      connections: JSON.parse(localStorage.getItem('spopeer_followed_users') || '[]'),
      activity: JSON.parse(localStorage.getItem('spopeer_viewed_24h') || '[]'),
      exportDate: new Date().toISOString(),
      platform: 'Spopeer'
    };

    var dataBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(dataBlob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'spopeer-data-' + (userData.email || 'user') + '-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function showInlineStatus(container, message) {
    if (!container) {
      return;
    }
    container.textContent = message;
    container.hidden = false;
  }

  function setupSocialFeedRuntime(options) {
    if (window._spSharedRuntimeDone) return;
    window._spSharedRuntimeDone = true;
    var basePath = options.basePath || '';
    var statusNode = document.getElementById(options.statusId || 'runtimeStatus');
    var profileMenu;
    var userChip;

    window.navigateToProfile = function () {
      window.location.href = getProfileUrl(basePath);
    };

    window.navigateToEditProfile = function () {
      window.location.href = getEditProfileUrl(basePath);
    };

    window.closeProfileMenu = function () {
      var pm = document.getElementById('profileMenu');
      if (!pm) return;
      pm.classList.remove('visible');
      pm.setAttribute('aria-hidden', 'true');
    };

    document.querySelectorAll('.story-item').forEach(function (item, index) {
      item.addEventListener('click', function () {
        var owner = item.querySelector('.story-name');
        var label = owner ? owner.textContent.trim() : 'story';
        showInlineStatus(statusNode, 'Viewing ' + label + ' story ' + (index + 1) + '.');
        item.classList.add('seen');
      });
    });

    var composeButton = document.querySelector('.compose-btn');
    if (composeButton) {
      composeButton.addEventListener('click', function () {
        var composer = document.querySelector('.composer textarea, .composer input, textarea[placeholder*="Share"], textarea[placeholder*="post"]');
        if (composer) {
          composer.focus();
          composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showInlineStatus(statusNode, 'Composer ready. Start writing your post.');
          return;
        }
        showInlineStatus(statusNode, 'Composer is not available on this page.');
      });
    }

    var connectInput = document.getElementById('connectEmail');
    if (connectInput && connectInput.parentElement) {
      var connectButton = connectInput.parentElement.querySelector('button');
      if (connectButton) {
        connectButton.addEventListener('click', function (event) {
          event.preventDefault();
          var value = connectInput.value.trim();
          if (!value) {
            showInlineStatus(statusNode, 'Enter an email or username to connect.');
            connectInput.focus();
            return;
          }

          var requests = JSON.parse(localStorage.getItem('spopeer_connection_requests') || '[]');
          requests.push({ target: value, createdAt: new Date().toISOString() });
          localStorage.setItem('spopeer_connection_requests', JSON.stringify(requests));
          connectInput.value = '';
          showInlineStatus(statusNode, 'Connection request saved for ' + value + '.');
        }, true);
      }
    }

    // re-query elements just before attaching listeners to avoid stale references
    profileMenu = document.getElementById('profileMenu');
    userChip = document.getElementById('userChip');

    if (userChip && profileMenu) {
      var openMenu = function () {
        profileMenu.classList.add('visible');
        profileMenu.setAttribute('aria-hidden', 'false');
      };

      var closeMenu = function () {
        profileMenu.classList.remove('visible');
        profileMenu.setAttribute('aria-hidden', 'true');
      };

      var toggleMenu = function () {
        if (profileMenu.classList.contains('visible')) closeMenu();
        else openMenu();
      };

      userChip.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleMenu();
      });

      profileMenu.addEventListener('click', function (event) {
        event.stopPropagation();
      });

      document.addEventListener('click', function () {
        closeMenu();
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeMenu();
      });

      profileMenu.querySelectorAll('.profile-menu-section-header').forEach(function (sectionHeader) {
        sectionHeader.addEventListener('click', function () {
          var section = sectionHeader.closest('.profile-menu-section');
          if (!section) return;

          var wasCollapsed = section.classList.contains('collapsed');
          profileMenu.querySelectorAll('.profile-menu-section').forEach(function (s) {
            if (s !== section) s.classList.add('collapsed');
          });

          if (wasCollapsed) section.classList.remove('collapsed');
          else section.classList.add('collapsed');
        });
      });

      profileMenu.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-action]');
        if (!button) return;

        var routes = {
          'download-data': function () { downloadUserData(); showInlineStatus(statusNode, 'Your account data export has started.'); },
          'logout': async function () {
            try {
              if (window.SpopeerAPI && typeof window.SpopeerAPI.logout === 'function') {
                await window.SpopeerAPI.logout();
                return;
              }
            } catch (err) {
              console.error('Shared UI logout failed:', err);
            }

            [
              'spopeer_token',
              'spopeer_user',
              'spopeer_loggedIn',
              'authToken',
              'token',
              'user',
              'userToken',
              'userData',
              '_profileLastUpdated_'
            ].forEach(function (key) {
              localStorage.removeItem(key);
            });

            if (window.CurrentUserStore && typeof window.CurrentUserStore.clearCurrentUser === 'function') {
              try {
                window.CurrentUserStore.clearCurrentUser();
              } catch (err) {
                console.debug("CurrentUserStore.clearCurrentUser failed in shared-ui logout", err);
              }
            }

            try { sessionStorage.clear(); } catch (err) { console.debug('sessionStorage.clear failed during shared-ui logout', err); }
            window.location.replace(buildAppUrl('index.html'));
          }
        };

        var targetUrl = getProfileMenuActionUrl(button.dataset.action, basePath);
        if (targetUrl) {
          window.location.href = targetUrl;
        } else if (routes[button.dataset.action]) {
          routes[button.dataset.action]();
        }
        closeMenu();
      });
    }

    window.sharedUi = window.sharedUi || {};
    window.sharedUi.downloadUserData = downloadUserData;

    // Inject mobile navigation shell
    ensureMobileChrome(basePath);
  }

  /* ═══════════════════════════════════════════════
     MOBILE CHROME — hamburger, drawer, bottom nav
     ═══════════════════════════════════════════════ */
  var _mobileInjected = false;

  function ensureMobileChrome(basePath) {
    if (_mobileInjected) return;
    if (typeof document === 'undefined') return;
    _mobileInjected = true;

    /* ── 1. Inject mobile CSS ── */
    var css = document.createElement('style');
    css.id = 'spopeer-mobile-css';
    css.textContent = [
      /* hamburger button */
      '.sp-mobile-hamburger{display:none;width:44px;height:44px;border:none;background:transparent;color:var(--ink,#111);font-size:20px;cursor:pointer;align-items:center;justify-content:center;border-radius:50%;transition:.2s;flex-shrink:0;-webkit-tap-highlight-color:transparent}',
      '.sp-mobile-hamburger:hover{background:var(--surface,#f3f3ef)}',

      /* backdrop */
      '.sp-mobile-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:900;opacity:0;transition:opacity .25s}',
      '.sp-mobile-backdrop.visible{display:block;opacity:1}',

      /* drawer */
      '.sp-mobile-drawer{position:fixed;top:0;right:0;bottom:0;width:280px;max-width:85vw;background:var(--white,#fff);z-index:950;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:-4px 0 30px rgba(0,0,0,.15);display:flex;flex-direction:column;overflow-y:auto;-webkit-overflow-scrolling:touch}',
      '.sp-mobile-drawer.open{transform:translateX(0)}',
      '.sp-mobile-drawer-header{padding:20px 20px 16px;border-bottom:1px solid var(--border,#ebebE7);display:flex;align-items:center;gap:12px}',
      '.sp-mobile-drawer-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#001f3f,#1a6bff);color:#fff;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}',
      '.sp-mobile-drawer-name{font-size:15px;font-weight:700;color:var(--ink,#111)}',
      '.sp-mobile-drawer-handle{font-size:12px;color:var(--muted,#7a7a7a)}',
      '.sp-mobile-drawer-nav{padding:12px 0;flex:1}',
      '.sp-mobile-drawer-link{display:flex;align-items:center;gap:14px;padding:13px 24px;font-size:14px;font-weight:500;color:var(--ink-2,#333);text-decoration:none;transition:.15s;-webkit-tap-highlight-color:transparent}',
      '.sp-mobile-drawer-link:hover,.sp-mobile-drawer-link:active{background:var(--surface,#f3f3ef)}',
      '.sp-mobile-drawer-link i{width:20px;text-align:center;font-size:15px;color:var(--muted,#7a7a7a)}',
      '.sp-mobile-drawer-link.logout{color:#c0392b;border-top:1px solid var(--border,#ebebE7);margin-top:8px}',
      '.sp-mobile-drawer-link.logout i{color:#c0392b}',

      /* bottom nav */
      '.sp-mobile-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;height:56px;background:var(--white,#fff);border-top:1px solid var(--border,#ebebE7);z-index:800;padding-bottom:env(safe-area-inset-bottom,0)}',
      '.sp-mobile-bottom-nav-inner{display:flex;height:100%;max-width:480px;margin:0 auto}',
      '.sp-mobile-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-decoration:none;color:var(--muted,#7a7a7a);font-size:10px;font-weight:600;transition:.15s;-webkit-tap-highlight-color:transparent;border:none;background:transparent;cursor:pointer;font-family:inherit}',
      '.sp-mobile-tab i{font-size:18px}',
      '.sp-mobile-tab.active{color:var(--accent,#001f3f)}',
      '.sp-mobile-tab.active i{font-weight:900}',

      /* mobile-only show/hide */
      '@media(max-width:768px){',
        '.sp-mobile-hamburger{display:flex}',
        '.sp-mobile-bottom-nav{display:flex}',
        '.nav-search{display:none!important}',
        '.chip-name{display:none}',
        '.chip-caret{display:none}',
        '.user-chip{padding:5px}',
        '.nav-right .nav-icon:not(.sp-mobile-hamburger){width:36px;height:36px;font-size:15px}',
        'body{padding-bottom:56px}',
      '}',
      '@media(min-width:769px){',
        '.sp-mobile-hamburger{display:none!important}',
        '.sp-mobile-bottom-nav{display:none!important}',
        '.sp-mobile-drawer{display:none!important}',
        '.sp-mobile-backdrop{display:none!important}',
      '}'
    ].join('\n');
    document.head.appendChild(css);

    /* ── 2. Find or create nav container ── */
    var navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    /* ── 3. Insert hamburger button ── */
    var hamburger = document.createElement('button');
    hamburger.className = 'nav-icon sp-mobile-hamburger';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    navRight.appendChild(hamburger);

    /* ── 4. Create backdrop ── */
    var backdrop = document.createElement('div');
    backdrop.className = 'sp-mobile-backdrop';
    document.body.appendChild(backdrop);

    /* ── 5. Create drawer ── */
    var user = getUserProfile();
    var dn = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
    var firstName = user.firstName || dn.split(' ')[0] || 'User';
    var lastName = user.lastName || dn.split(' ').slice(1).join(' ') || '';
    var initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U';
    var handle = user.username ? ('@' + user.username) : (user.email || '');

    var drawer = document.createElement('div');
    drawer.className = 'sp-mobile-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Navigation menu');

    var avatarHtml = '<div class="sp-mobile-drawer-av">' + initials + '</div>';
    if (user.avatarUrl) {
      avatarHtml = '<div class="sp-mobile-drawer-av"><img src="' + user.avatarUrl + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>';
    }

    drawer.innerHTML = '<div class="sp-mobile-drawer-header">' +
      avatarHtml +
      '<div><div class="sp-mobile-drawer-name">' + firstName + ' ' + lastName + '</div>' +
      '<div class="sp-mobile-drawer-handle">' + handle + '</div></div></div>' +
      '<nav class="sp-mobile-drawer-nav">' +
        '<a href="' + buildAppUrl('feed.html') + '" class="sp-mobile-drawer-link"><i class="fa-solid fa-house"></i> Home</a>' +
        '<a href="' + getProfileUrl(basePath) + '" class="sp-mobile-drawer-link"><i class="fa-regular fa-user"></i> View Profile</a>' +
        '<a href="' + getEditProfileUrl(basePath) + '" class="sp-mobile-drawer-link"><i class="fa-regular fa-pen-to-square"></i> Edit Profile</a>' +
        '<a href="' + buildAppUrl('pages/search/search.html') + '" class="sp-mobile-drawer-link"><i class="fa-solid fa-magnifying-glass"></i> Search</a>' +
        '<a href="' + buildAppUrl('pages/messaging/inbox.html') + '" class="sp-mobile-drawer-link"><i class="fa-regular fa-paper-plane"></i> Messages</a>' +
        '<a href="' + buildAppUrl('pages/dashboard/notifications.html') + '" class="sp-mobile-drawer-link"><i class="fa-regular fa-bell"></i> Notifications</a>' +
        '<a href="' + buildAppUrl('pages/dashboard/settings.html') + '" class="sp-mobile-drawer-link"><i class="fa-regular fa-gear"></i> Settings</a>' +
        '<a href="#" class="sp-mobile-drawer-link logout" data-mobile-logout><i class="fa-solid fa-right-from-bracket"></i> Log Out</a>' +
      '</nav>';
    document.body.appendChild(drawer);

    /* ── 6. Create bottom nav ── */
    var bottomNav = document.createElement('nav');
    bottomNav.className = 'sp-mobile-bottom-nav';
    bottomNav.innerHTML = '<div class="sp-mobile-bottom-nav-inner">' +
      '<a href="' + buildAppUrl('feed.html') + '" class="sp-mobile-tab" data-tab="home"><i class="fa-solid fa-house"></i><span>Home</span></a>' +
      '<a href="' + buildAppUrl('pages/search/search.html') + '" class="sp-mobile-tab" data-tab="search"><i class="fa-solid fa-magnifying-glass"></i><span>Search</span></a>' +
      '<a href="' + buildAppUrl('pages/messaging/inbox.html') + '" class="sp-mobile-tab" data-tab="inbox"><i class="fa-regular fa-paper-plane"></i><span>Inbox</span></a>' +
      '<a href="' + getProfileUrl(basePath) + '" class="sp-mobile-tab" data-tab="profile"><i class="fa-regular fa-user"></i><span>Profile</span></a>' +
    '</div>';
    document.body.appendChild(bottomNav);

    /* ── 7. Highlight active tab ── */
    var path = window.location.pathname;
    bottomNav.querySelectorAll('.sp-mobile-tab').forEach(function(tab) {
      var _href = tab.getAttribute('href') || '';
      if (path.indexOf('feed.html') !== -1 && tab.dataset.tab === 'home') tab.classList.add('active');
      else if (path.indexOf('search') !== -1 && tab.dataset.tab === 'search') tab.classList.add('active');
      else if ((path.indexOf('messaging') !== -1 || path.indexOf('inbox') !== -1) && tab.dataset.tab === 'inbox') tab.classList.add('active');
      else if (path.indexOf('profile') !== -1 && tab.dataset.tab === 'profile') tab.classList.add('active');
    });

    /* ── 8. Event handlers ── */
    function openDrawer() {
      drawer.classList.add('open');
      backdrop.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      backdrop.classList.remove('visible');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      if (drawer.classList.contains('open')) closeDrawer();
      else openDrawer();
    });

    backdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeDrawer();
    });

    // Swipe-to-close drawer
    var touchStartX = 0;
    drawer.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    drawer.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (dx > 60) closeDrawer();
    }, { passive: true });

    // Ensure top quick-nav buttons route correctly on every authenticated page.
    [
      { id: 'marketplaceBtn', path: buildAppUrl('pages/marketplace/marketplace.html') },
      { id: 'exploreBtn', path: buildAppUrl('pages/search/search.html') },
      { id: 'messagesBtn', path: buildAppUrl('pages/messaging/inbox.html') },
      { id: 'notifBtn', path: buildAppUrl('pages/dashboard/notifications.html') }
    ].forEach(function (entry) {
      var el = document.getElementById(entry.id);
      if (!el) return;
      if (el.tagName === 'A') {
        el.setAttribute('href', entry.path);
      }
      if (el.dataset && el.dataset.quickNavBound === '1') return;
      if (el.dataset) el.dataset.quickNavBound = '1';
      el.addEventListener('click', function () {
        window.location.href = entry.path;
      });
    });

    /* ── 9. Logout from drawer ── */
    drawer.querySelector('[data-mobile-logout]').addEventListener('click', async function(e) {
      e.preventDefault();

      try {
        if (window.SpopeerAPI && typeof window.SpopeerAPI.logout === 'function') {
          await window.SpopeerAPI.logout();
          return;
        }
      } catch (err) {
        console.error('Mobile logout failed:', err);
      }

      ['spopeer_token','spopeer_user','spopeer_loggedIn','authToken','token','user','userToken','userData','_profileLastUpdated_'].forEach(function(key) {
        localStorage.removeItem(key);
      });

      try { sessionStorage.clear(); } catch (err) { console.debug('sessionStorage.clear failed during mobile logout', err); }
      window.location.replace(buildAppUrl('index.html'));
    });
  }

  window.sharedUi = window.sharedUi || {};
  window.sharedUi.setupSocialFeedRuntime = setupSocialFeedRuntime;
  window.sharedUi.downloadUserData = downloadUserData;
  window.sharedUi.ensureMobileChrome = ensureMobileChrome;
  window.sharedUi.getProfileMenuActionUrl = getProfileMenuActionUrl;

  /* ── Shared notification helpers ── */
  var NOTIF_KEY = 'spopeer_notifications';
  var NOTIF_LAST_SEEN_KEY = 'spopeer_notifications_lastSeen';

  function getStoredNotifications() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]') || []; } catch(e) { return []; }
  }

  function saveNotifications(notifs) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
  }

  function createNotification(notif) {
    var base = Object.assign({
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      read: false
    }, notif);
    var items = getStoredNotifications();
    items.unshift(base);
    saveNotifications(items);
    updateNotifBadge();
    return base;
  }

  function updateNotifBadge() {
    var badge = document.getElementById('notifBadge') || document.querySelector('.notif-badge') || document.querySelector('.notif-badge-dot');
    if (!badge) return;
    var lastSeen = parseInt(localStorage.getItem(NOTIF_LAST_SEEN_KEY) || '0', 10) || 0;
    var notifs = getStoredNotifications();
    var unseenCount = notifs.filter(function(n) { return new Date(n.createdAt).getTime() > lastSeen; }).length;
    if (unseenCount > 0) {
      badge.style.display = 'block';
      badge.title = unseenCount + ' unread notification' + (unseenCount === 1 ? '' : 's');
    } else {
      badge.style.display = 'none';
      badge.title = '';
    }
  }

  window.sharedUi.createNotification = createNotification;
  window.sharedUi.updateNotifBadge = updateNotifBadge;
  window.sharedUi.getStoredNotifications = getStoredNotifications;

  // Auto-update badge on any page that has the element
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() { updateNotifBadge(); });
  }
  
  /* ── Saved / Bookmark buttons for posts (adds Save button next to actions) ── */
  var SAVED_KEY = 'spopeer_saved_posts';

  function getSavedPosts() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') || []; } catch (e) { return []; }
  }

  function saveSavedPosts(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list || [])); } catch (e) { /* ignore */ }
  }

  function isPostSaved(postId) {
    if (!postId) return false;
    var arr = getSavedPosts();
    return arr.indexOf(String(postId)) !== -1;
  }

  function updateSaveBtnUI(btn, saved) {
    if (!btn) return;
    if (saved) {
      btn.classList.add('saved');
      btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Saved';
    } else {
      btn.classList.remove('saved');
      btn.innerHTML = '<i class="fa-regular fa-bookmark"></i> Save';
    }
  }

  function toggleSavePostById(postId, btn) {
    if (!postId) return;
    var arr = getSavedPosts().map(String);
    var idx = arr.indexOf(String(postId));
    var saved = false;
    if (idx === -1) { arr.unshift(String(postId)); saved = true; }
    else { arr.splice(idx, 1); saved = false; }
    saveSavedPosts(arr);
    updateSaveBtnUI(btn, saved);
    // If user is authenticated, persist to server (best-effort, non-blocking)
    try {
      var isLoggedIn = localStorage.getItem('spopeer_loggedIn') === 'true';
      if (isLoggedIn && window.fetch) {
        fetch('/api/posts/' + encodeURIComponent(postId) + '/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }).then(function (res) {
          if (!res.ok) {
            console.warn('Server save failed, keeping local state.');
          }
        }).catch(function (err) {
          console.warn('Failed to persist saved post:', err);
        });
      }
    } catch (e) { /* ignore */ }
  }

  function addSaveButtons(root) {
    root = root || document;
    try {
      var containers = root.querySelectorAll('.post-actions');
      Array.prototype.forEach.call(containers, function (pa) {
        if (pa.getAttribute('data-save-inited')) return;
        pa.setAttribute('data-save-inited', '1');
        var saveBtn = document.createElement('button');
        saveBtn.className = 'act-btn save-btn';
        saveBtn.type = 'button';
        saveBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i> Save';

        // Insert before existing share button if present, otherwise append
        var share = pa.querySelector('.share-post-btn');
        if (share) pa.insertBefore(saveBtn, share);
        else pa.appendChild(saveBtn);

        // Initialize state from closest post-card id or data attribute
        var card = pa.closest('.post-card');
        var postId = card && (card.getAttribute('data-post-id') || card.id) ? (card.getAttribute('data-post-id') || card.id) : null;
        if (postId) updateSaveBtnUI(saveBtn, isPostSaved(postId));
      });
    } catch (e) { /* fail silently */ }
  }

  // Delegate click for save buttons (works for dynamically added posts)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.act-btn.save-btn');
    if (!btn) return;
    var card = btn.closest && btn.closest('.post-card');
    var postId = null;
    if (card) postId = card.getAttribute('data-post-id') || card.id || null;
    // fallback: check for an anchor with id starting with post-
    if (!postId) {
      var parentPost = btn.closest('[id^="post-"]');
      if (parentPost) postId = parentPost.id;
    }
    toggleSavePostById(postId, btn);
  }, true);

  // Observe DOM for newly injected posts and add save buttons automatically
  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes || [], function (node) {
          if (!node) return;
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('.post-card')) {
            addSaveButtons(node);
          } else if (node.querySelector && node.querySelector('.post-actions')) {
            addSaveButtons(node);
          }
        });
      });
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch(e) { /* ignore */ }
  }

  // Initial pass
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () { addSaveButtons(document); });
    // also run soon after to handle already-rendered posts
    setTimeout(function () { addSaveButtons(document); }, 350);
    // inject minimal styles for save button
    try {
      var _s = document.createElement('style');
      _s.textContent = '.act-btn.save-btn:hover{background:#eef3ff;color:var(--blue);} .act-btn.saved{color:var(--blue);} .act-btn.saved i{font-weight:900;}';
      document.head.appendChild(_s);
    } catch(e) { /* ignore */ }
  }

  /* ═══════════════════════════════════════════════════════════
     UNIFIED USER CHIP + PROFILE MENU + SPONSOR LINKS
     Ensures every logged-in page shows the feed.html-style
     user chip, dropdown menu, and correct Sponsor routes.
     ═══════════════════════════════════════════════════════════ */

  var SPONSOR_ROUTE = '/pages/sponsorship/sponsor.html';

  function getDisplayName(user) {
    if (!user) return 'User';
    if (user.displayName) return user.displayName;
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(' ');
    }
    return user.email || 'User';
  }

  /**
   * Returns the canonical profile-menu HTML matching feed.html exactly.
   * All menu items use data-action attributes handled by setupSocialFeedRuntime.
   */

  /**
   * Injects an Ads Manager icon button into the topnav .nav-right area,
   * before the user-chip, on every authenticated page.
   * Skips pages that are themselves the Ads Manager page (already there).
   * Skips if already injected (idempotent).
   */
  function ensureAdsNavItem() {
    var navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    // Already injected?
    if (navRight.querySelector('[data-ads-nav]')) return;

    var adsUrl = buildAppUrl('pages/ads/ads-manager.html');

    var btn = document.createElement('button');
    btn.className = 'nav-icon';
    btn.setAttribute('title', 'Ads Manager');
    btn.setAttribute('data-ads-nav', '1');
    btn.setAttribute('aria-label', 'Ads Manager');
    btn.innerHTML = '<i class="fa-solid fa-bullhorn"></i>';

    // Highlight if currently on the ads-manager page
    if (window.location.pathname.indexOf('/ads/ads-manager') !== -1) {
      btn.classList.add('active-page');
    }

    btn.addEventListener('click', function () {
      window.location.href = adsUrl;
    });

    // Insert before the user-chip (last child) so it sits alongside other nav icons
    var userChipEl = navRight.querySelector('[data-user-chip]');
    if (userChipEl) {
      navRight.insertBefore(btn, userChipEl);
    } else {
      navRight.appendChild(btn);
    }
  }

  /**
   * Normalize all Sponsor/Sponsorship links to use the canonical absolute path.
   * Handles: <a> href, <button> onclick, sidebar .nav-item links.
   */
  function normalizeSponsorLinks() {
    // Fix <a> tags whose text contains "sponsor" (case-insensitive)
    document.querySelectorAll('a.nav-item, a[href*="sponsor"]').forEach(function(a) {
      var href = a.getAttribute('href') || '';
      var text = (a.textContent || '').trim().toLowerCase();
      if (text.indexOf('sponsor') !== -1 || href.indexOf('sponsor') !== -1) {
        if (href !== SPONSOR_ROUTE) {
          a.setAttribute('href', SPONSOR_ROUTE);
        }
      }
    });

    // Fix <button> onclick that navigates to sponsor pages
    document.querySelectorAll('button.nav-item').forEach(function(btn) {
      var text = (btn.textContent || '').trim().toLowerCase();
      if (text.indexOf('sponsor') !== -1) {
        btn.setAttribute('onclick', "window.location.href='" + SPONSOR_ROUTE + "'");
      }
    });
  }

  /**
   * Ensures the sidebar has a Sponsor/Sponsorship nav item.
   * Looks for common sidebar containers and adds the item if missing.
   */
  function ensureSponsorNavItem() {
    var sidebar = document.querySelector('.sidebar-left');
    if (!sidebar) return;

    // Check if sponsor item already exists
    var hasItem = false;
    sidebar.querySelectorAll('.nav-item').forEach(function(item) {
      var text = (item.textContent || '').trim().toLowerCase();
      if (text.indexOf('sponsor') !== -1) hasItem = true;
    });

    if (!hasItem) {
      // Insert before the last nav-item or at the end
      var items = sidebar.querySelectorAll('.nav-item');
      var sponsorHTML = '<a class="nav-item" href="' + SPONSOR_ROUTE + '"><i class="fa-solid fa-handshake-angle"></i> Sponsorship</a>';
      if (items.length > 0) {
        var last = items[items.length - 1];
        last.insertAdjacentHTML('afterend', sponsorHTML);
      } else {
        sidebar.insertAdjacentHTML('beforeend', sponsorHTML);
      }
    }

    // Highlight active state if currently on sponsor page
    if (window.location.pathname.indexOf('/sponsorship/sponsor') !== -1) {
      sidebar.querySelectorAll('.nav-item').forEach(function(item) {
        var text = (item.textContent || '').trim().toLowerCase();
        if (text.indexOf('sponsor') !== -1) {
          item.classList.add('active');
        }
      });
    }
  }

  /**
   * Auto-init: detect basePath, ensure chip/menu, normalize links, setup runtime.
   * Runs on every page that loads shared-ui.js. Safe to call multiple times.
   */
  var _autoInitDone = false;

  function autoInit() {
    if (_autoInitDone) return;
    _autoInitDone = true;

    // Detect basePath from page location
    var path = window.location.pathname;
    var basePath = '';
    if (path.indexOf('/pages/') !== -1) {
      // Count depth: /pages/xxx/ = ../../, /pages/xxx/yyy/ = ../../../
      var afterPages = path.split('/pages/')[1] || '';
      var depth = afterPages.split('/').filter(function(s) { return s && s.indexOf('.') === -1; }).length;
      for (var i = 0; i <= depth; i++) basePath += '../';
      // But if basePath ends up wrong, fall back to pages-relative
      if (depth === 0) basePath = '../../';
    }

    // User chip/menu rendering is now handled by UserUI/CurrentUserStore only.
    normalizeSponsorLinks();
    ensureSponsorNavItem();
    ensureAdsNavItem();

    // Register service worker if not already registered (idempotent — browser deduplicates).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/js/service-worker.js').catch(function (err) {
        console.debug('SW registration failed:', err);
      });
    }

    // Auto-call setupSocialFeedRuntime if not already done
    // (pages that explicitly call it will have already set it up)
    if (!window._spSharedRuntimeDone) {
      setupSocialFeedRuntime({ basePath: basePath });
    }
  }

  // Export new functions
  window.sharedUi = window.sharedUi || {};
  // window.sharedUi.ensureUserChipAndMenu = ensureUserChipAndMenu;
  window.sharedUi.normalizeSponsorLinks = normalizeSponsorLinks;
  window.sharedUi.ensureSponsorNavItem = ensureSponsorNavItem;
  window.sharedUi.ensureAdsNavItem = ensureAdsNavItem;
  window.sharedUi.SPONSOR_ROUTE = SPONSOR_ROUTE;
  window.sharedUi.getDisplayName = getDisplayName;

  // Run auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      // DOM already ready — run immediately (but delay slightly to let page scripts run first)
      setTimeout(autoInit, 0);
    }
  }
})();
