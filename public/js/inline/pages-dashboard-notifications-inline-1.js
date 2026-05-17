(function () {
  const user = JSON.parse(localStorage.getItem('spopeer_user') || 'null');
  if (user && user.name) {
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('sidebarAvatar').textContent = initials;
    document.getElementById('sidebarName').textContent = user.name;
  }

  /* – user chip & profile menu: handled by shared-ui.js – */

  let notifications = [];

  const formatRelativeTime = (iso) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const normalizedType = (notification) => {
    const rawType = String((notification && notification.type) || '').toLowerCase();
    if (!rawType) return 'updates';
    if (rawType.indexOf('message') >= 0) return 'message';
    if (rawType.indexOf('follow') >= 0) return 'follow';
    if (rawType.indexOf('like') >= 0 || rawType.indexOf('comment') >= 0 || rawType.indexOf('repost') >= 0) return 'social';
    if (rawType.indexOf('event') >= 0 || rawType.indexOf('invite') >= 0 || rawType.indexOf('achievement') >= 0) return 'activity';
    return 'updates';
  };

  const getIconClass = (type) => {
    switch (normalizedType({ type })) {
      case 'social': return 'fa-solid fa-heart';
      case 'message': return 'fa-regular fa-paper-plane';
      case 'follow': return 'fa-solid fa-user-plus';
      case 'activity': return 'fa-solid fa-calendar-check';
      default: return 'fa-solid fa-bell';
    }
  };

  const unwrapNotifications = (result) => {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.notifications)) return result.notifications;
    if (result.data && Array.isArray(result.data.notifications)) return result.data.notifications;
    if (result.payload && Array.isArray(result.payload)) return result.payload;
    return [];
  };

  const senderInitials = (notification) => {
    const sender = notification && notification.sender;
    if (!sender) return '';
    const displayName = sender.displayName || [sender.firstName, sender.lastName].filter(Boolean).join(' ');
    if (displayName) {
      return displayName.split(' ').map(function (part) { return part[0] || ''; }).join('').slice(0, 2).toUpperCase();
    }
    return '';
  };

  const isRead = (notification) => !!(notification && (notification.isRead === true || notification.read === true));

  const getUnreadCount = (items) => items.filter(n => !isRead(n)).length;

  const renderNotifications = (filter = 'all') => {
    const list = document.getElementById('notifList');
    const emptyState = document.getElementById('emptyState');
    const unreadCountLabel = document.getElementById('unreadCount');
    const allCountLabel = document.getElementById('allCount');
    const unreadTabCountLabel = document.getElementById('unreadTabCount');

    const unreadCount = getUnreadCount(notifications);

    unreadCountLabel.textContent = unreadCount;
    allCountLabel.textContent = notifications.length;
    unreadTabCountLabel.textContent = unreadCount;

    const filtered = notifications.filter(n => {
      const type = normalizedType(n);
      if (filter === 'all') return true;
      if (filter === 'unread') return !isRead(n);
      if (filter === 'activity') return type === 'activity';
      if (filter === 'social') return type === 'social' || type === 'follow' || type === 'message';
      if (filter === 'updates') return type === 'updates';
      return true;
    });

    list.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    filtered.forEach(n => {
      const card = document.createElement('button');
      const type = normalizedType(n);
      const initials = senderInitials(n);
      card.type = 'button';
      card.className = `notif-card ${isRead(n) ? '' : 'unread'}`;
      card.innerHTML = `
        <div class="av-wrap">
          <div class="av ${type === 'follow' ? 'av-green' : type === 'social' ? 'av-orange' : type === 'activity' ? 'av-blue' : 'av-purple'}">
            ${initials ? `<span>${initials}</span>` : `<i class="${getIconClass(n.type)}"></i>`}
          </div>
          ${isRead(n) ? '' : '<div class="unread-dot"></div>'}
        </div>
        <div class="notif-body">
          <div class="notif-text">${n.text || n.message || 'You have a new notification.'}</div>
          <div class="notif-meta"><span class="notif-time">${formatRelativeTime(n.createdAt || n.updatedAt)}</span></div>
        </div>
        <div class="notif-right">
          <div class="thumb"><i class="fa-solid fa-chevron-right"></i></div>
        </div>
      `;

      card.addEventListener('click', async () => {
        try {
          if (!isRead(n) && n.id && window.SpopeerAPI && typeof window.SpopeerAPI.markNotificationRead === 'function') {
            await window.SpopeerAPI.markNotificationRead(n.id);
            notifications = notifications.map(function (item) {
              if (String(item.id || '') !== String(n.id || '')) return item;
              return Object.assign({}, item, { isRead: true, read: true });
            });
            renderNotifications(filter);
          }
        } catch (_err) {}

        if (n.href) window.location.href = n.href;
      });

      list.appendChild(card);
    });
  };

  document.querySelectorAll('.ftab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderNotifications(tab.dataset.filter);
    });
  });

  document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.markAllNotificationsRead === 'function') {
        await window.SpopeerAPI.markAllNotificationsRead();
      }
      notifications = notifications.map(function (item) {
        return Object.assign({}, item, { isRead: true, read: true });
      });
      renderNotifications(document.querySelector('.ftab.active')?.dataset.filter || 'all');
    } catch (_err) {}
  });

  (async function initNotificationsPage() {
    try {
      if (!window.SpopeerAPI || typeof window.SpopeerAPI.listNotifications !== 'function') {
        renderNotifications();
        return;
      }
      const result = await window.SpopeerAPI.listNotifications({ page: 1, limit: 120 });
      notifications = unwrapNotifications(result);
      renderNotifications();
    } catch (_err) {
      renderNotifications();
    }
  })();
})();
