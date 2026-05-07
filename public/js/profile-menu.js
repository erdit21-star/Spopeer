// Updated
/**
 * profile-menu.js — Shared profile-menu logic for all profile pages.
 * Handles: chip hydration, menu toggle, section collapse, actions, edit URL routing.
 */
(function () {
  'use strict';

  /* ── Helpers ── */
  function getEditProfileUrl() {
    return '/pages/profiles/edit-profile.html';
  }

  function getProfileUrl() {
    if (window.SpopeerProfileIdentity) {
      return '/pages/profiles/public-profile.html?userId=' + encodeURIComponent(window.SpopeerProfileIdentity.getStableId());
    }
    var u = JSON.parse(localStorage.getItem('spopeer_user') || 'null');
    var identifier = (u && (u.id || u.userId || u.email || u.userEmail)) || '';
    return '/pages/profiles/public-profile.html?userId=' + encodeURIComponent(identifier);
  }

  function navigateToProfile() {
    window.location.href = getProfileUrl();
  }
  function navigateToEditProfile() {
    window.location.href = getEditProfileUrl();
  }

  /* ── Chip hydration ── */
  function refreshChip(profile) {
    if (!profile) return;
    if (typeof API !== 'undefined' && typeof API.updateAllAvatars === 'function') {
      API.updateAllAvatars(profile);
    }
    if (window.UserUI && typeof window.UserUI.bindAllChips === 'function') {
      window.UserUI.bindAllChips();
    }
  }

  window.addEventListener('currentUserChanged', function (e) { refreshChip(e.detail); });
  window.addEventListener('storage', function (e) {
    if (e.key === 'spopeer_user' || e.key === '_profileLastUpdated_') {
      refreshChip(JSON.parse(localStorage.getItem('spopeer_user') || 'null'));
    }
  });

  /* ── Menu open/close ── */
  function closeProfileMenu() {
    var m = document.getElementById('profileMenu');
    if (!m) return;
    m.classList.remove('visible');
    m.setAttribute('aria-hidden', 'true');
  }

  function openProfileMenu() {
    var m = document.getElementById('profileMenu');
    if (!m) return;
    m.classList.add('visible');
    m.setAttribute('aria-hidden', 'false');
  }

  /* ── Section toggle ── */
  function toggleProfileSection(name) {
    var s = document.querySelector('.profile-menu-section[data-section="' + name + '"]');
    if (!s) return;
    s.classList.toggle('collapsed');
    var h = s.querySelector('.profile-menu-section-header');
    if (h) h.setAttribute('aria-expanded', !s.classList.contains('collapsed'));
  }

  /* ── Download data ── */
  function downloadUserData() {
    var u = JSON.parse(localStorage.getItem('spopeer_user') || 'null');
    var p = JSON.parse(localStorage.getItem('spopeer_user_posts') || '[]');
    var c = JSON.parse(localStorage.getItem('spopeer_followed_users') || '[]');
    var act = JSON.parse(localStorage.getItem('spopeer_viewed_24h') || '[]');
    var d = { userProfile: u, posts: p, connections: c, activity: act, exportDate: new Date().toISOString() };
    var b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(b);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'spopeer-data-' + ((u && u.email) || 'user') + '-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ── Action dispatch ── */
  function handleMenuAction(action) {
    function _spa(route, params, query) {
      var fallbacks = {
        profile: '/profile.html',
        settings: '/pages/dashboard/settings.html',
        notifications: '/pages/dashboard/notifications.html',
        messages: '/pages/messaging/inbox.html',
        library: '/pages/library/index.html',
        events: '/pages/events/event.html',
        marketplace: '/pages/marketplace/marketplace.html'
      };
      window.location.href = fallbacks[route] || '/feed.html';
    }

    switch (action) {
      case 'view-profile': _spa('profile'); break;
      case 'edit-profile': _spa('settings'); break;
      case 'your-activity': _spa('profile'); break;
      case 'account-settings': _spa('settings'); break;
      case 'notifications': _spa('notifications'); break;
      case 'privacy': window.location.href = '/pages/legal/privacy.html'; break;
      case 'connections': _spa('messages'); break;
      case 'library': _spa('library'); break;
      case 'media-vault': _spa('library'); break;
      case 'events': _spa('events'); break;
      case 'help': window.location.href = '/pages/company/help-center.html'; break;
      case 'report': window.location.href = '/pages/contact/index.html'; break;
      case 'changelog': window.location.href = '/pages/company/changelog.html'; break;
      case 'my-analytics': _spa('marketplace'); break;
      case 'achievements': _spa('profile'); break;
      case 'my-sports': _spa('settings'); break;
      case 'invite-friends': window.location.href = '/pages/contact/index.html'; break;
      case 'download-data': downloadUserData(); break;
      case 'switch-account': window.location.href = '/pages/auth/login.html'; break;
      case 'logout':
        ['spopeer_token','spopeer_user','spopeer_loggedIn','authToken','token','user','userToken','userData'].forEach(function(key){ localStorage.removeItem(key); });
        window.location.href = '/index.html';
        break;
    }
    closeProfileMenu();
  }

  /* ── Bind once DOM ready ── */
  function init() {
    var chip = document.getElementById('userChip');
    var menu = document.getElementById('profileMenu');

    // Chip click toggles menu
    if (chip) {
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!menu) return;
        menu.classList.toggle('visible');
        menu.setAttribute('aria-hidden', menu.classList.contains('visible') ? 'false' : 'true');
      });
    }

    // Click outside closes menu
    document.addEventListener('click', function (e) {
      if (!menu || !chip) return;
      if (!menu.contains(e.target) && !chip.contains(e.target)) closeProfileMenu();
    });

    // Menu action buttons
    if (menu) {
      menu.addEventListener('click', function (e) {
        if (e.target.closest('.profile-menu-section-header')) return;
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        handleMenuAction(btn.dataset.action);
      });
    }

    // Section headers collapse/expand
    document.querySelectorAll('.profile-menu-section').forEach(function (s) {
      var h = s.querySelector('.profile-menu-section-header');
      if (!h) return;
      h.setAttribute('aria-expanded', !s.classList.contains('collapsed'));
      h.addEventListener('click', function () {
        toggleProfileSection(s.dataset.section);
      });
    });

    // Hydrate chip
    refreshChip(JSON.parse(localStorage.getItem('spopeer_user') || 'null'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Public API ── */
  window.getEditProfileUrl = getEditProfileUrl;
  window.getProfileUrl = getProfileUrl;
  window.navigateToProfile = navigateToProfile;
  window.navigateToEditProfile = navigateToEditProfile;
  window.closeProfileMenu = closeProfileMenu;
  window.openProfileMenu = openProfileMenu;
  window.toggleProfileSection = toggleProfileSection;
  window.downloadUserData = downloadUserData;
  window.refreshChip = refreshChip;
})();

