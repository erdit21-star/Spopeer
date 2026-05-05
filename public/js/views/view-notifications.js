(function () {
  'use strict';

  function unwrapNotifications(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.notifications)) return result.notifications;
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

  async function mount(outlet) {
    outlet.innerHTML = '<div class="post-card"><div class="post-body"><h3 style="margin:0 0 10px;">Notifications</h3><div id="spaNotifList" class="feed-empty-state">Loading notifications...</div></div></div>';
    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);

    var box = outlet.querySelector('#spaNotifList');
    try {
      var result = await window.SpopeerAPI.request('/api/notifications?limit=40');
      var rows = unwrapNotifications(result);
      var unread = unreadCount(result, rows);

      if (!rows.length) {
        box.innerHTML = '<p>No notifications yet.</p>';
        return;
      }

      box.innerHTML = '<p style="margin:0 0 10px;color:var(--muted);">' + unread + ' unread</p>';
      rows.forEach(function (n) {
        var item = document.createElement('article');
        item.className = 'post-card';
        item.style.marginBottom = '10px';
        item.innerHTML = '<div class="post-body"><strong>' + (n.type || 'Activity') + '</strong><p style="margin:6px 0 0;">' + (n.message || n.text || 'You have a new notification.') + '</p><small style="color:var(--muted);">' + timeAgo(n.createdAt) + ' ago</small></div>';
        box.appendChild(item);
      });
    } catch (_err) {
      box.innerHTML = '<p>Could not load notifications.</p>';
    }
  }

  function unmount() {}

  if (window.SpaRouter) {
    window.SpaRouter.register('notifications', { mount: mount, unmount: unmount });
  }
})();
