ProfileSyncService.init();

    let currentUserId = JSON.parse(localStorage.getItem('spopeer_user') || '{}').id;
    let allNotifications = [];
    let currentFilter = 'all';

    // Build notifications from real marketplace activity only.
    async function generateNotifications() {
      const receivedInquiries = await MarketplaceService.getReceivedInquiries().catch(() => []);

      const notifications = [];

      // Add inquiry notifications
      for (const inquiry of receivedInquiries.slice(0, 5)) {
        notifications.push({
          id: `inquiry-${inquiry.id}`,
          type: 'inquiries',
          title: 'New Inquiry Received',
          description: inquiry.message ? inquiry.message.substring(0, 80) : 'Someone is interested in your listing',
          time: 'Recently',
          unread: inquiry.status === 'open',
          action: { text: 'View Inquiry', link: '/pages/marketplace/messages.html' }
        });
      }

      // Add message notifications (for unread messages)
      const conversations = await MarketplaceService.getConversations().catch(() => []);
      for (const conv of conversations.slice(0, 3)) {
        if (conv.unread > 0) {
          notifications.push({
            id: `message-${conv.otherId}`,
            type: 'messages',
            title: 'New Message',
            description: `${conv.lastMessage.substring(0, 60)}${conv.lastMessage.length > 60 ? '...' : ''}`,
            time: 'Recently',
            unread: true,
            action: { text: 'Reply', link: '/pages/marketplace/messages.html' }
          });
        }
      }

      return notifications.sort((a, b) => {
        // Put unread first
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return 0;
      });
    }

    async function loadNotifications() {
      try {
        const container = document.getElementById('notificationsContainer');
        allNotifications = await generateNotifications();

        if (allNotifications.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-bell"></i></div>
              <div class="empty-state-title">All caught up!</div>
              <div class="empty-state-text">You don't have any notifications right now</div>
            </div>
          `;
          return;
        }

        renderNotifications();
      } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('notificationsContainer').innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fa-solid fa-exclamation-triangle"></i></div>
            <div class="empty-state-title">Error Loading Notifications</div>
            <div class="empty-state-text">Please try refreshing the page</div>
          </div>
        `;
      }
    }

    function renderNotifications() {
      const container = document.getElementById('notificationsContainer');
      const filtered = currentFilter === 'all' 
        ? allNotifications 
        : allNotifications.filter(n => n.type === currentFilter);

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fa-solid fa-bell-slash"></i></div>
            <div class="empty-state-title">No ${currentFilter} notifications</div>
            <div class="empty-state-text">You're all set</div>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(notif => `
        <div class="notification-item ${notif.unread ? 'unread' : ''}">
          <div class="notification-icon ${notif.type}">
            ${notif.type === 'messages' ? '<i class="fa-solid fa-envelope"></i>' : ''}
            ${notif.type === 'inquiries' ? '<i class="fa-solid fa-question"></i>' : ''}
            ${notif.type === 'activity' ? '<i class="fa-solid fa-chart-line"></i>' : ''}
          </div>
          <div class="notification-content">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="notification-title">${notif.title}</div>
              ${notif.unread ? '<div class="notification-unread-dot"></div>' : ''}
            </div>
            <div class="notification-description">${notif.description}</div>
            <div class="notification-time">${notif.time}</div>
            ${notif.action ? `<div class="notification-action"><a href="${notif.action.link}">${notif.action.text} →</a></div>` : ''}
          </div>
        </div>
      `).join('');
    }

    function filterNotifications(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotifications();
    }

    document.getElementById('markAllReadBtn').onclick = () => {
      allNotifications = allNotifications.map(n => ({ ...n, unread: false }));
      renderNotifications();
      if (window.SpopeerToast) window.SpopeerToast.success('All notifications marked as read');
    };

    document.getElementById('clearAllBtn').onclick = () => {
      if (confirm('Are you sure you want to clear all notifications?')) {
        allNotifications = [];
        renderNotifications();
      }
    };

    loadNotifications();
