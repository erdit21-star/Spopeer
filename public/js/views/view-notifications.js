(function () {
  'use strict';

  var currentFilter = 'all';
  var notifications = [];
  var cleanupFns = [];

  function unwrapNotifications(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.notifications)) return result.notifications;
    if (result.data && Array.isArray(result.data.notifications)) return result.data.notifications;
    return [];
  }

  function unreadCount(result, rows) {
    if (result && result.meta && typeof result.meta.unreadCount === 'number') return result.meta.unreadCount;
    if (result && result.data && result.data.meta && typeof result.data.meta.unreadCount === 'number') return result.data.meta.unreadCount;
    return rows.filter(function (n) { return n && n.isRead === false; }).length;
  }

  function timeAgo(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'now';
    var mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return date.toLocaleDateString();
  }

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; });
  }

  function classify(notification) {
    var type = String((notification && notification.type) || '').toLowerCase();
    if (/follow|comment|like|mention|repost|message/.test(type)) return 'social';
    if (/event|reminder|achievement|invite/.test(type)) return 'activity';
    return 'updates';
  }

  function isRead(notification) {
    return !!(notification && (notification.read === true || notification.isRead === true));
  }

  function clearCleanup() {
    while (cleanupFns.length) {
      var fn = cleanupFns.pop();
      try { fn(); } catch (_err) {}
    }
  }

  function filteredRows() {
    return notifications.filter(function (n) {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'unread') return !isRead(n);
      return classify(n) === currentFilter;
    });
  }

  function renderCounts(outlet) {
    var all = notifications.length;
    var unread = notifications.filter(function (n) { return !isRead(n); }).length;
    var allCount = outlet.querySelector('#spaNotifAllCount');
    var unreadCountEl = outlet.querySelector('#spaNotifUnreadCount');
    var unreadTop = outlet.querySelector('#spaNotifUnreadTop');
    if (allCount) allCount.textContent = String(all);
    if (unreadCountEl) unreadCountEl.textContent = String(unread);
    if (unreadTop) unreadTop.textContent = String(unread);
  }

  function rowHtml(n) {
    var read = isRead(n);
    var tone = read ? '#fff' : 'var(--blue-lt)';
    var message = n.message || n.text || 'You have a new notification.';
    return '' +
      '<article class="post-card" data-notif-id="' + esc(n.id || n.notificationId || '') + '" style="margin-bottom:10px;background:' + tone + ';">' +
        '<div class="post-body">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
            '<div>' +
              '<strong>' + esc(n.type || 'Activity') + '</strong>' +
              '<p style="margin:6px 0 0;line-height:1.5;">' + esc(message) + '</p>' +
              '<small style="color:var(--muted);">' + esc(timeAgo(n.createdAt || n.updatedAt)) + ' ago</small>' +
            '</div>' +
            (read ? '' : '<button type="button" class="post-action-btn" data-mark-read="' + esc(n.id || n.notificationId || '') + '">Mark read</button>') +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderList(outlet) {
    var list = outlet.querySelector('#spaNotifList');
    if (!list) return;

    var rows = filteredRows();
    if (!rows.length) {
      list.innerHTML = '<div class="feed-empty-state"><p>No notifications for this filter.</p></div>';
      return;
    }

    list.innerHTML = rows.map(rowHtml).join('');
  }

  async function refresh(outlet) {
    var result = await window.SpopeerAPI.listNotifications({ limit: 60 });
    notifications = unwrapNotifications(result);
    renderCounts(outlet);
    renderList(outlet);
  }

  async function mount(outlet) {
    clearCleanup();
    currentFilter = 'all';
    notifications = [];

    outlet.innerHTML = '' +
      '<section class="post-card"><div class="post-body">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
          '<h3 style="margin:0;">Notifications</h3>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<small style="color:var(--muted);"><span id="spaNotifUnreadTop">0</span> unread</small>' +
            '<button id="spaMarkAllReadBtn" type="button" class="post-action-btn">Mark all read</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">' +
          '<button type="button" class="post-action-btn" data-filter="all">All <span id="spaNotifAllCount" style="margin-left:4px;">0</span></button>' +
          '<button type="button" class="post-action-btn" data-filter="unread">Unread <span id="spaNotifUnreadCount" style="margin-left:4px;">0</span></button>' +
          '<button type="button" class="post-action-btn" data-filter="activity">Activity</button>' +
          '<button type="button" class="post-action-btn" data-filter="social">Social</button>' +
          '<button type="button" class="post-action-btn" data-filter="updates">Updates</button>' +
        '</div>' +
      '</div></section>' +
      '<div id="spaNotifList" style="margin-top:12px;"><div class="feed-empty-state">Loading notifications...</div></div>';

    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);

    var filterButtons = outlet.querySelectorAll('[data-filter]');
    filterButtons.forEach(function (btn) {
      var onFilter = function () {
        currentFilter = String(btn.getAttribute('data-filter') || 'all');
        filterButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderList(outlet);
      };
      btn.addEventListener('click', onFilter);
      cleanupFns.push(function () { btn.removeEventListener('click', onFilter); });
    });

    var markAllBtn = outlet.querySelector('#spaMarkAllReadBtn');
    if (markAllBtn) {
      var onMarkAll = async function () {
        markAllBtn.disabled = true;
        try {
          await window.SpopeerAPI.markAllNotificationsRead();
          notifications = notifications.map(function (n) {
            return Object.assign({}, n, { read: true, isRead: true });
          });
          renderCounts(outlet);
          renderList(outlet);
        } catch (_err) {
          // Keep UI state unchanged if API fails.
        } finally {
          markAllBtn.disabled = false;
        }
      };
      markAllBtn.addEventListener('click', onMarkAll);
      cleanupFns.push(function () { markAllBtn.removeEventListener('click', onMarkAll); });
    }

    var onListClick = async function (event) {
      var markBtn = event.target && event.target.closest ? event.target.closest('[data-mark-read]') : null;
      if (!markBtn) return;
      var notificationId = markBtn.getAttribute('data-mark-read');
      if (!notificationId) return;
      markBtn.disabled = true;
      try {
        await window.SpopeerAPI.markNotificationRead(notificationId);
        notifications = notifications.map(function (n) {
          var id = String(n.id || n.notificationId || '');
          if (id === String(notificationId)) return Object.assign({}, n, { read: true, isRead: true });
          return n;
        });
        renderCounts(outlet);
        renderList(outlet);
      } catch (_err) {
        markBtn.disabled = false;
      }
    };
    outlet.addEventListener('click', onListClick);
    cleanupFns.push(function () { outlet.removeEventListener('click', onListClick); });

    try {
      await refresh(outlet);
      filterButtons.forEach(function (b) {
        b.classList.toggle('active', String(b.getAttribute('data-filter') || '') === 'all');
      });
    } catch (_err) {
      var box = outlet.querySelector('#spaNotifList');
      if (box) box.innerHTML = '<p>Could not load notifications.</p>';
    }
  }

  function unmount() {
    clearCleanup();
  }

  if (window.SpaRouter) {
    window.SpaRouter.register('notifications', { mount: mount, unmount: unmount });
  }
})();
