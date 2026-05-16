(function () {
  function html(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
    });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function formatTime(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function applyStoredTheme() {
    var dark = localStorage.getItem('spopeerDarkMode') === 'enabled';
    document.body.classList.toggle('spm-dark-mode', dark);
  }

  function toggleTheme() {
    var enabled = !document.body.classList.contains('spm-dark-mode');
    document.body.classList.toggle('spm-dark-mode', enabled);
    localStorage.setItem('spopeerDarkMode', enabled ? 'enabled' : 'disabled');
  }

  function unwrapList(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.posts)) return result.posts;
    if (Array.isArray(result.events)) return result.events;
    if (Array.isArray(result.sponsorships)) return result.sponsorships;
    return [];
  }

  function unreadFromNotifications(result) {
    if (result && result.meta && typeof result.meta.unreadCount === 'number') return result.meta.unreadCount;
    if (result && result.data && result.data.meta && typeof result.data.meta.unreadCount === 'number') return result.data.meta.unreadCount;
    var rows = unwrapList(result);
    return rows.filter(function (item) { return item && item.isRead === false; }).length;
  }

  function renderRows(containerId, items, pickTitle, pickMeta, emptyText) {
    var box = document.getElementById(containerId);
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<div class="spm-empty">' + html(emptyText) + '</div>';
      return;
    }
    box.innerHTML = items.slice(0, 5).map(function (item) {
      return '<div class="spm-ai-row"><b>' + html(pickTitle(item)) + '</b><span>' + html(pickMeta(item)) + '</span></div>';
    }).join('');
  }

  async function init() {
    applyStoredTheme();

    var themeToggle = document.getElementById('spmAiThemeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function (event) {
        event.preventDefault();
        toggleTheme();
      });
    }

    try {
      await window.SpopeerAPI.me();
    } catch (_error) {
      var hasLocalSessionSignal = !!(
        localStorage.getItem('spopeer_user')
        || localStorage.getItem('spopeerUser')
        || localStorage.getItem('user')
        || localStorage.getItem('spopeer_token')
        || localStorage.getItem('spopeerToken')
        || localStorage.getItem('token')
      );
      if (!hasLocalSessionSignal) {
        window.location.href = '/mobile-login.html';
        return;
      }
      console.debug('mobile-ai: me() failed but local session exists, continuing', _error);
    }

    var responses = await Promise.allSettled([
      window.SpopeerAPI.listNotifications({ page: 1, limit: 30 }),
      window.SpopeerAPI.getUnreadMessageCount(),
      window.SpopeerAPI.getTrendingFeed(),
      window.SpopeerAPI.listEvents(),
      window.SpopeerAPI.listSponsorships({ limit: 20 }),
      window.SpopeerAPI.listMarketplaceListings({ page: 1, limit: 20, status: 'active' })
    ]);

    var notificationsRes = responses[0].status === 'fulfilled' ? responses[0].value : null;
    var unreadMessagesRes = responses[1].status === 'fulfilled' ? responses[1].value : null;
    var trendingRes = responses[2].status === 'fulfilled' ? responses[2].value : null;
    var eventsRes = responses[3].status === 'fulfilled' ? responses[3].value : null;
    var sponsorshipsRes = responses[4].status === 'fulfilled' ? responses[4].value : null;
    var marketplaceRes = responses[5].status === 'fulfilled' ? responses[5].value : null;

    var unreadNotifications = unreadFromNotifications(notificationsRes);
    var unreadMessages = Number((unreadMessagesRes && (unreadMessagesRes.unreadCount || (unreadMessagesRes.data && unreadMessagesRes.data.unreadCount))) || 0);
    var events = unwrapList(eventsRes);
    var sponsorships = unwrapList(sponsorshipsRes);
    var trendingPosts = unwrapList(trendingRes);
    var listings = unwrapList(marketplaceRes);

    setText('spmAiUnreadNotif', unreadNotifications);
    setText('spmAiUnreadMsg', unreadMessages);
    setText('spmAiEventCount', events.length);
    setText('spmAiOppCount', sponsorships.length + listings.length);

    renderRows(
      'spmAiTrending',
      trendingPosts,
      function (post) { return (post.content || 'Trending post').slice(0, 58); },
      function (post) { return (post.likesCount || 0) + ' likes · ' + formatTime(post.createdAt); },
      'No trending posts yet.'
    );

    renderRows(
      'spmAiEvents',
      events,
      function (event) { return event.title || event.name || 'Upcoming event'; },
      function (event) { return formatTime(event.startDate || event.date || event.createdAt); },
      'No events available right now.'
    );

    renderRows(
      'spmAiMarket',
      listings,
      function (listing) { return listing.title || listing.category || 'Marketplace listing'; },
      function (listing) {
        if (listing.price === 0) return 'Free';
        if (listing.price) return '$' + Number(listing.price).toLocaleString();
        return listing.status || 'Available';
      },
      'No marketplace listings available right now.'
    );
  }

  document.addEventListener('DOMContentLoaded', init);
})();
