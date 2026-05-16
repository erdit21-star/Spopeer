(function () {
  const $ = (selector) => document.querySelector(selector);
  const app = { route: 'feed', user: null, selectedPost: null, selectedStory: null, storyFeed: [], storyIndex: -1, storyAutoTimer: null, selectedProfile: null, selectedProfileIdentifier: null, activeConversationId: null, activeConversationTargetId: null, selectedEvent: null, selectedSponsorship: null, selectedArticle: null, selectedMarketplaceListing: null, selectedThread: null, selectedGroup: null, detailBackRoute: null, libraryState: { items: [], type: 'all', source: 'all', sort: 'newest' }, eventsState: { items: [], source: 'all', sort: 'upcoming', query: '' }, sponsorshipState: { items: [], source: 'all', sort: 'newest', query: '', mode: 'all' }, notificationsState: { items: [], source: 'all', type: 'all', sort: 'newest', query: '' }, messageThreads: {} };

  function html(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
    });
  }

  function unwrapPosts(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.posts)) return result.posts;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.posts)) return result.data.posts;
    if (result.data && Array.isArray(result.data.rows)) return result.data.rows;
    return [];
  }

  function unwrapEvents(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.events)) return result.events;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.events)) return result.data.events;
    if (result.data && Array.isArray(result.data.rows)) return result.data.rows;
    if (result.data && Array.isArray(result.data.items)) return result.data.items;
    return [];
  }

  function unwrapSponsorships(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.sponsorships)) return result.sponsorships;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.sponsorships)) return result.data.sponsorships;
    if (result.data && Array.isArray(result.data.rows)) return result.data.rows;
    if (result.data && Array.isArray(result.data.items)) return result.data.items;
    return [];
  }

  function unwrapUser(result) {
    return (result && result.data && result.data.user) || (result && result.user) || (result && result.data) || result || null;
  }

  function getStoredSessionUser() {
    var raw = localStorage.getItem('spopeer_user')
      || localStorage.getItem('spopeerUser')
      || localStorage.getItem('user')
      || '';
    if (!raw) {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        return window.CurrentUserStore.getCurrentUser() || null;
      }
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function hasLocalSessionSignal() {
    return !!(
      getStoredSessionUser()
      || localStorage.getItem('spopeer_loggedIn') === 'true'
      || localStorage.getItem('spopeer_token')
      || localStorage.getItem('spopeerToken')
      || localStorage.getItem('token')
    );
  }

  function unwrapSearchUsers(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.results)) return result.results;
    if (Array.isArray(result.users)) return result.users;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.results)) return result.data.results;
    if (result.data && Array.isArray(result.data.users)) return result.data.users;
    if (result.payload && Array.isArray(result.payload)) return result.payload;
    return [];
  }

  function unwrapConversations(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.conversations)) return result.conversations;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.conversations)) return result.data.conversations;
    return [];
  }

  function unwrapNotifications(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.notifications)) return result.notifications;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.notifications)) return result.data.notifications;
    return [];
  }

  function unwrapFollowRequests(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.requests)) return result.requests;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.requests)) return result.data.requests;
    return [];
  }

  function unreadNotificationsCount(result) {
    if (!result) return 0;
    if (result.meta && typeof result.meta.unreadCount === 'number') return result.meta.unreadCount;
    if (result.data && result.data.meta && typeof result.data.meta.unreadCount === 'number') return result.data.meta.unreadCount;
    if (Array.isArray(result.data)) return result.data.filter(function (item) { return item && item.isRead === false; }).length;
    return 0;
  }

  function unwrapMarketplaceListings(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.listings)) return result.listings;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.listings)) return result.data.listings;
    if (result.data && result.data.payload && Array.isArray(result.data.payload)) return result.data.payload;
    return [];
  }

  function unwrapStories(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.stories)) return result.stories;
    if (result.data && Array.isArray(result.data.stories)) return result.data.stories;
    return [];
  }

  function unwrapConversationDetails(result) {
    return (result && result.data) || result || {};
  }

  function getMessageThreadState(conversationId) {
    var key = String(conversationId || '');
    if (!app.messageThreads[key]) {
      app.messageThreads[key] = {
        messages: [],
        participants: [],
        hasMore: false,
        oldestAt: '',
        loaded: false,
        loadingOlder: false
      };
    }
    return app.messageThreads[key];
  }

  function messageTextValue(message) {
    return message && (message.body || message.text || message.content) || '';
  }

  function isDeletedMessage(message) {
    if (!message) return false;
    if (message.deletedAt) return true;
    return String(messageTextValue(message)).trim() === '[Message deleted]';
  }

  function upsertThreadMessage(conversationId, message) {
    var thread = getMessageThreadState(conversationId);
    var id = String(message && message.id || '');
    if (!id) {
      thread.messages.push(message);
      return;
    }
    var index = thread.messages.findIndex(function (entry) {
      return String(entry && entry.id || '') === id;
    });
    if (index >= 0) {
      thread.messages[index] = Object.assign({}, thread.messages[index], message);
    } else {
      thread.messages.push(message);
    }
  }

  let realtimeSocket = null;
  let realtimeRefreshTimer = null;

  function getRealtimeToken() {
    return localStorage.getItem('spopeerToken') || localStorage.getItem('spopeer_token') || '';
  }

  function scheduleMessagesRefresh() {
    if (app.route !== 'messages') return;
    window.clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = window.setTimeout(function () {
      if (app.route === 'messages') {
        render();
      }
    }, 120);
  }

  function onRealtimeNewMessage(payload) {
    var conversationId = String(payload && payload.conversationId || '');
    if (!conversationId) return;
    var normalized = {
      id: payload.id,
      conversationId: payload.conversationId,
      senderId: payload.senderId || payload.fromId || null,
      fromId: payload.fromId || payload.senderId || null,
      receiverId: payload.receiverId || payload.toId || null,
      toId: payload.toId || payload.receiverId || null,
      body: payload.body || payload.text || payload.content || '',
      content: payload.content || payload.body || payload.text || '',
      text: payload.text || payload.content || payload.body || '',
      read: false,
      createdAt: payload.createdAt || payload.timestamp || new Date().toISOString()
    };
    upsertThreadMessage(conversationId, normalized);
    scheduleMessagesRefresh();
  }

  function onRealtimeMessageDeleted(payload) {
    var conversationId = String(payload && payload.conversationId || '');
    var messageId = String(payload && payload.id || '');
    if (!conversationId || !messageId) return;
    var thread = getMessageThreadState(conversationId);
    var index = thread.messages.findIndex(function (message) {
      return String(message && message.id || '') === messageId;
    });
    if (index >= 0) {
      thread.messages[index] = Object.assign({}, thread.messages[index], {
        body: '[Message deleted]',
        content: '[Message deleted]',
        text: '[Message deleted]',
        deletedAt: (payload && payload.deletedAt) || new Date().toISOString()
      });
      scheduleMessagesRefresh();
    }
  }

  function teardownRealtimeSocket() {
    if (!realtimeSocket) return;
    realtimeSocket.off('new_message', onRealtimeNewMessage);
    realtimeSocket.off('message_deleted', onRealtimeMessageDeleted);
    realtimeSocket.disconnect();
    realtimeSocket = null;
  }

  function initRealtimeSocket() {
    if (!window.io) return;
    var token = getRealtimeToken();
    if (!token) return;
    if (realtimeSocket) return;

    realtimeSocket = window.io({
      withCredentials: true,
      auth: { token: token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000
    });

    realtimeSocket.on('new_message', onRealtimeNewMessage);
    realtimeSocket.on('message_deleted', onRealtimeMessageDeleted);
    realtimeSocket.on('connect_error', function () {});
  }

  function displayNameFromUser(user) {
    return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Spopeer member';
  }

  function profileIdentifier(user) {
    return (user && (user.id || user.userId || user.email || user.userEmail || user.username)) || '';
  }

  function profileJoinedLabel(user) {
    var joinedValue = user && (user.createdAt || user.created_at || user.joinedAt || user.memberSince || user.updatedAt);
    if (!joinedValue) return '-';
    var joinedDate = new Date(joinedValue);
    if (Number.isNaN(joinedDate.getTime())) return '-';
    return joinedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  function resolveSubscriptionInfo(user) {
    if (!window.SubscriptionFeatures) {
      return {
        code: String((user && user.subscription) || 'free').toUpperCase(),
        label: 'Plan',
        features: []
      };
    }
    var resolved = window.SubscriptionFeatures.resolveCurrentPlan(user || {});
    return {
      code: resolved.code,
      label: resolved.label,
      features: resolved.features || []
    };
  }

  function renderSubscriptionFeatureRows(features, maxItems) {
    return (features || []).slice(0, maxItems || 4).map(function (feature) {
      return '<div class="spm-profile-field"><span>Feature</span><strong>' + html(feature.text || '') + '</strong></div>';
    }).join('');
  }

  function isSameUser(left, right) {
    if (!left || !right) return false;
    var leftIds = [left.id, left.userId, left.email, left.userEmail].filter(Boolean).map(function (v) { return String(v).toLowerCase(); });
    var rightIds = [right.id, right.userId, right.email, right.userEmail].filter(Boolean).map(function (v) { return String(v).toLowerCase(); });
    return leftIds.some(function (id) { return rightIds.indexOf(id) >= 0; });
  }

  function profileExtraFields(user) {
    var fields = [
      ['height', 'Height'],
      ['weight', 'Weight'],
      ['gender', 'Gender'],
      ['dob', 'Date of Birth'],
      ['nationality', 'Nationality'],
      ['strongFoot', 'Strong Foot'],
      ['playingStyle', 'Playing Style'],
      ['highestLevel', 'Highest Level'],
      ['competitionHistory', 'Competition History'],
      ['upcomingEvents', 'Upcoming Events'],
      ['goals', 'Goals'],
      ['availability', 'Availability'],
      ['clubBudget', 'Club Budget'],
      ['revenueStreams', 'Revenue Streams'],
      ['feeStructure', 'Fee Structure'],
      ['trainingRoutine', 'Training Routine'],
      ['nutritionDiet', 'Nutrition & Diet'],
      ['injuryHistory', 'Injury History'],
      ['currentInjuries', 'Current Injuries'],
      ['medicalHistory', 'Medical History']
    ];

    return fields
      .map(function (tuple) {
        var key = tuple[0];
        var label = tuple[1];
        var value = user && user[key];
        if (value === undefined || value === null) return null;
        if (Array.isArray(value)) value = value.join(', ');
        value = String(value).trim();
        if (!value) return null;
        return { label: label, value: value };
      })
      .filter(Boolean);
  }

  function belongsToCurrentUser(item, user) {
    if (!item || !user) return false;
    var userIds = [user.id, user.userId, user.email, user.userEmail]
      .filter(function (v) { return v !== undefined && v !== null && String(v).trim() !== ''; })
      .map(function (v) { return String(v).toLowerCase(); });

    if (!userIds.length) return false;

    var author = item.author || item.user || {};
    var itemIds = [
      item.userId,
      item.authorId,
      item.email,
      item.userEmail,
      author.id,
      author.userId,
      author.email
    ].filter(function (v) { return v !== undefined && v !== null && String(v).trim() !== ''; })
      .map(function (v) { return String(v).toLowerCase(); });

    return itemIds.some(function (id) { return userIds.indexOf(id) >= 0; });
  }

  async function fetchMyUploadedMedia(user) {
    var out = [];
    var seen = {};

    function add(url, source, type) {
      var normalized = String(url || '').trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      out.push({ url: normalized, source: source || 'media', type: type || (isVideoMediaUrl(normalized) ? 'video' : 'image') });
    }

    add(user && (user.avatarUrl || user.avatar), 'avatar', 'image');
    add(user && (user.coverPhotoUrl || user.coverUrl || user.coverImage), 'cover', 'image');

    var responses = await Promise.allSettled([
      window.SpopeerAPI.listPosts({ limit: 120, page: 1 }),
      fetchStoriesFeed()
    ]);

    if (responses[0].status === 'fulfilled') {
      unwrapPosts(responses[0].value)
        .filter(function (post) { return belongsToCurrentUser(post, user); })
        .forEach(function (post) {
          add(mediaUrlForPost(post), 'post', postMediaType(post) || 'image');
        });
    }

    if (responses[1].status === 'fulfilled') {
      (responses[1].value || [])
        .filter(function (story) { return belongsToCurrentUser(story, user); })
        .forEach(function (story) {
          add(storyMediaUrl(story), 'story', storyMediaType(story));
        });
    }

    return out.filter(function (item) { return item.type === 'image'; });
  }

  async function fetchPublicProfile(identifier) {
    if (!identifier) return null;
    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.getPublicProfile === 'function') {
        var direct = await window.SpopeerAPI.getPublicProfile(identifier);
        return unwrapUser(direct);
      }
    } catch (_error) {}

    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.request === 'function') {
        var fallback = await window.SpopeerAPI.request('/api/users/' + encodeURIComponent(identifier));
        return unwrapUser(fallback);
      }
    } catch (_error2) {}

    return null;
  }

  function initialForName(name) {
    return String(name || 'S').charAt(0).toUpperCase();
  }

  function formatTime(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Just now';
    var diffMs = Date.now() - date.getTime();
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return date.toLocaleDateString();
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

  function setTitle(title, subtitle) {
    $('#spmTitle').textContent = title;
    $('#spmSubtitle').textContent = subtitle || 'Sports network';
  }

  function mediaUrlForPost(post) {
    return post.video || post.videoUrl || post.mediaUrl || post.image || post.imageUrl || '';
  }

  function isVideoMediaUrl(url) {
    return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(String(url || ''));
  }

  function postMediaType(post) {
    var type = String(post.type || '').toLowerCase();
    if (type === 'video') return 'video';
    var media = mediaUrlForPost(post);
    if (!media) return null;
    return isVideoMediaUrl(media) ? 'video' : 'image';
  }

  function postImageUrl(post) {
    var type = postMediaType(post);
    return type === 'image' ? mediaUrlForPost(post) : '';
  }

  function hasPostImage(post) {
    return Boolean(postImageUrl(post));
  }

  function imageForPost(post) {
    return postImageUrl(post);
  }

  function postVideoUrl(post) {
    return postMediaType(post) === 'video' ? mediaUrlForPost(post) : '';
  }

  function authorName(post) {
    const a = post.author || post.user || {};
    return a.displayName || [a.firstName, a.lastName].filter(Boolean).join(' ') || 'Spopeer member';
  }

  function postAuthorIdentifier(post) {
    var author = post && (post.author || post.user) || {};
    return (post && (post.authorId || post.userId || post.authorEmail || post.userEmail || author.id || author.userId || author.email || author.userEmail)) || '';
  }

  function openPostAuthorProfile(post) {
    var identifier = postAuthorIdentifier(post);
    if (!identifier) return;
    app.selectedProfile = post.author || post.user || null;
    app.selectedProfileIdentifier = identifier;
    app.route = 'public-profile';
    render();
  }

  function renderPostCard(post) {
    const card = document.createElement('article');
    card.className = 'spm-media-card';
    card.innerHTML = `
      <div class="spm-media-bg" style="background-image:url('${html(imageForPost(post))}')"></div>
      <div class="spm-media-content">
        <strong>${html(authorName(post))}</strong>
        <p>${html(post.content || 'Shared a sports update.')}</p>
      </div>
      <div class="spm-media-actions">
        <button type="button" data-like="${html(post.id)}"><i class="fa-solid fa-heart"></i></button>
        <button type="button" data-comments="${html(post.id)}"><i class="fa-solid fa-comment"></i></button>
      </div>`;

    const likeButton = card.querySelector('[data-like]');
    const commentButton = card.querySelector('[data-comments]');

    likeButton.addEventListener('click', async function () {
      try {
        await window.SpopeerAPI.toggleLike(post.id);
        likeButton.style.background = 'rgba(239,68,68,.85)';
      } catch (error) {
        alert(error.message || 'Could not like post');
      }
    });

    commentButton.addEventListener('click', function () {
      app.selectedPost = post;
      app.route = 'post';
      render();
    });

    return card;
  }

  function renderFeedPostCard(post) {
    var card = document.createElement('article');
    card.className = 'spm-feed-card';
    var mediaType = postMediaType(post);
    var mediaMarkup = '';
    if (mediaType === 'video') {
      mediaMarkup = '<video class="spm-feed-video" controls playsinline preload="metadata" src="' + html(postVideoUrl(post)) + '"></video>';
    } else if (hasPostImage(post)) {
      mediaMarkup = '<div class="spm-feed-image" style="background-image:url(\'' + html(imageForPost(post)) + '\')"></div>';
    }
    card.innerHTML = `
      <div class="spm-feed-head">
        <div class="spm-mini-avatar"></div>
        <div class="spm-feed-title-wrap">
          <strong class="spm-feed-author-link" data-author-profile="1">${html(authorName(post))}</strong>
          <small>${html(formatTime(post.createdAt || post.created_at))}</small>
        </div>
      </div>
      ${mediaMarkup}
      <p class="spm-feed-copy">${html(post.content || 'Shared a sports update.')}</p>
      <div class="spm-feed-meta">
        <button class="spm-feed-chip" type="button" data-like="${html(post.id)}">❤️ ${Number(post.likesCount || 0)}</button>
        <button class="spm-feed-chip" type="button" data-comments="${html(post.id)}">💬 ${Number(post.commentsCount || 0)}</button>
        <span class="spm-feed-chip static">${html(post.sport || 'Sport')}</span>
      </div>`;

    var likeButton = card.querySelector('[data-like]');
    var commentButton = card.querySelector('[data-comments]');
    var authorButton = card.querySelector('[data-author-profile]');

    if (authorButton) {
      authorButton.addEventListener('click', function () {
        openPostAuthorProfile(post);
      });
    }

    likeButton.addEventListener('click', async function () {
      try {
        await window.SpopeerAPI.toggleLike(post.id);
        likeButton.textContent = '❤️ ' + (Number(post.likesCount || 0) + 1);
      } catch (error) {
        alert(error.message || 'Could not like post');
      }
    });

    commentButton.addEventListener('click', function () {
      app.selectedPost = post;
      app.route = 'post';
      render();
    });

    return card;
  }

  function eventTitle(event) {
    return event.title || event.name || event.eventName || 'Upcoming sports event';
  }

  function eventDate(event) {
    var value = event.startDate || event.startsAt || event.date || event.createdAt;
    if (!value) return 'Date to be announced';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function sponsorshipTitle(item) {
    return item.title || item.company || item.organization || item.role || 'Recommended opportunity';
  }

  function looksLikeArticlePost(post) {
    var type = String(post.type || '').toLowerCase();
    if (type === 'article') return true;
    var content = String(post.content || '').toLowerCase();
    if (content.length >= 280) return true;
    if (content.indexOf('article') >= 0 || content.indexOf('read:') >= 0) return true;
    return /https?:\/\/[^\s)]+/.test(content);
  }

  function unwrapLibraryCollection(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.items)) return result.data.items;
    if (result.payload && Array.isArray(result.payload)) return result.payload;
    if (Array.isArray(result.posts)) return result.posts;
    if (Array.isArray(result.bookmarks)) return result.bookmarks;
    if (Array.isArray(result.sponsorships)) return result.sponsorships;
    return [];
  }

  function extractUrls(text) {
    var matches = String(text || '').match(/https?:\/\/[^\s)]+/g);
    return matches || [];
  }

  function pickLibraryPostTitle(post) {
    var content = String(post.content || '').trim();
    if (!content) return 'Untitled post';
    return content.length > 90 ? content.slice(0, 90) + '...' : content;
  }

  function libraryTypeLabel(type) {
    var map = {
      posts: 'Posts',
      links: 'Links',
      articles: 'Articles',
      videos: 'Videos',
      images: 'Images',
      events: 'Events',
      sponsorships: 'Sponsorships'
    };
    return map[type] || 'Items';
  }

  function libraryTypeIcon(type) {
    var map = {
      posts: 'fa-regular fa-note-sticky',
      links: 'fa-solid fa-link',
      articles: 'fa-regular fa-newspaper',
      videos: 'fa-solid fa-video',
      images: 'fa-regular fa-image',
      events: 'fa-regular fa-calendar',
      sponsorships: 'fa-solid fa-handshake-angle'
    };
    return map[type] || 'fa-regular fa-folder-open';
  }

  function librarySourceLabel(source) {
    return source === 'created' ? 'Created' : 'Saved';
  }

  function normalizePostToLibraryItems(post, source) {
    if (!post || !post.id) return [];

    var createdAt = post.createdAt || post.created_at || new Date().toISOString();
    var urls = extractUrls(post.content);
    var mediaKind = postMediaType(post) === 'video' ? 'videos' : (postMediaType(post) === 'image' ? 'images' : null);
    var base = {
      id: 'post-' + post.id + '-' + source,
      source: source,
      postId: post.id,
      createdAt: createdAt,
      title: pickLibraryPostTitle(post),
      description: String(post.content || ''),
      sport: post.sport || '',
      href: '/feed.html',
      previewUrl: mediaUrlForPost(post),
      originalPost: post
    };
    var items = [Object.assign({}, base, { itemType: 'posts' })];

    if (urls.length) {
      items.push(Object.assign({}, base, {
        id: 'link-' + post.id + '-' + source,
        itemType: 'links',
        href: urls[0],
        description: urls[0]
      }));
    }

    if (looksLikeArticlePost(post)) {
      items.push(Object.assign({}, base, {
        id: 'article-' + post.id + '-' + source,
        itemType: 'articles'
      }));
    }

    if (mediaKind) {
      items.push(Object.assign({}, base, {
        id: mediaKind + '-' + post.id + '-' + source,
        itemType: mediaKind
      }));
    }

    return items;
  }

  function normalizeEventToLibraryItem(event, currentUserId) {
    var source = currentUserId && String(event.createdBy || '') === String(currentUserId) ? 'created' : 'saved';
    return {
      id: 'event-' + event.id + '-' + source,
      itemType: 'events',
      source: source,
      createdAt: event.createdAt || event.startDate || event.startsAt || new Date().toISOString(),
      title: eventTitle(event),
      description: event.description || event.location || event.venue || 'Event',
      sport: event.sport || '',
      href: '/pages/events/event.html',
      previewUrl: event.imageUrl || event.image || event.coverUrl || '',
      originalEvent: event
    };
  }

  function normalizeSponsorshipToLibraryItem(entry) {
    return {
      id: 'sponsorship-' + entry.id + '-created',
      itemType: 'sponsorships',
      source: 'created',
      createdAt: entry.createdAt || new Date().toISOString(),
      title: sponsorshipTitle(entry),
      description: entry.summary || entry.description || entry.mode || 'Sponsorship',
      sport: entry.sport || '',
      href: '/pages/sponsorship/sponsor.html',
      previewUrl: entry.imageUrl || entry.image || '',
      originalSponsorship: entry
    };
  }

  async function loadLibraryItems() {
    var profileResponse = null;
    try {
      profileResponse = await window.SpopeerAPI.getProfile();
    } catch (_error) {}

    var profileUser = unwrapUser(profileResponse) || app.user || {};
    if (profileUser && Object.keys(profileUser).length) {
      app.user = profileUser;
    }

    var currentUserId = profileUser && (profileUser.id || profileUser.userId) ? String(profileUser.id || profileUser.userId) : '';
    var responses = await Promise.allSettled([
      currentUserId ? window.SpopeerAPI.listPosts({ authorId: currentUserId, limit: 200, page: 1 }) : Promise.resolve([]),
      window.SpopeerAPI.listSavedPosts(),
      window.SpopeerAPI.listBookmarks(),
      window.SpopeerAPI.listEvents(),
      window.SpopeerAPI.listSponsorships({ limit: 200 })
    ]);

    var posts = responses[0].status === 'fulfilled' ? unwrapLibraryCollection(responses[0].value) : [];
    var savedPosts = responses[1].status === 'fulfilled' ? unwrapLibraryCollection(responses[1].value) : [];
    var bookmarks = responses[2].status === 'fulfilled' ? unwrapLibraryCollection(responses[2].value) : [];
    var events = responses[3].status === 'fulfilled' ? unwrapEvents(responses[3].value) : [];
    var sponsorships = responses[4].status === 'fulfilled' ? unwrapSponsorships(responses[4].value) : [];

    var items = [];
    var seen = {};

    function addItem(item) {
      if (!item || seen[item.id]) return;
      seen[item.id] = true;
      items.push(item);
    }

    (Array.isArray(posts) ? posts : []).forEach(function (post) {
      normalizePostToLibraryItems(post, 'created').forEach(addItem);
    });

    (Array.isArray(savedPosts) ? savedPosts : []).forEach(function (entry) {
      var post = entry && (entry.post || entry);
      normalizePostToLibraryItems(post, 'saved').forEach(addItem);
    });

    (Array.isArray(bookmarks) ? bookmarks : []).forEach(function (entry) {
      var post = entry && (entry.post || entry);
      normalizePostToLibraryItems(post, 'saved').forEach(addItem);
    });

    (Array.isArray(events) ? events : []).forEach(function (event) {
      addItem(normalizeEventToLibraryItem(event, currentUserId));
    });

    (Array.isArray(sponsorships) ? sponsorships : []).filter(function (entry) {
      if (!currentUserId) return false;
      return String(entry.userId || (entry.author && entry.author.id) || '') === currentUserId;
    }).forEach(function (entry) {
      addItem(normalizeSponsorshipToLibraryItem(entry));
    });

    var coverUrl = profileUser && (profileUser.coverPhotoUrl || profileUser.coverUrl || profileUser.coverImage);
    var avatarUrl = profileUser && (profileUser.avatarUrl || profileUser.avatar || profileUser.profileImageUrl);
    if (coverUrl) {
      addItem({
        id: 'profile-cover',
        itemType: 'images',
        source: 'created',
        createdAt: profileUser.updatedAt || new Date().toISOString(),
        title: 'Profile Cover Photo',
        description: 'Cover image used in your profile card.',
        sport: '',
        href: '/pages/profiles/edit-profile.html',
        previewUrl: coverUrl
      });
    }
    if (avatarUrl) {
      addItem({
        id: 'profile-avatar',
        itemType: 'images',
        source: 'created',
        createdAt: profileUser.updatedAt || new Date().toISOString(),
        title: 'Profile Photo',
        description: 'Avatar image used across your profile.',
        sport: '',
        href: '/pages/profiles/edit-profile.html',
        previewUrl: avatarUrl
      });
    }
    if (profileUser && profileUser.mediaLinks && profileUser.mediaLinks.highlightVideo) {
      addItem({
        id: 'profile-highlight-video',
        itemType: 'videos',
        source: 'created',
        createdAt: profileUser.updatedAt || new Date().toISOString(),
        title: 'Profile Highlight Video',
        description: 'Highlight video saved in your profile media links.',
        sport: '',
        href: profileUser.mediaLinks.highlightVideo,
        previewUrl: profileUser.mediaLinks.highlightVideo
      });
    }

    return items;
  }

  function sortLibraryItems(items, sortBy) {
    return items.slice().sort(function (left, right) {
      if (sortBy === 'title') {
        return String(left.title || '').localeCompare(String(right.title || ''));
      }
      var leftTime = new Date(left.createdAt).getTime() || 0;
      var rightTime = new Date(right.createdAt).getTime() || 0;
      return sortBy === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
    });
  }

  function getVisibleLibraryItems(items, type, source, sortBy) {
    var filtered = (items || []).filter(function (item) {
      if (type !== 'all' && item.itemType !== type) return false;
      if (source !== 'all' && item.source !== source) return false;
      return true;
    });
    return sortLibraryItems(filtered, sortBy);
  }

  function openLibraryItem(item) {
    if (!item) return;
    if (item.itemType === 'posts' && item.originalPost) {
      app.selectedPost = item.originalPost;
      app.route = 'post';
      render();
      return;
    }
    if (item.itemType === 'articles' && item.originalPost) {
      app.selectedArticle = item.originalPost;
      app.detailBackRoute = 'library';
      app.route = 'article-detail';
      render();
      return;
    }
    if (item.itemType === 'events' && item.originalEvent) {
      app.selectedEvent = item.originalEvent;
      app.detailBackRoute = 'library';
      app.route = 'event-detail';
      render();
      return;
    }
    if (item.itemType === 'sponsorships' && item.originalSponsorship) {
      app.selectedSponsorship = item.originalSponsorship;
      app.detailBackRoute = 'library';
      app.route = 'sponsorship-detail';
      render();
      return;
    }
    if (!item.href) return;
    if (/^https?:\/\//i.test(item.href)) {
      window.open(item.href, '_blank', 'noopener');
      return;
    }
    window.location.href = item.href;
  }

  function listingTitle(item) {
    return item.title || item.name || item.category || 'Marketplace listing';
  }

  function listingPrice(item) {
    if (item.price === 0) return 'Free';
    if (item.price) return '$' + Number(item.price).toLocaleString();
    return item.status || 'Available';
  }

  function eventBackRoute() {
    return app.detailBackRoute || 'events';
  }

  function sponsorshipBackRoute() {
    return app.detailBackRoute || 'sponsorship';
  }

  function threadBackRoute() {
    return app.detailBackRoute || 'training';
  }

  function groupBackRoute() {
    return app.detailBackRoute || 'community';
  }

  function normalizeBookmarkList(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.bookmarks)) return result.data.bookmarks;
    if (Array.isArray(result.bookmarks)) return result.bookmarks;
    return [];
  }

  function mapBookmarksByPostId(bookmarks) {
    var out = {};
    (bookmarks || []).forEach(function (entry) {
      var post = entry && entry.post;
      var postId = entry && (entry.postId || (post && post.id));
      if (!postId) return;
      out[String(postId)] = { bookmarkId: entry.id, postId: postId };
    });
    return out;
  }

  function storyAuthorName(story) {
    var author = story.author || story.user || {};
    return story.userName || author.displayName || [author.firstName, author.lastName].filter(Boolean).join(' ') || 'Member';
  }

  function storyMediaUrl(story) {
    return story.mediaUrl || story.thumbnailUrl || '';
  }

  function storyMediaType(story) {
    var type = String(story.type || story.mediaType || '').toLowerCase();
    if (type === 'video') return 'video';
    if (type === 'image') return 'image';
    return isVideoMediaUrl(storyMediaUrl(story)) ? 'video' : 'image';
  }

  function storyProfileIdentifier(story) {
    var author = story && (story.author || story.user) || {};
    return story && (story.userId || story.authorId || author.id || author.userId || author.email || story.userEmail) || '';
  }

  function clearStoryTimer() {
    if (app.storyAutoTimer) {
      window.clearTimeout(app.storyAutoTimer);
      app.storyAutoTimer = null;
    }
  }

  function renderStoriesRail(stories) {
    var items = (stories || []).filter(function (story) { return Boolean(storyMediaUrl(story)); }).slice(0, 20);

    var createCard = '<button class="spm-story-item add" type="button" data-story-create="1"><span class="spm-story-ring"><span class="spm-story-avatar">+</span></span><span class="spm-story-name">Your story</span></button>';
    var storiesHtml = items.map(function (story, index) {
      var author = storyAuthorName(story);
      return '<button class="spm-story-item" type="button" data-story-index="' + index + '"><span class="spm-story-ring"><span class="spm-story-avatar">' + html(initialForName(author)) + '</span></span><span class="spm-story-name">' + html(author.split(' ')[0] || author) + '</span></button>';
    }).join('');

    return '<section class="spm-stories"><div class="spm-stories-head"><strong>Stories</strong><small>Latest highlights</small></div><div class="spm-stories-row">' + createCard + storiesHtml + '</div></section>';
  }

  async function fetchStoriesFeed() {
    var response = await fetch('/api/stories', { credentials: 'include' });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error((payload && payload.error && payload.error.message) || 'Could not load stories');
    return unwrapStories(payload);
  }

  async function createStoryFromFile(file, caption, sport) {
    if (!file) throw new Error('Choose an image or video first.');
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 100MB.');
    }
    var formData = new FormData();
    formData.append('media', file);
    formData.append('caption', caption || '');
    formData.append('sport', sport || (app.user && (app.user.sport || app.user.primarySport)) || 'Sport');
    formData.append('type', file.type && file.type.indexOf('video/') === 0 ? 'video' : 'image');

    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.createStory === 'function') {
        return await window.SpopeerAPI.createStory(formData);
      }

      var response = await fetch('/api/stories', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        throw new Error((payload && payload.error && payload.error.message) || 'Could not publish story');
      }
      return payload;
    } catch (err) {
      throw new Error((err && err.message) || 'Could not publish story');
    }
  }

  function setBadge(id, count) {
    var el = document.getElementById(id);
    if (!el) return;
    var value = Number(count || 0);
    if (value > 0) {
      el.classList.remove('spm-hidden');
      el.textContent = value > 99 ? '99+' : String(value);
    } else {
      el.classList.add('spm-hidden');
      el.textContent = '0';
    }
  }

  async function refreshTopbarStats() {
    if (!window.SpopeerAPI) return;
    try {
      var responses = await Promise.allSettled([
        window.SpopeerAPI.listNotifications({ page: 1, limit: 10 }),
        window.SpopeerAPI.listPosts({ limit: 60, page: 1 }),
        window.SpopeerAPI.listMarketplaceListings({ limit: 1, page: 1, status: 'active' })
      ]);

      var notifCount = responses[0].status === 'fulfilled' ? unreadNotificationsCount(responses[0].value) : 0;
      var posts = responses[1].status === 'fulfilled' ? unwrapPosts(responses[1].value) : [];
      var articleCount = Array.isArray(posts) ? posts.filter(looksLikeArticlePost).length : 0;

      var marketplaceCount = 0;
      if (responses[2].status === 'fulfilled') {
        var marketResponse = responses[2].value;
        var marketItems = unwrapMarketplaceListings(marketResponse);
        if (marketResponse && marketResponse.meta && marketResponse.meta.pagination && typeof marketResponse.meta.pagination.total === 'number') {
          marketplaceCount = marketResponse.meta.pagination.total;
        } else if (marketResponse && marketResponse.data && marketResponse.data.meta && marketResponse.data.meta.pagination && typeof marketResponse.data.meta.pagination.total === 'number') {
          marketplaceCount = marketResponse.data.meta.pagination.total;
        } else {
          marketplaceCount = marketItems.length;
        }
      }

      setBadge('spmNotifBadge', notifCount);
      setBadge('spmArticlesBadge', articleCount);
      setBadge('spmMarketplaceBadge', marketplaceCount);
    } catch (_error) {}
  }

  const screens = {
    feed: async function () {
      setTitle('', '');
      const container = $('#spmScreen');
      container.classList.remove('spm-snap-feed');
      container.innerHTML = '<div class="spm-empty">Loading your feed...</div>';
      try {
        var responses = await Promise.allSettled([
          fetchStoriesFeed(),
          window.SpopeerAPI.listPosts({ limit: 12, page: 1, _: Date.now() }),
          window.SpopeerAPI.listEvents(),
          window.SpopeerAPI.listSponsorships({ limit: 5 })
        ]);

        var stories = responses[0].status === 'fulfilled' ? responses[0].value : [];
        var posts = responses[1].status === 'fulfilled' ? unwrapPosts(responses[1].value) : [];
        var events = responses[2].status === 'fulfilled' ? unwrapEvents(responses[2].value) : [];
        var opportunities = responses[3].status === 'fulfilled' ? unwrapSponsorships(responses[3].value) : [];

        var topEvent = events[0] || null;
        var topOpportunity = opportunities[0] || null;

        container.innerHTML = renderStoriesRail(stories);
        container.querySelectorAll('[data-story-create]').forEach(function (button) {
          button.addEventListener('click', function () {
            app.route = 'story-create';
            render();
          });
        });
        container.querySelectorAll('[data-story-index]').forEach(function (button) {
          button.addEventListener('click', function () {
            var index = Number(button.dataset.storyIndex || -1);
            if (Number.isNaN(index) || index < 0 || index >= stories.length) return;
            app.storyFeed = stories.slice();
            app.storyIndex = index;
            app.selectedStory = stories[index];
            app.route = 'story-view';
            render();
          });
        });

        if (topEvent) {
          var eventCard = document.createElement('article');
          eventCard.className = 'spm-feed-card';
          eventCard.innerHTML = `
            <div class="spm-feed-head">
              <div class="spm-mini-avatar"></div>
              <div class="spm-feed-title-wrap">
                <strong>${html(eventTitle(topEvent))}</strong>
                <small>${html(eventDate(topEvent))}</small>
              </div>
            </div>
            <p class="spm-feed-copy">${html(topEvent.description || topEvent.details || 'New event available in your sports network.')}</p>
            <div class="spm-feed-meta"><span class="spm-feed-chip static">Event</span><span class="spm-feed-chip static">${html(topEvent.location || topEvent.venue || 'Online / TBD')}</span></div>`;
          container.appendChild(eventCard);
        }

        if (topOpportunity) {
          var opportunityCard = document.createElement('article');
          opportunityCard.className = 'spm-feed-card';
          opportunityCard.innerHTML = `
            <div class="spm-feed-head">
              <div class="spm-mini-avatar"></div>
              <div class="spm-feed-title-wrap">
                <strong>${html(sponsorshipTitle(topOpportunity))}</strong>
                <small>Opportunity</small>
              </div>
            </div>
            <p class="spm-feed-copy">${html(topOpportunity.description || topOpportunity.summary || 'A new sponsorship or collaboration option is available for your profile.')}</p>
            <div class="spm-feed-meta"><span class="spm-feed-chip static">${html(topOpportunity.sport || 'Sports')}</span><span class="spm-feed-chip static">${html(topOpportunity.budget || topOpportunity.type || 'Open')}</span></div>`;
          container.appendChild(opportunityCard);
        }

        if (!posts.length) {
          var empty = document.createElement('div');
          empty.className = 'spm-empty';
          empty.textContent = 'No posts yet. Create the first post.';
          container.appendChild(empty);
          return;
        }

        posts.slice(0, 8).forEach(function (post) {
          container.appendChild(renderFeedPostCard(post));
        });
      } catch (error) {
        container.innerHTML = '<div class="spm-empty">Could not load feed.</div>';
        console.error('[mobile] feed error', error);
      }
    },

    'story-create': async function () {
      setTitle('New Story', 'Share for 24 hours');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      var defaultSport = (app.user && (app.user.sport || app.user.primarySport)) || '';
      screen.innerHTML = `
        <div class="spm-card">
          <h3 style="margin:0 0 10px;font-family:Syne,Arial,sans-serif">Create Story</h3>
          <p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700">Your story will be visible in mobile and desktop highlights.</p>
          <input id="spmStoryFile" type="file" accept="image/*,video/*" style="width:100%;margin-bottom:10px">
          <input id="spmStorySport" class="spm-search" placeholder="Sport" value="${html(defaultSport)}" style="margin-bottom:10px;height:42px">
          <textarea id="spmStoryCaption" class="spm-search" placeholder="Caption (optional)" style="height:88px;padding:12px;resize:none"></textarea>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button id="spmCancelStory" class="spm-chat-back" type="button">Cancel</button>
            <button id="spmPublishStory" class="spm-primary-action" type="button" style="margin-left:auto">Publish Story</button>
          </div>
          <div id="spmStoryError" class="spm-empty" style="display:none;padding:12px 0 0;color:#ef4444;text-align:left"></div>
        </div>`;

      document.getElementById('spmCancelStory').addEventListener('click', function () {
        app.route = 'feed';
        render();
      });

      document.getElementById('spmPublishStory').addEventListener('click', async function () {
        var btn = document.getElementById('spmPublishStory');
        var errorEl = document.getElementById('spmStoryError');
        var fileInput = document.getElementById('spmStoryFile');
        var file = fileInput && fileInput.files && fileInput.files[0];
        var caption = document.getElementById('spmStoryCaption').value.trim();
        var sport = document.getElementById('spmStorySport').value.trim();

        errorEl.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Publishing...';

        try {
          await createStoryFromFile(file, caption, sport);
          app.route = 'feed';
          render();
        } catch (error) {
          errorEl.textContent = error.message || 'Could not publish story.';
          errorEl.style.display = 'block';
        } finally {
          btn.disabled = false;
          btn.textContent = 'Publish Story';
        }
      });
    },

    'story-view': async function () {
      setTitle('Story', 'Highlights');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      clearStoryTimer();

      var storyList = Array.isArray(app.storyFeed) ? app.storyFeed : [];
      if (app.storyIndex >= 0 && app.storyIndex < storyList.length) {
        app.selectedStory = storyList[app.storyIndex];
      }
      var story = app.selectedStory;
      if (!story) {
        app.route = 'feed';
        render();
        return;
      }

      var mediaType = storyMediaType(story);
      var mediaUrl = storyMediaUrl(story);
      var mediaHtml = mediaType === 'video'
        ? '<video id="spmStoryMedia" class="spm-story-view-media" controls playsinline autoplay muted src="' + html(mediaUrl) + '"></video>'
        : '<div class="spm-story-view-media" style="background-image:url(\'' + html(mediaUrl) + '\')"></div>';
      var author = storyAuthorName(story);
      var likesCount = Number(story.likesCount || 0);
      var hasPrev = app.storyIndex > 0;
      var hasNext = app.storyIndex >= 0 && app.storyIndex < (storyList.length - 1);

      screen.innerHTML = `
        <article class="spm-story-view-card">
          ${mediaHtml}
          <div class="spm-story-view-body">
            <strong>${html(author)}</strong>
            <small>${html(formatTime(story.createdAt))} · ${html(story.sport || 'Sport')}</small>
            <p>${html(story.caption || 'Shared a new story.')}</p>
            <div class="spm-story-action-row">
              <button id="spmStoryLikeBtn" class="spm-story-action" type="button">❤️ <span id="spmStoryLikeCount">${likesCount}</span></button>
              <button id="spmStoryShareBtn" class="spm-story-action" type="button">🔗 Share</button>
              <button id="spmStoryMoreBtn" class="spm-story-action" type="button">⋯ More</button>
            </div>
            <div id="spmStoryMoreMenu" class="spm-story-more-menu spm-hidden">
              <button id="spmStoryViewProfileBtn" type="button">View Profile</button>
              <button id="spmStoryCloseMenuBtn" type="button">Close</button>
            </div>
            <div class="spm-story-nav-row">
              <button id="spmStoryPrevBtn" class="spm-chat-back" type="button" ${hasPrev ? '' : 'disabled'}>Previous</button>
              <button id="spmStoryBackBtn" class="spm-chat-back" type="button">Back to Feed</button>
              <button id="spmStoryNextBtn" class="spm-chat-back" type="button" ${hasNext ? '' : 'disabled'}>Next</button>
            </div>
          </div>
        </article>`;

      function goToStoryIndex(nextIndex) {
        if (nextIndex < 0 || nextIndex >= storyList.length) {
          app.route = 'feed';
          render();
          return;
        }
        app.storyIndex = nextIndex;
        app.selectedStory = storyList[nextIndex];
        render();
      }

      document.getElementById('spmStoryBackBtn').addEventListener('click', function () {
        app.route = 'feed';
        render();
      });

      var prevBtn = document.getElementById('spmStoryPrevBtn');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          goToStoryIndex(app.storyIndex - 1);
        });
      }

      var nextBtn = document.getElementById('spmStoryNextBtn');
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          goToStoryIndex(app.storyIndex + 1);
        });
      }

      var likeBtn = document.getElementById('spmStoryLikeBtn');
      if (likeBtn) {
        likeBtn.addEventListener('click', async function () {
          if (!story.id || story.__likedByViewer) return;
          likeBtn.disabled = true;
          try {
            var response = await fetch('/api/stories/' + encodeURIComponent(story.id) + '/like', {
              method: 'POST',
              credentials: 'include'
            });
            var payload = await response.json().catch(function () { return {}; });
            if (!response.ok) throw new Error((payload && payload.error && payload.error.message) || 'Could not like story');
            story.__likedByViewer = true;
            story.likesCount = Number((payload && payload.data && payload.data.likesCount) || story.likesCount || 0);
            document.getElementById('spmStoryLikeCount').textContent = String(story.likesCount);
            likeBtn.classList.add('active');
          } catch (_error) {
            likeBtn.disabled = false;
          }
        });
      }

      var shareBtn = document.getElementById('spmStoryShareBtn');
      if (shareBtn) {
        shareBtn.addEventListener('click', function () {
          var shareUrl = window.location.origin + '/feed.html';
          if (navigator.share) {
            navigator.share({ title: 'Spopeer Story', text: author + ' shared a story', url: shareUrl }).catch(function () {});
            return;
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(function () {
              shareBtn.textContent = 'Copied';
              window.setTimeout(function () { shareBtn.textContent = '🔗 Share'; }, 1200);
            }).catch(function () {});
          }
        });
      }

      var moreBtn = document.getElementById('spmStoryMoreBtn');
      var moreMenu = document.getElementById('spmStoryMoreMenu');
      if (moreBtn && moreMenu) {
        moreBtn.addEventListener('click', function () {
          moreMenu.classList.toggle('spm-hidden');
        });
      }

      var closeMenuBtn = document.getElementById('spmStoryCloseMenuBtn');
      if (closeMenuBtn && moreMenu) {
        closeMenuBtn.addEventListener('click', function () {
          moreMenu.classList.add('spm-hidden');
        });
      }

      var viewProfileBtn = document.getElementById('spmStoryViewProfileBtn');
      if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', function () {
          var profileId = storyProfileIdentifier(story);
          if (!profileId) return;
          app.selectedProfile = story.author || story.user || null;
          app.selectedProfileIdentifier = profileId;
          app.route = 'public-profile';
          render();
        });
      }

      if (story.id) {
        fetch('/api/stories/' + encodeURIComponent(story.id) + '/view', {
          method: 'POST',
          credentials: 'include'
        }).catch(function () {});
      }

      var mediaNode = document.getElementById('spmStoryMedia');
      if (mediaNode && mediaType === 'video') {
        mediaNode.addEventListener('ended', function () {
          goToStoryIndex(app.storyIndex + 1);
        });
      } else {
        app.storyAutoTimer = window.setTimeout(function () {
          goToStoryIndex(app.storyIndex + 1);
        }, 6500);
      }
    },

    create: function () {
      setTitle('Create Post', 'Share your update');
      $('#spmScreen').classList.remove('spm-snap-feed');
      $('#spmScreen').innerHTML = `
        <div class="spm-compose">
          <div class="spm-compose-head">
            <button type="button" id="spmCancelPost">Cancel</button>
            <strong>Create Post</strong>
            <button type="button" id="spmPostBtn">Post</button>
          </div>
          <textarea id="spmPostContent" placeholder="Share your update..."></textarea>
          <div class="spm-compose-tools"><span>📷 Photo</span><span>🎥 Video</span><span>📊 Poll</span></div>
        </div>`;

      $('#spmCancelPost').onclick = function () { app.route = 'feed'; render(); };
      $('#spmPostBtn').onclick = async function () {
        const content = $('#spmPostContent').value.trim();
        if (!content) return alert('Write something before posting.');
        try {
          await window.SpopeerAPI.createPost({ content: content, sport: app.user && (app.user.sport || app.user.primarySport) });
          app.route = 'feed';
          render();
        } catch (error) {
          alert(error.message || 'Could not publish post.');
        }
      };
    },

    post: async function () {
      setTitle('Post', 'Comments');
      $('#spmScreen').classList.remove('spm-snap-feed');
      const post = app.selectedPost;
      if (!post) { app.route = 'feed'; return render(); }
      var mediaType = postMediaType(post);
      var postMedia = mediaType === 'video'
        ? '<video class="spm-post-video" controls playsinline preload="metadata" src="' + html(postVideoUrl(post)) + '"></video>'
        : (mediaType === 'image'
          ? '<div class="spm-profile-hero"><div style="background-image:url(\'' + html(imageForPost(post)) + '\')"></div></div>'
          : '');
      $('#spmScreen').innerHTML = `
        ${postMedia}
        <div class="spm-card"><strong>${html(authorName(post))}</strong><p>${html(post.content)}</p></div>
        <div id="spmComments" class="spm-list"><div class="spm-empty">Loading comments...</div></div>
        <div class="spm-chat-input"><input id="spmCommentText" placeholder="Comment..."><button id="spmSendComment">Send</button></div>`;

      const commentsBox = $('#spmComments');
      try {
        const result = await window.SpopeerAPI.getComments(post.id);
        const comments = Array.isArray(result.data) ? result.data : (result.comments || []);
        commentsBox.innerHTML = comments.length ? '' : '<div class="spm-empty">No comments yet.</div>';
        comments.forEach(function (comment) {
          const item = document.createElement('div');
          item.className = 'spm-list-item';
          item.textContent = comment.content || comment.text || '';
          commentsBox.appendChild(item);
        });
      } catch (_error) {
        commentsBox.innerHTML = '<div class="spm-empty">Could not load comments.</div>';
      }

      $('#spmSendComment').onclick = async function () {
        const content = $('#spmCommentText').value.trim();
        if (!content) return;
        await window.SpopeerAPI.addComment(post.id, content);
        screens.post();
      };
    },

    search: async function () {
      setTitle('Search', 'Discover people');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = `
        <input id="spmSearchInput" class="spm-search" placeholder="Search athletes, coaches, clubs...">
        <div id="spmSearchResults" class="spm-list"><div class="spm-empty">Loading suggestions...</div></div>`;

      var input = document.getElementById('spmSearchInput');
      var box = document.getElementById('spmSearchResults');
      var timer = null;

      function renderUsers(users) {
        box.innerHTML = '';
        if (!users.length) {
          box.innerHTML = '<div class="spm-empty">No profiles found.</div>';
          return;
        }
        users.slice(0, 20).forEach(function (user) {
          var name = displayNameFromUser(user);
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'spm-search-user';
          item.innerHTML = `
            <span class="spm-search-avatar">${html(initialForName(name))}</span>
            <span class="spm-search-meta"><strong>${html(name)}</strong><small>${html(user.role || 'Member')} · ${html(user.sport || 'Sport')}</small></span>
            <span class="spm-search-arrow">›</span>`;
          item.addEventListener('click', function () {
            app.selectedProfile = user;
            app.selectedProfileIdentifier = profileIdentifier(user);
            app.route = 'public-profile';
            render();
          });
          box.appendChild(item);
        });
      }

      async function runSearch(term) {
        try {
          var result = await window.SpopeerAPI.searchUsers({ term: term || '', pageSize: 20 });
          renderUsers(unwrapSearchUsers(result));
        } catch (error) {
          box.innerHTML = '<div class="spm-empty">Search is unavailable right now.</div>';
        }
      }

      input.addEventListener('input', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          runSearch(input.value.trim());
        }, 260);
      });

      runSearch('');
    },

    'public-profile': async function () {
      setTitle('Profile', 'Public profile view');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');

      var baseUser = app.selectedProfile || {};
      var identifier = app.selectedProfileIdentifier || profileIdentifier(baseUser);

      screen.innerHTML = '<div class="spm-empty">Loading profile...</div>';

      var fullUser = null;
      try {
        fullUser = await fetchPublicProfile(identifier);
      } catch (_error) {}

      var user = fullUser || baseUser || {};
      var viewer = app.user || {};
      var ownProfile = isSameUser(viewer, user);
      var targetUserId = Number(user.id || user.userId || 0);
      var canFollow = !ownProfile && Number.isInteger(targetUserId) && targetUserId > 0;
      var isFollowing = false;
      var isPendingFollow = false;
      var pendingConnectionId = null;

      if (canFollow && window.SpopeerAPI && typeof window.SpopeerAPI.getFollowStatus === 'function') {
        try {
          var statusResult = await window.SpopeerAPI.getFollowStatus(targetUserId);
          var statusPayload = (statusResult && statusResult.data) || statusResult || {};
          isFollowing = !!statusPayload.isFollowing || statusPayload.relation === 'accepted' || statusPayload.connectionStatus === 'active';
          isPendingFollow = !!statusPayload.isPending || statusPayload.relation === 'pending' || statusPayload.connectionStatus === 'pending';
          pendingConnectionId = statusPayload.connectionId || null;
        } catch (_statusErr) {}
      }

      var name = displayNameFromUser(user);
      var avatarUrl = user.avatarUrl || user.avatar || user.profileImageUrl || user.profilePhoto || '';
      var coverUrl = user.coverUrl || user.coverImage || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=900';
      var role = user.role || user.userType || 'Sports profile';
      var sport = user.sport || user.primarySport || '-';
      var position = user.position || user.preferredPosition || user.cardPosition || '-';
      var team = user.team || user.clubName || user.organization || '-';
      var level = user.level || user.skillLevel || user.competitiveLevel || '-';
      var location = user.location || user.city || user.country || '-';
      var experience = user.experience || user.sportsYears || user.profExperience || user.yearsOfExperience || user.yearsOfCoaching || '-';
      var media = Number(user.mediaCount || user.postsCount || user.postCount || 0);
      var followers = Number(user.followersCount || user.followers || 0);
      var following = Number(user.followingCount || user.following || 0);
      var joinedLabel = profileJoinedLabel(user);
      var bio = user.bio || user.about || 'No bio added yet.';

      var extras = profileExtraFields(user);
      var extrasHtml = extras.length
        ? extras.map(function (entry) {
            return '<div class="spm-profile-field"><span>' + html(entry.label) + '</span><strong>' + html(entry.value) + '</strong></div>';
          }).join('')
        : '<div class="spm-empty" style="padding:8px 0 0">No additional profile details available.</div>';

      screen.innerHTML = `
        <section class="spm-profile-shell">
          <div class="spm-profile-cover" style="background-image:url('${html(coverUrl)}')"></div>
          <div class="spm-profile-card">
            <div class="spm-profile-head">
              <div class="spm-profile-avatar">${avatarUrl ? '<img src="' + html(avatarUrl) + '" alt="' + html(name) + '">' : html(initialForName(name))}</div>
              <div class="spm-profile-identity">
                <h2>${html(name)}</h2>
                <p>${html(role)} · ${html(sport)}</p>
              </div>
            </div>

            <div class="spm-profile-stats">
              <div><strong id="spmPublicFollowersCount">${followers.toLocaleString()}</strong><span>Followers</span></div>
              <div><strong id="spmPublicFollowingCount">${following.toLocaleString()}</strong><span>Following</span></div>
              <div><strong>${media.toLocaleString()}</strong><span>Media</span></div>
            </div>

            <div class="spm-profile-fields">
              <div class="spm-profile-field"><span>Sport</span><strong>${html(sport)}</strong></div>
              <div class="spm-profile-field"><span>Position</span><strong>${html(position)}</strong></div>
              <div class="spm-profile-field"><span>Team</span><strong>${html(team)}</strong></div>
              <div class="spm-profile-field"><span>Level</span><strong>${html(level)}</strong></div>
              <div class="spm-profile-field"><span>Location</span><strong>${html(location)}</strong></div>
              <div class="spm-profile-field"><span>Experience</span><strong>${html(String(experience))}</strong></div>
              <div class="spm-profile-field"><span>Member Since</span><strong>${html(joinedLabel)}</strong></div>
            </div>

            <div class="spm-profile-bio">${html(bio)}</div>

            <h4 class="spm-public-profile-title">More Details</h4>
            <div class="spm-profile-fields">${extrasHtml}</div>

            <div class="spm-profile-actions spm-public-profile-actions">
              <button id="spmBackToSearchBtn" class="spm-chat-back" type="button">Back to Search</button>
              ${canFollow ? '<button id="spmFollowUserBtn" class="spm-primary-action' + (isFollowing ? ' spm-following-btn' : '') + (isPendingFollow ? ' spm-following-btn' : '') + '" type="button"><i class="fa-solid fa-user-plus"></i> ' + (isFollowing ? 'Following' : (isPendingFollow ? 'Requested' : 'Follow')) + '</button>' : ''}
              ${ownProfile ? '' : '<button id="spmMessageUserBtn" class="spm-primary-action" type="button"><i class="fa-regular fa-paper-plane"></i> Message</button>'}
            </div>
          </div>
        </section>`;

      var backBtn = document.getElementById('spmBackToSearchBtn');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          app.route = 'search';
          render();
        });
      }

      var messageBtn = document.getElementById('spmMessageUserBtn');
      if (messageBtn) {
        messageBtn.addEventListener('click', async function () {
          try {
            var target = profileIdentifier(user);
            app.activeConversationTargetId = target || null;
            var convo = await window.SpopeerAPI.createConversation(target);
            var convoId = (convo && convo.data && convo.data.id) || convo.id;
            app.activeConversationId = convoId || null;
            app.route = 'messages';
            render();
          } catch (error) {
            console.error('[mobile] create conversation failed', error);
            app.route = 'messages';
            render();
          }
        });
      }

      var followBtn = document.getElementById('spmFollowUserBtn');
      if (followBtn) {
        followBtn.addEventListener('click', async function () {
          followBtn.disabled = true;
          try {
            if (isFollowing) {
              await window.SpopeerAPI.unfollowUser(targetUserId);
              isFollowing = false;
              followers = Math.max(0, followers - 1);
              pendingConnectionId = null;
            } else if (isPendingFollow) {
              if (window.SpopeerAPI && typeof window.SpopeerAPI.cancelFollowRequest === 'function' && pendingConnectionId) {
                await window.SpopeerAPI.cancelFollowRequest(pendingConnectionId);
              }
              isPendingFollow = false;
              pendingConnectionId = null;
            } else {
              if (window.SpopeerAPI && typeof window.SpopeerAPI.requestFollowUser === 'function') {
                var followRequestResult = await window.SpopeerAPI.requestFollowUser(targetUserId);
                var followRequestPayload = (followRequestResult && followRequestResult.data) || followRequestResult || {};
                if ((followRequestPayload.status || '').toLowerCase() === 'pending') {
                  isPendingFollow = true;
                  pendingConnectionId = followRequestPayload.connectionId || pendingConnectionId;
                } else {
                  isFollowing = true;
                  followers += 1;
                }
              } else {
                await window.SpopeerAPI.followUser(targetUserId);
                isFollowing = true;
                followers += 1;
              }
            }
            var followersEl = document.getElementById('spmPublicFollowersCount');
            if (followersEl) followersEl.textContent = followers.toLocaleString();
            followBtn.classList.toggle('spm-following-btn', isFollowing || isPendingFollow);
            followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> ' + (isFollowing ? 'Following' : (isPendingFollow ? 'Requested' : 'Follow'));
          } catch (_followError) {
          } finally {
            followBtn.disabled = false;
          }
        });
      }
    },

    messages: async function () {
      setTitle('Messages', 'Your conversations');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading messages...</div>';

      try {
        var result = await window.SpopeerAPI.listConversations();
        var conversations = unwrapConversations(result);

        if (!app.activeConversationId) {
          screen.innerHTML = '<div id="spmConvoList" class="spm-list"></div>';
          var list = document.getElementById('spmConvoList');
          if (!conversations.length) {
            list.innerHTML = '<div class="spm-empty">No conversations yet. Start from Search.</div>';
            return;
          }
          conversations.forEach(function (conversation) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'spm-convo-item';
            var preview = String(conversation.lastMessage || 'Say hello');
            if (preview === '[Message deleted]') preview = 'Message deleted';
            item.innerHTML = `
              <span class="spm-convo-avatar">${html(initialForName(conversation.otherName || 'S'))}</span>
              <span class="spm-convo-main"><strong>${html(conversation.otherName || 'Conversation')}</strong><small>${html(preview)}</small></span>
              <span class="spm-convo-side">${conversation.unread ? '<i>' + html(String(conversation.unread)) + '</i>' : html(formatTime(conversation.lastAt))}</span>`;
            item.addEventListener('click', function () {
              app.activeConversationId = conversation.id;
              app.activeConversationTargetId = conversation.otherId || null;
              render();
            });
            list.appendChild(item);
          });
          return;
        }

        var threadState = getMessageThreadState(app.activeConversationId);
        var detailsResult = await window.SpopeerAPI.getConversation(app.activeConversationId, { limit: 50 });
        var details = unwrapConversationDetails(detailsResult);
        threadState.messages = Array.isArray(details.messages) ? details.messages : [];
        threadState.participants = Array.isArray(details.participants) ? details.participants : [];
        threadState.hasMore = !!details.hasMore;
        threadState.oldestAt = details.oldestAt ? String(details.oldestAt) : '';
        threadState.loaded = true;

        var messages = threadState.messages;
        var participants = threadState.participants;
        var meId = Number(app.user && (app.user.id || app.user.userId) || 0);
        var otherParticipant = participants.find(function (participant) {
          return Number(participant && (participant.id || participant.userId) || 0) !== meId;
        });
        if (otherParticipant) {
          app.activeConversationTargetId = String(otherParticipant.id || otherParticipant.userId || '');
        }

        screen.innerHTML = `
          <div class="spm-chat">
            <div class="spm-chat-head"><button id="spmBackToConvos" class="spm-chat-back" type="button">← Back</button></div>
            <div id="spmChatBody" class="spm-chat-body"></div>
            <div class="spm-chat-input"><input id="spmChatText" placeholder="Type message"><button id="spmSendMsg">Send</button></div>
          </div>`;

        document.getElementById('spmBackToConvos').addEventListener('click', function () {
          app.activeConversationId = null;
          app.activeConversationTargetId = null;
          render();
        });

        function upsertMessage(message) {
          var id = String(message && message.id || '');
          if (!id) {
            threadState.messages.push(message);
            return;
          }
          var index = threadState.messages.findIndex(function (entry) {
            return String(entry && entry.id || '') === id;
          });
          if (index >= 0) {
            threadState.messages[index] = Object.assign({}, threadState.messages[index], message);
          } else {
            threadState.messages.push(message);
          }
        }

        async function loadOlderMessages() {
          if (!threadState.hasMore || threadState.loadingOlder || !threadState.oldestAt) return;
          threadState.loadingOlder = true;
          renderChatBody(true);
          try {
            var olderResult = await window.SpopeerAPI.getConversation(app.activeConversationId, {
              limit: 50,
              before: threadState.oldestAt
            });
            var olderDetails = unwrapConversationDetails(olderResult);
            var olderMessages = Array.isArray(olderDetails.messages) ? olderDetails.messages : [];
            var seen = new Set(threadState.messages.map(function (msg) { return String(msg && msg.id || ''); }));
            olderMessages = olderMessages.filter(function (msg) {
              var msgId = String(msg && msg.id || '');
              return !msgId || !seen.has(msgId);
            });
            threadState.messages = olderMessages.concat(threadState.messages);
            threadState.hasMore = !!olderDetails.hasMore;
            threadState.oldestAt = olderDetails.oldestAt ? String(olderDetails.oldestAt) : threadState.oldestAt;
          } catch (_olderError) {
          } finally {
            threadState.loadingOlder = false;
            renderChatBody(true);
          }
        }

        async function deleteMessage(messageId) {
          if (!messageId) return;
          if (!window.confirm('Delete this message?')) return;
          try {
            var deletedRaw = await window.SpopeerAPI.deleteConversationMessage(messageId);
            var deletedPayload = unwrapConversationDetails(deletedRaw);
            var deletedAt = deletedPayload.deletedAt || new Date().toISOString();
            var index = threadState.messages.findIndex(function (message) {
              return String(message && message.id || '') === String(messageId);
            });
            if (index >= 0) {
              threadState.messages[index] = Object.assign({}, threadState.messages[index], {
                body: '[Message deleted]',
                content: '[Message deleted]',
                text: '[Message deleted]',
                deletedAt: deletedAt
              });
              renderChatBody(false);
            }
          } catch (error) {
            alert((error && error.message) || 'Could not delete message.');
          }
        }

        function renderChatBody(keepScroll) {
          var body = document.getElementById('spmChatBody');
          var prevHeight = body.scrollHeight;
          var prevTop = body.scrollTop;
          body.innerHTML = '';

          if (threadState.hasMore) {
            var olderWrap = document.createElement('div');
            olderWrap.className = 'spm-chat-more-wrap';
            var olderBtn = document.createElement('button');
            olderBtn.type = 'button';
            olderBtn.id = 'spmLoadOlderMessages';
            olderBtn.className = 'spm-chat-more-btn';
            olderBtn.textContent = threadState.loadingOlder ? 'Loading...' : 'Load older messages';
            olderBtn.disabled = !!threadState.loadingOlder;
            olderWrap.appendChild(olderBtn);
            body.appendChild(olderWrap);
          }

          if (!threadState.messages.length) {
            body.innerHTML += '<div class="spm-empty">No messages yet. Say hello.</div>';
            return;
          }

          threadState.messages.forEach(function (message) {
            var bubbleRow = document.createElement('div');
            var isMine = Number(message.senderId || message.fromId) === Number(app.user && app.user.id);
            bubbleRow.className = 'spm-bubble-row' + (isMine ? ' me' : '');

            var bubble = document.createElement('div');
            bubble.className = 'spm-bubble' + (isMine ? ' me' : '') + (isDeletedMessage(message) ? ' deleted' : '');
            bubble.textContent = isDeletedMessage(message) ? '[Message deleted]' : messageTextValue(message);
            bubbleRow.appendChild(bubble);

            if (isMine && !isDeletedMessage(message) && message.id) {
              var deleteBtn = document.createElement('button');
              deleteBtn.type = 'button';
              deleteBtn.className = 'spm-delete-msg';
              deleteBtn.dataset.messageId = String(message.id);
              deleteBtn.textContent = 'Delete';
              bubbleRow.appendChild(deleteBtn);
            }

            body.appendChild(bubbleRow);
          });

          if (keepScroll) {
            body.scrollTop = prevTop + (body.scrollHeight - prevHeight);
          } else {
            body.scrollTop = body.scrollHeight;
          }
        }

        var body = document.getElementById('spmChatBody');
        renderChatBody(false);

        body.addEventListener('click', function (event) {
          var target = event.target;
          if (target && target.id === 'spmLoadOlderMessages') {
            loadOlderMessages();
            return;
          }
          if (target && target.classList.contains('spm-delete-msg')) {
            deleteMessage(target.dataset.messageId || '');
          }
        });

        document.getElementById('spmSendMsg').addEventListener('click', async function () {
          var input = document.getElementById('spmChatText');
          var sendBtn = document.getElementById('spmSendMsg');
          var text = input.value.trim();
          if (!text) return;
          if (text.length > 5000) {
            alert('Message is too long (max 5000 characters).');
            return;
          }
          if (sendBtn) sendBtn.disabled = true;
          try {
            var sentMessage = await window.SpopeerAPI.sendConversationMessage(app.activeConversationId, text);
            var sentPayload = unwrapConversationDetails(sentMessage);
            upsertMessage(sentPayload);

            input.value = '';
            renderChatBody(false);
          } catch (error) {
            try {
              // Fallback: recover conversation id from recipient and retry once.
              if (app.activeConversationTargetId) {
                var recovered = await window.SpopeerAPI.createConversation(app.activeConversationTargetId);
                var recoveredId = (recovered && recovered.data && recovered.data.id) || recovered.id;
                if (recoveredId) {
                  app.activeConversationId = recoveredId;
                  var recoveredSent = await window.SpopeerAPI.sendConversationMessage(app.activeConversationId, text);
                  upsertMessage(unwrapConversationDetails(recoveredSent));
                  input.value = '';
                  renderChatBody(false);
                  return;
                }
              }
            } catch (_fallbackError) {}
            alert(error.message || 'Could not send message.');
          } finally {
            if (sendBtn) sendBtn.disabled = false;
          }
        });

        document.getElementById('spmChatText').addEventListener('keydown', function (event) {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            document.getElementById('spmSendMsg').click();
          }
        });
      } catch (error) {
        screen.innerHTML = '<div class="spm-empty">Could not load messages.</div>';
      }
    },

    notifications: function () {
      setTitle('Notifications', 'Latest activity');
      var screen = $('#spmScreen');
      var state = app.notificationsState || { items: [], source: 'all', type: 'all', sort: 'newest', query: '' };
      app.notificationsState = state;
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading notifications...</div>';

      function normalizedType(notification) {
        var type = String((notification && notification.type) || '').toLowerCase();
        if (!type) return 'updates';
        if (type.indexOf('message') >= 0) return 'message';
        if (type.indexOf('follow') >= 0) return 'follow';
        if (type.indexOf('like') >= 0 || type.indexOf('comment') >= 0 || type.indexOf('repost') >= 0) return 'social';
        if (type.indexOf('event') >= 0 || type.indexOf('invite') >= 0 || type.indexOf('achievement') >= 0) return 'activity';
        return 'updates';
      }

      function notificationLabel(notification) {
        var rawType = String((notification && notification.type) || '').trim();
        if (!rawType) return 'Activity';
        var normalized = normalizedType(notification);
        if (normalized === 'social') return 'Social';
        if (normalized === 'message') return 'Message';
        if (normalized === 'follow') return 'Follow';
        if (normalized === 'activity') return 'Activity';
        return rawType.replace(/[_-]+/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
      }

      function isUnread(notification) {
        return !(notification && (notification.isRead === true || notification.read === true));
      }

      function notificationSortTime(notification) {
        var parsed = new Date(notification.createdAt || notification.updatedAt || Date.now());
        return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }

      function getVisibleNotifications() {
        var term = String(state.query || '').trim().toLowerCase();
        var filtered = (state.items || []).filter(function (notification) {
          if (state.source === 'unread' && !isUnread(notification)) return false;
          if (state.source === 'read' && isUnread(notification)) return false;
          if (state.type !== 'all' && normalizedType(notification) !== state.type) return false;
          if (!term) return true;
          var haystack = [notification.type, notification.text, notification.message].filter(Boolean).join(' ').toLowerCase();
          return haystack.indexOf(term) >= 0;
        });

        filtered.sort(function (left, right) {
          var leftTime = notificationSortTime(left);
          var rightTime = notificationSortTime(right);
          return state.sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
        });

        return filtered;
      }

      function markNotificationAsReadLocal(notificationId) {
        state.items = (state.items || []).map(function (notification) {
          var id = String(notification.id || notification.notificationId || '');
          if (id !== String(notificationId || '')) return notification;
          return Object.assign({}, notification, { isRead: true, read: true });
        });
      }

      function markAllNotificationsAsReadLocal() {
        state.items = (state.items || []).map(function (notification) {
          return Object.assign({}, notification, { isRead: true, read: true });
        });
      }

      if (!window.SpopeerAPI || typeof window.SpopeerAPI.listNotifications !== 'function') {
        screen.innerHTML = '<div class="spm-empty">Notifications are unavailable right now.</div>';
        return;
      }

      window.SpopeerAPI.listNotifications({ page: 1, limit: 120 }).then(function (result) {
        state.items = unwrapNotifications(result);

        var unreadCount = state.items.filter(isUnread).length;
        var messageCount = state.items.filter(function (n) { return normalizedType(n) === 'message'; }).length;
        var socialCount = state.items.filter(function (n) { return normalizedType(n) === 'social' || normalizedType(n) === 'follow'; }).length;

        screen.innerHTML = `
          <section class="spm-library-shell">
            <div class="spm-library-hero">
              <div>
                <p class="spm-library-kicker">Notifications Hub</p>
                <h2>All your social and activity updates.</h2>
                <p class="spm-library-copy">Live notifications from likes, follows, messages, and platform updates.</p>
              </div>
              <div class="spm-library-stats">
                <article><strong>${state.items.length}</strong><span>Total</span></article>
                <article><strong>${unreadCount}</strong><span>Unread</span></article>
                <article><strong>${messageCount}</strong><span>Messages</span></article>
              </div>
            </div>

            <div class="spm-library-controls">
              <div class="spm-library-source" id="spmNotifSource">
                <button type="button" class="spm-library-source-btn${state.source === 'all' ? ' active' : ''}" data-notif-source="all">All</button>
                <button type="button" class="spm-library-source-btn${state.source === 'unread' ? ' active' : ''}" data-notif-source="unread">Unread</button>
                <button type="button" class="spm-library-source-btn${state.source === 'read' ? ' active' : ''}" data-notif-source="read">Read</button>
              </div>
              <label class="spm-library-sort-wrap">
                <span>Sort</span>
                <select id="spmNotifSort" class="spm-library-sort">
                  <option value="newest"${state.sort === 'newest' ? ' selected' : ''}>Newest</option>
                  <option value="oldest"${state.sort === 'oldest' ? ' selected' : ''}>Oldest</option>
                </select>
              </label>
            </div>

            <div class="spm-library-tabs" id="spmNotifTypes">
              <button type="button" class="spm-library-tab${state.type === 'all' ? ' active' : ''}" data-notif-type="all">All <span>${state.items.length}</span></button>
              <button type="button" class="spm-library-tab${state.type === 'message' ? ' active' : ''}" data-notif-type="message">Messages <span>${messageCount}</span></button>
              <button type="button" class="spm-library-tab${state.type === 'social' ? ' active' : ''}" data-notif-type="social">Social <span>${socialCount}</span></button>
              <button type="button" class="spm-library-tab${state.type === 'activity' ? ' active' : ''}" data-notif-type="activity">Activity <span>${state.items.filter(function (n) { return normalizedType(n) === 'activity'; }).length}</span></button>
              <button type="button" class="spm-library-tab${state.type === 'updates' ? ' active' : ''}" data-notif-type="updates">Updates <span>${state.items.filter(function (n) { return normalizedType(n) === 'updates'; }).length}</span></button>
            </div>

            <input id="spmNotifSearch" class="spm-search" style="margin-top:4px" placeholder="Search notifications by type or message" value="${html(state.query)}">
            <div class="spm-detail-actions" style="margin-top:10px"><button id="spmMarkAllReadBtn" class="spm-chat-back" type="button">Mark All Read</button></div>
            <div id="spmNotificationsList"></div>
          </section>`;

        var list = document.getElementById('spmNotificationsList');

        function renderNotificationCards() {
          var notifications = getVisibleNotifications();
          list.innerHTML = '';
          if (!notifications.length) {
            list.innerHTML = '<div class="spm-empty">No notifications for this filter.</div>';
            return;
          }

          notifications.forEach(function (notification) {
            var id = String(notification.id || notification.notificationId || '');
            var unread = isUnread(notification);
            var card = document.createElement('article');
            card.className = 'spm-feed-card';
            card.innerHTML = `
              <div class="spm-feed-head">
                <div class="spm-mini-avatar"><i class="fa-regular fa-bell"></i></div>
                <div class="spm-feed-title-wrap">
                  <strong>${html(notificationLabel(notification))}</strong>
                  <small>${html(formatTime(notification.createdAt || notification.updatedAt))}</small>
                </div>
              </div>
              <p class="spm-feed-copy">${html(notification.text || notification.message || 'You have a new notification.')}</p>
              <div class="spm-feed-meta">
                <span class="spm-feed-chip static">${html(unread ? 'Unread' : 'Read')}</span>
                <span class="spm-feed-chip static">${html(normalizedType(notification))}</span>
              </div>
              <div class="spm-detail-actions">
                ${unread ? '<button type="button" class="spm-chat-back" data-mark-notif-read="' + html(id) + '">Mark Read</button>' : ''}
                ${notification.href ? '<button type="button" class="spm-primary-action" data-open-notif-href="' + html(notification.href) + '" data-notification-id="' + html(id) + '">Open</button>' : ''}
              </div>`;
            list.appendChild(card);
          });

          list.querySelectorAll('[data-mark-notif-read]').forEach(function (button) {
            button.addEventListener('click', async function () {
              var id = button.getAttribute('data-mark-notif-read');
              if (!id) return;
              button.disabled = true;
              try {
                await window.SpopeerAPI.markNotificationRead(id);
                markNotificationAsReadLocal(id);
                renderNotificationCards();
              } catch (_error) {
                button.disabled = false;
              }
            });
          });

          list.querySelectorAll('[data-open-notif-href]').forEach(function (button) {
            button.addEventListener('click', async function () {
              var href = button.getAttribute('data-open-notif-href');
              var id = button.getAttribute('data-notification-id');
              if (!href) return;
              if (id && window.SpopeerAPI && typeof window.SpopeerAPI.markNotificationRead === 'function') {
                try {
                  await window.SpopeerAPI.markNotificationRead(id);
                } catch (_error) {
                  // Continue to destination even if mark-read fails.
                }
                markNotificationAsReadLocal(id);
              }
              window.location.href = href;
            });
          });
        }

        document.querySelectorAll('[data-notif-source]').forEach(function (button) {
          button.addEventListener('click', function () {
            state.source = button.getAttribute('data-notif-source') || 'all';
            document.querySelectorAll('[data-notif-source]').forEach(function (node) {
              node.classList.toggle('active', node === button);
            });
            renderNotificationCards();
          });
        });

        document.querySelectorAll('[data-notif-type]').forEach(function (button) {
          button.addEventListener('click', function () {
            state.type = button.getAttribute('data-notif-type') || 'all';
            document.querySelectorAll('[data-notif-type]').forEach(function (node) {
              node.classList.toggle('active', node === button);
            });
            renderNotificationCards();
          });
        });

        var sortSelect = document.getElementById('spmNotifSort');
        if (sortSelect) {
          sortSelect.addEventListener('change', function () {
            state.sort = sortSelect.value || 'newest';
            renderNotificationCards();
          });
        }

        var searchInput = document.getElementById('spmNotifSearch');
        if (searchInput) {
          var searchTimer = null;
          searchInput.addEventListener('input', function () {
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(function () {
              state.query = searchInput.value || '';
              renderNotificationCards();
            }, 180);
          });
        }

        var markAllBtn = document.getElementById('spmMarkAllReadBtn');
        if (markAllBtn) {
          markAllBtn.addEventListener('click', async function () {
            markAllBtn.disabled = true;
            try {
              await window.SpopeerAPI.markAllNotificationsRead();
              markAllNotificationsAsReadLocal();
              renderNotificationCards();
            } catch (_error) {
              markAllBtn.disabled = false;
            }
          });
        }

        renderNotificationCards();
      }).catch(function () {
        screen.innerHTML = '<div class="spm-empty">Could not load notifications.</div>';
      });
    },

    articles: async function () {
      setTitle('Articles', 'Latest from the network');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading articles...</div>';

      try {
        var responses = await Promise.allSettled([
          window.SpopeerAPI.listPosts({ limit: 60, page: 1, _: Date.now() }),
          window.SpopeerAPI.listBookmarks()
        ]);
        var result = responses[0].status === 'fulfilled' ? responses[0].value : [];
        var bookmarksResult = responses[1].status === 'fulfilled' ? responses[1].value : [];
        var posts = unwrapPosts(result).filter(looksLikeArticlePost);
        var bookmarkMap = mapBookmarksByPostId(normalizeBookmarkList(bookmarksResult));

        if (!posts.length) {
          screen.innerHTML = '<div class="spm-empty">No articles found yet.</div>';
          return;
        }

        screen.innerHTML = '<div class="spm-screen-header"><h2 class="spm-screen-title"><i class="fa-regular fa-newspaper"></i> Articles</h2><p class="spm-screen-sub">Long-form posts and article-style updates from the network</p></div><div id="spmArticlesList"></div>';
        var list = document.getElementById('spmArticlesList');
        posts.slice(0, 20).forEach(function (post) {
          var card = document.createElement('article');
          card.className = 'spm-feed-card';
          var previewText = String(post.content || 'Article update');
          var excerpt = previewText.length > 220 ? previewText.slice(0, 220) + '...' : previewText;
          var bookmarkInfo = bookmarkMap[String(post.id)] || null;
          var savedBadge = bookmarkInfo ? '<span class="spm-feed-chip static spm-saved-chip"><i class="fa-solid fa-bookmark"></i> Saved</span>' : '';
          var saveLabel = bookmarkInfo ? 'Saved' : 'Save';
          card.innerHTML = `
            <div class="spm-feed-head">
              <div class="spm-mini-avatar"></div>
              <div class="spm-feed-title-wrap">
                <strong>${html(authorName(post))}</strong>
                <small>${html(formatTime(post.createdAt || post.created_at))}</small>
              </div>
            </div>
            <p class="spm-feed-copy">${html(excerpt)}</p>
            <div class="spm-feed-meta"><span class="spm-feed-chip static">Article</span><span class="spm-feed-chip static">${html(post.sport || 'Sports')}</span>${savedBadge}</div>
            <div class="spm-detail-actions"><button type="button" class="spm-chat-back" data-toggle-article-save="${html(String(post.id || ''))}">${saveLabel}</button><button type="button" class="spm-primary-action" data-open-article="${html(String(post.id || ''))}">Read Article</button></div>`;
          list.appendChild(card);
        });
        list.querySelectorAll('[data-toggle-article-save]').forEach(function (button) {
          button.addEventListener('click', async function () {
            var articleId = button.getAttribute('data-toggle-article-save');
            if (!articleId) return;
            button.disabled = true;
            try {
              var existing = bookmarkMap[String(articleId)] || null;
              if (existing && existing.bookmarkId) {
                await window.SpopeerAPI.removeBookmark(existing.bookmarkId);
                delete bookmarkMap[String(articleId)];
                button.textContent = 'Save';
              } else {
                var created = await window.SpopeerAPI.createBookmark({ postId: Number(articleId) });
                var createdBookmark = (created && created.data) || created || {};
                bookmarkMap[String(articleId)] = { bookmarkId: createdBookmark.id || null, postId: Number(articleId) };
                button.textContent = 'Saved';
              }
            } catch (_error) {
              button.textContent = 'Try again';
              window.setTimeout(function () {
                var currentlySaved = !!bookmarkMap[String(articleId)];
                button.textContent = currentlySaved ? 'Saved' : 'Save';
              }, 900);
            } finally {
              button.disabled = false;
            }
          });
        });
        list.querySelectorAll('[data-open-article]').forEach(function (button) {
          button.addEventListener('click', function () {
            var articleId = button.getAttribute('data-open-article');
            var selected = posts.find(function (entry) { return String(entry.id || '') === String(articleId || ''); });
            if (!selected) return;
            app.selectedArticle = selected;
            app.selectedArticle.__saved = !!bookmarkMap[String(articleId)];
            app.selectedArticle.__bookmarkId = (bookmarkMap[String(articleId)] && bookmarkMap[String(articleId)].bookmarkId) || null;
            app.detailBackRoute = 'articles';
            app.route = 'article-detail';
            render();
          });
        });
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load articles.</div>';
      }
    },

    'article-detail': async function () {
      setTitle('Article', 'Reader view');
      var screen = $('#spmScreen');
      var article = app.selectedArticle;
      screen.classList.remove('spm-snap-feed');
      if (!article) {
        app.route = app.detailBackRoute || 'articles';
        render();
        return;
      }

      var mediaType = postMediaType(article);
      var hero = '';
      if (mediaType === 'image') {
        hero = '<div class="spm-detail-hero article" style="background-image:url(\'' + html(postImageUrl(article)) + '\')"><div class="spm-detail-overlay"><span class="spm-detail-badge"><i class="fa-regular fa-newspaper"></i> Article</span><h2>' + html(pickLibraryPostTitle(article)) + '</h2><p>' + html(authorName(article)) + ' · ' + html(formatTime(article.createdAt || article.created_at)) + '</p></div></div>';
      } else {
        hero = '<div class="spm-detail-hero article no-media"><div class="spm-detail-overlay"><span class="spm-detail-badge"><i class="fa-regular fa-newspaper"></i> Article</span><h2>' + html(pickLibraryPostTitle(article)) + '</h2><p>' + html(authorName(article)) + ' · ' + html(formatTime(article.createdAt || article.created_at)) + '</p></div></div>';
      }

      screen.innerHTML = `
        <section class="spm-detail-shell">
          <button id="spmArticleDetailBack" class="spm-chat-back spm-detail-back" type="button">Back</button>
          ${hero}
          <article class="spm-detail-card spm-article-card">
            <div class="spm-detail-grid">
              <div><span>Sport</span><strong>${html(article.sport || 'Sports')}</strong></div>
              <div><span>Format</span><strong>Long-form post</strong></div>
            </div>
            <div class="spm-detail-copy spm-article-copy">
              <h3>${html(pickLibraryPostTitle(article))}</h3>
              <p>${html(article.content || 'No article content available.')}</p>
            </div>
            <div class="spm-detail-actions">
              <button id="spmSaveArticleBtn" class="spm-chat-back" type="button">${article.__saved ? 'Saved' : 'Save'}</button>
              <button id="spmOpenArticlePostBtn" class="spm-primary-action" type="button">Open Discussion</button>
              <button id="spmShareArticleBtn" class="spm-chat-back" type="button">Share</button>
            </div>
          </article>
        </section>`;

      document.getElementById('spmArticleDetailBack').addEventListener('click', function () {
        app.route = app.detailBackRoute || 'articles';
        app.detailBackRoute = null;
        render();
      });

      document.getElementById('spmOpenArticlePostBtn').addEventListener('click', function () {
        app.selectedPost = article;
        app.route = 'post';
        render();
      });

      document.getElementById('spmSaveArticleBtn').addEventListener('click', async function () {
        var button = document.getElementById('spmSaveArticleBtn');
        button.disabled = true;
        try {
          if (article.__saved && article.__bookmarkId) {
            await window.SpopeerAPI.removeBookmark(article.__bookmarkId);
            article.__saved = false;
            article.__bookmarkId = null;
            button.textContent = 'Save';
          } else {
            var created = await window.SpopeerAPI.createBookmark({ postId: Number(article.id) });
            var createdBookmark = (created && created.data) || created || {};
            article.__saved = true;
            article.__bookmarkId = createdBookmark.id || null;
            button.textContent = 'Saved';
          }
        } catch (_error) {
          button.textContent = 'Try again';
          window.setTimeout(function () {
            button.textContent = article.__saved ? 'Saved' : 'Save';
          }, 900);
        } finally {
          button.disabled = false;
        }
      });

      document.getElementById('spmShareArticleBtn').addEventListener('click', function () {
        var shareText = pickLibraryPostTitle(article);
        if (navigator.share) {
          navigator.share({ title: shareText, text: shareText, url: window.location.href }).catch(function () {});
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).catch(function () {});
        }
      });
    },

    marketplace: async function () {
      setTitle('Marketplace', 'Live listings');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading marketplace...</div>';

      try {
        var responses = await Promise.allSettled([
          window.SpopeerAPI.listMarketplaceListings({ page: 1, limit: 20, status: 'active' }),
          window.SpopeerAPI.listSavedMarketplaceListings()
        ]);
        var result = responses[0].status === 'fulfilled' ? responses[0].value : [];
        var savedResult = responses[1].status === 'fulfilled' ? responses[1].value : [];
        var listings = unwrapMarketplaceListings(result);
        var savedListings = unwrapMarketplaceListings(savedResult);
        var savedListingSet = new Set(savedListings.map(function (item) { return String(item && item.id || ''); }).filter(Boolean));

        if (!listings.length) {
          screen.innerHTML = '<div class="spm-empty">No active listings right now.</div>';
          return;
        }

        screen.innerHTML = '<div class="spm-screen-header"><h2 class="spm-screen-title"><i class="fa-solid fa-store"></i> Marketplace</h2><p class="spm-screen-sub">Active listings from the sports network marketplace</p></div><div id="spmMarketplaceList"></div>';
        var list = document.getElementById('spmMarketplaceList');
        listings.forEach(function (listing) {
          var card = document.createElement('article');
          card.className = 'spm-feed-card';
          var seller = listing.seller || {};
          var sellerName = seller.displayName || [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'Seller';
          var listingId = String(listing.id || '');
          var isSaved = savedListingSet.has(listingId);
          card.innerHTML = `
            <div class="spm-feed-head">
              <div class="spm-mini-avatar"></div>
              <div class="spm-feed-title-wrap">
                <strong>${html(listingTitle(listing))}</strong>
                <small>${html(sellerName)} · ${html(formatTime(listing.createdAt))}</small>
              </div>
            </div>
            <p class="spm-feed-copy">${html(listing.description || listing.category || 'Marketplace opportunity')}</p>
            <div class="spm-feed-meta"><span class="spm-feed-chip static">${html(listingPrice(listing))}</span><span class="spm-feed-chip static">${html(listing.sport || listing.category || 'Listing')}</span>${isSaved ? '<span class="spm-feed-chip static spm-saved-chip"><i class="fa-solid fa-bookmark"></i> Saved</span>' : ''}</div>
            <div class="spm-detail-actions"><button type="button" class="spm-chat-back" data-toggle-market-save="${html(listingId)}">${isSaved ? 'Saved' : 'Save'}</button><button type="button" class="spm-primary-action" data-open-listing="${html(listingId)}">View Listing</button></div>`;
          list.appendChild(card);
        });
        list.querySelectorAll('[data-toggle-market-save]').forEach(function (button) {
          button.addEventListener('click', async function () {
            var listingId = button.getAttribute('data-toggle-market-save');
            if (!listingId) return;
            button.disabled = true;
            try {
              await window.SpopeerAPI.request('/api/marketplace/saved/' + encodeURIComponent(listingId), { method: 'POST' });
              if (savedListingSet.has(listingId)) {
                savedListingSet.delete(listingId);
                button.textContent = 'Save';
              } else {
                savedListingSet.add(listingId);
                button.textContent = 'Saved';
              }
            } catch (_error) {
              button.textContent = 'Try again';
              window.setTimeout(function () {
                button.textContent = savedListingSet.has(listingId) ? 'Saved' : 'Save';
              }, 900);
            } finally {
              button.disabled = false;
            }
          });
        });
        list.querySelectorAll('[data-open-listing]').forEach(function (button) {
          button.addEventListener('click', function () {
            var listingId = button.getAttribute('data-open-listing');
            var selected = listings.find(function (entry) { return String(entry.id || '') === String(listingId || ''); });
            if (!selected) return;
            app.selectedMarketplaceListing = selected;
            app.selectedMarketplaceListing.__saved = savedListingSet.has(String(listingId || ''));
            app.detailBackRoute = 'marketplace';
            app.route = 'marketplace-detail';
            render();
          });
        });
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load marketplace listings.</div>';
      }
    },

    'marketplace-detail': async function () {
      setTitle('Listing Details', 'Marketplace');
      var screen = $('#spmScreen');
      var listing = app.selectedMarketplaceListing;
      screen.classList.remove('spm-snap-feed');
      if (!listing) {
        app.route = app.detailBackRoute || 'marketplace';
        render();
        return;
      }

      if (listing.id && window.SpopeerAPI && typeof window.SpopeerAPI.request === 'function') {
        try {
          var detail = await window.SpopeerAPI.request('/api/marketplace/listings/' + encodeURIComponent(listing.id));
          listing = (detail && detail.data) || listing;
          app.selectedMarketplaceListing = listing;
        } catch (_error) {}
      }

      var seller = listing.seller || {};
      var sellerName = seller.displayName || [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'Seller';
      var heroUrl = Array.isArray(listing.imageUrls) && listing.imageUrls.length ? listing.imageUrls[0] : (listing.imageUrl || listing.image || '');
      screen.innerHTML = `
        <section class="spm-detail-shell">
          <button id="spmMarketplaceDetailBack" class="spm-chat-back spm-detail-back" type="button">Back</button>
          <div class="spm-detail-hero marketplace${heroUrl ? '' : ' no-media'}"${heroUrl ? ' style="background-image:url(\'' + html(heroUrl) + '\')"' : ''}>
            <div class="spm-detail-overlay">
              <span class="spm-detail-badge"><i class="fa-solid fa-store"></i> Marketplace</span>
              <h2>${html(listingTitle(listing))}</h2>
              <p>${html(sellerName)} · ${html(listingPrice(listing))}</p>
            </div>
          </div>
          <article class="spm-detail-card">
            <div class="spm-detail-grid">
              <div><span>Category</span><strong>${html(listing.category || 'General')}</strong></div>
              <div><span>Sport</span><strong>${html(listing.sport || 'All Sports')}</strong></div>
              <div><span>Type</span><strong>${html(listing.listingType || 'Listing')}</strong></div>
              <div><span>Status</span><strong>${html(listing.status || 'active')}</strong></div>
              <div><span>Views</span><strong>${html(String(listing.viewCount || 0))}</strong></div>
              <div><span>Seller Role</span><strong>${html(seller.role || 'Member')}</strong></div>
            </div>
            <div class="spm-detail-copy">
              <h3>Description</h3>
              <p>${html(listing.description || 'No listing description provided.')}</p>
            </div>
            <div class="spm-detail-actions">
              <button id="spmSaveMarketplaceBtn" class="spm-primary-action" type="button">${listing.__saved ? 'Saved' : 'Save Listing'}</button>
              <button id="spmShareMarketplaceBtn" class="spm-chat-back" type="button">Share</button>
            </div>
          </article>
        </section>`;

      document.getElementById('spmMarketplaceDetailBack').addEventListener('click', function () {
        app.route = app.detailBackRoute || 'marketplace';
        app.detailBackRoute = null;
        render();
      });

      document.getElementById('spmSaveMarketplaceBtn').addEventListener('click', async function () {
        var button = document.getElementById('spmSaveMarketplaceBtn');
        button.disabled = true;
        try {
          await window.SpopeerAPI.request('/api/marketplace/saved/' + encodeURIComponent(listing.id), { method: 'POST' });
          listing.__saved = !listing.__saved;
          button.textContent = listing.__saved ? 'Saved' : 'Save Listing';
        } catch (_error) {
          button.textContent = 'Could not save';
          window.setTimeout(function () { button.textContent = listing.__saved ? 'Saved' : 'Save Listing'; }, 1200);
        } finally {
          button.disabled = false;
        }
      });

      document.getElementById('spmShareMarketplaceBtn').addEventListener('click', function () {
        var shareText = listingTitle(listing) + ' · ' + listingPrice(listing);
        if (navigator.share) {
          navigator.share({ title: listingTitle(listing), text: shareText, url: window.location.href }).catch(function () {});
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).catch(function () {});
        }
      });
    },

    library: async function () {
      setTitle('Library', 'Posts, links, media and saved activity');
      var screen = $('#spmScreen');
      var state = app.libraryState || { items: [], type: 'all', source: 'all', sort: 'newest' };
      app.libraryState = state;
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading your library...</div>';

      try {
        state.items = await loadLibraryItems();
      } catch (error) {
        console.error('[mobile] library error', error);
        state.items = [];
      }

      var createdCount = state.items.filter(function (item) { return item.source === 'created'; }).length;
      var savedCount = state.items.filter(function (item) { return item.source === 'saved'; }).length;
      var typeCounts = {
        all: state.items.length,
        posts: state.items.filter(function (item) { return item.itemType === 'posts'; }).length,
        links: state.items.filter(function (item) { return item.itemType === 'links'; }).length,
        articles: state.items.filter(function (item) { return item.itemType === 'articles'; }).length,
        images: state.items.filter(function (item) { return item.itemType === 'images'; }).length,
        videos: state.items.filter(function (item) { return item.itemType === 'videos'; }).length,
        events: state.items.filter(function (item) { return item.itemType === 'events'; }).length,
        sponsorships: state.items.filter(function (item) { return item.itemType === 'sponsorships'; }).length
      };

      screen.innerHTML = `
        <section class="spm-library-shell">
          <div class="spm-library-hero">
            <div>
              <p class="spm-library-kicker">Sports Passport Archive</p>
              <h2>Everything you have created, saved, or tracked.</h2>
              <p class="spm-library-copy">Pulled from your main library sources: posts, saved items, media, events and sponsorships.</p>
            </div>
            <div class="spm-library-stats">
              <article><strong>${typeCounts.all}</strong><span>Total</span></article>
              <article><strong>${createdCount}</strong><span>Created</span></article>
              <article><strong>${savedCount}</strong><span>Saved</span></article>
            </div>
          </div>

          <div class="spm-library-controls">
            <div class="spm-library-source" id="spmLibrarySource">
              <button type="button" class="spm-library-source-btn${state.source === 'all' ? ' active' : ''}" data-library-source="all">All</button>
              <button type="button" class="spm-library-source-btn${state.source === 'created' ? ' active' : ''}" data-library-source="created">Created</button>
              <button type="button" class="spm-library-source-btn${state.source === 'saved' ? ' active' : ''}" data-library-source="saved">Saved</button>
            </div>
            <label class="spm-library-sort-wrap">
              <span>Sort</span>
              <select id="spmLibrarySort" class="spm-library-sort">
                <option value="newest"${state.sort === 'newest' ? ' selected' : ''}>Newest</option>
                <option value="oldest"${state.sort === 'oldest' ? ' selected' : ''}>Oldest</option>
                <option value="title"${state.sort === 'title' ? ' selected' : ''}>Title</option>
              </select>
            </label>
          </div>

          <div class="spm-library-tabs" id="spmLibraryTabs">
            <button type="button" class="spm-library-tab${state.type === 'all' ? ' active' : ''}" data-library-type="all">All <span>${typeCounts.all}</span></button>
            <button type="button" class="spm-library-tab${state.type === 'posts' ? ' active' : ''}" data-library-type="posts">Posts <span>${typeCounts.posts}</span></button>
            <button type="button" class="spm-library-tab${state.type === 'links' ? ' active' : ''}" data-library-type="links">Links <span>${typeCounts.links}</span></button>
            <button type="button" class="spm-library-tab${state.type === 'articles' ? ' active' : ''}" data-library-type="articles">Articles <span>${typeCounts.articles}</span></button>
            <button type="button" class="spm-library-tab${state.type === 'images' ? ' active' : ''}" data-library-type="images">Images <span>${typeCounts.images}</span></button>
            <button type="button" class="spm-library-tab${state.type === 'videos' ? ' active' : ''}" data-library-type="videos">Videos <span>${typeCounts.videos}</span></button>
            <button type="button" class="spm-library-tab${state.type === 'events' ? ' active' : ''}" data-library-type="events">Events <span>${typeCounts.events}</span></button>
            <button type="button" class="spm-library-tab${state.type === 'sponsorships' ? ' active' : ''}" data-library-type="sponsorships">Sponsorships <span>${typeCounts.sponsorships}</span></button>
          </div>

          <div id="spmLibraryResults" class="spm-library-results"></div>
        </section>`;

      function renderLibraryResults() {
        var mount = document.getElementById('spmLibraryResults');
        if (!mount) return;

        var visibleItems = getVisibleLibraryItems(state.items, state.type, state.source, state.sort);
        if (!visibleItems.length) {
          mount.innerHTML = '<div class="spm-empty spm-library-empty"><strong>No items in this view</strong><p>Try another type or source filter. New activity from your main library will appear here automatically.</p></div>';
          return;
        }

        mount.innerHTML = '';
        visibleItems.forEach(function (item) {
          var card = document.createElement('article');
          card.className = 'spm-library-card';

          var preview = '';
          if (item.itemType === 'videos' && item.previewUrl) {
            preview = '<div class="spm-library-preview spm-library-preview-video"><i class="fa-solid fa-play"></i><span>Video</span></div>';
          } else if (item.previewUrl) {
            preview = '<div class="spm-library-preview" style="background-image:url(\'' + html(item.previewUrl) + '\')"></div>';
          } else {
            preview = '<div class="spm-library-preview spm-library-preview-fallback"><i class="' + html(libraryTypeIcon(item.itemType)) + '"></i></div>';
          }

          card.innerHTML = `
            ${preview}
            <div class="spm-library-card-body">
              <div class="spm-library-card-top">
                <span class="spm-library-pill type"><i class="${html(libraryTypeIcon(item.itemType))}"></i>${html(libraryTypeLabel(item.itemType))}</span>
                <span class="spm-library-pill source">${html(librarySourceLabel(item.source))}</span>
              </div>
              <h3>${html(item.title || 'Untitled item')}</h3>
              <p>${html(item.description || '')}</p>
              <div class="spm-library-meta">
                ${item.sport ? '<span>' + html(item.sport) + '</span>' : ''}
                <span>${html(new Date(item.createdAt).toLocaleDateString())}</span>
              </div>
              <button type="button" class="spm-library-open" data-library-id="${html(item.id)}">Open</button>
            </div>`;
          mount.appendChild(card);
        });

        mount.querySelectorAll('[data-library-id]').forEach(function (button) {
          button.addEventListener('click', function () {
            var found = visibleItems.find(function (item) { return item.id === button.getAttribute('data-library-id'); });
            openLibraryItem(found);
          });
        });
      }

      function syncLibraryControls() {
        document.querySelectorAll('[data-library-source]').forEach(function (button) {
          button.classList.toggle('active', button.getAttribute('data-library-source') === state.source);
        });
        document.querySelectorAll('[data-library-type]').forEach(function (button) {
          button.classList.toggle('active', button.getAttribute('data-library-type') === state.type);
        });
      }

      document.querySelectorAll('[data-library-source]').forEach(function (button) {
        button.addEventListener('click', function () {
          state.source = button.getAttribute('data-library-source') || 'all';
          syncLibraryControls();
          renderLibraryResults();
        });
      });

      document.querySelectorAll('[data-library-type]').forEach(function (button) {
        button.addEventListener('click', function () {
          state.type = button.getAttribute('data-library-type') || 'all';
          syncLibraryControls();
          renderLibraryResults();
        });
      });

      var sortSelect = document.getElementById('spmLibrarySort');
      if (sortSelect) {
        sortSelect.addEventListener('change', function () {
          state.sort = sortSelect.value || 'newest';
          renderLibraryResults();
        });
      }

      syncLibraryControls();
      renderLibraryResults();
    },

    events: async function () {
      setTitle('Events', 'Upcoming sports events');
      var screen = $('#spmScreen');
      var state = app.eventsState || { items: [], source: 'all', sort: 'upcoming', query: '' };
      app.eventsState = state;
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading events...</div>';
      try {
        try {
          var me = await window.SpopeerAPI.getProfile();
          app.user = unwrapUser(me) || app.user || {};
        } catch (_profileError) {}

        var result = await window.SpopeerAPI.listEvents();
        state.items = unwrapEvents(result);

        var currentUserId = String((app.user && (app.user.id || app.user.userId)) || '');

        function hasMyInvite(event) {
          return Array.isArray(event.myInvites) && event.myInvites.length > 0;
        }

        function isMyCreatedEvent(event) {
          if (!currentUserId) return false;
          return String(event.createdBy || event.ownerId || '') === currentUserId;
        }

        function getEventSource(event) {
          if (isMyCreatedEvent(event)) return 'created';
          if (hasMyInvite(event)) return 'saved';
          return 'saved';
        }

        function getPendingInvite(event) {
          if (!Array.isArray(event.myInvites)) return null;
          return event.myInvites.find(function (invite) { return invite && invite.status === 'pending'; }) || null;
        }

        function eventSortTime(event) {
          var value = event.startDate || event.startsAt || event.date || event.createdAt;
          var parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        }

        function getVisibleEvents() {
          var term = String(state.query || '').trim().toLowerCase();
          var filtered = (state.items || []).filter(function (event) {
            if (state.source !== 'all' && getEventSource(event) !== state.source) return false;
            if (!term) return true;
            var haystack = [
              event.title,
              event.description,
              event.sport,
              event.location,
              event.venue,
              event.type
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.indexOf(term) >= 0;
          });

          filtered.sort(function (left, right) {
            if (state.sort === 'title') {
              return String(eventTitle(left)).localeCompare(String(eventTitle(right)));
            }
            var leftTime = eventSortTime(left);
            var rightTime = eventSortTime(right);
            if (state.sort === 'oldest') return leftTime - rightTime;
            if (state.sort === 'newest') return rightTime - leftTime;

            var now = Date.now();
            var leftDelta = leftTime >= now ? leftTime - now : Number.MAX_SAFE_INTEGER + (now - leftTime);
            var rightDelta = rightTime >= now ? rightTime - now : Number.MAX_SAFE_INTEGER + (now - rightTime);
            return leftDelta - rightDelta;
          });

          return filtered;
        }

        var createdCount = state.items.filter(function (event) { return getEventSource(event) === 'created'; }).length;
        var savedCount = state.items.filter(function (event) { return getEventSource(event) === 'saved'; }).length;
        var pendingCount = state.items.filter(function (event) { return Boolean(getPendingInvite(event)); }).length;

        screen.innerHTML = `
          <section class="spm-library-shell">
            <div class="spm-library-hero">
              <div>
                <p class="spm-library-kicker">Events Hub</p>
                <h2>All your sports events in one place.</h2>
                <p class="spm-library-copy">Pulled from the main events API with invite actions, sorting, and personal filters.</p>
              </div>
              <div class="spm-library-stats">
                <article><strong>${state.items.length}</strong><span>Total</span></article>
                <article><strong>${createdCount}</strong><span>Created</span></article>
                <article><strong>${savedCount}</strong><span>Saved</span></article>
              </div>
            </div>

            <div class="spm-library-controls">
              <div class="spm-library-source" id="spmEventsSource">
                <button type="button" class="spm-library-source-btn${state.source === 'all' ? ' active' : ''}" data-events-source="all">All</button>
                <button type="button" class="spm-library-source-btn${state.source === 'created' ? ' active' : ''}" data-events-source="created">Created</button>
                <button type="button" class="spm-library-source-btn${state.source === 'saved' ? ' active' : ''}" data-events-source="saved">Saved</button>
              </div>
              <label class="spm-library-sort-wrap">
                <span>Sort</span>
                <select id="spmEventsSort" class="spm-library-sort">
                  <option value="upcoming"${state.sort === 'upcoming' ? ' selected' : ''}>Upcoming</option>
                  <option value="newest"${state.sort === 'newest' ? ' selected' : ''}>Newest</option>
                  <option value="oldest"${state.sort === 'oldest' ? ' selected' : ''}>Oldest</option>
                  <option value="title"${state.sort === 'title' ? ' selected' : ''}>Title</option>
                </select>
              </label>
            </div>

            <input id="spmEventsSearch" class="spm-search" style="margin-top:4px" placeholder="Search events by sport, city, or keyword" value="${html(state.query)}">
            <div class="spm-section-label">Pending Invites: ${pendingCount}</div>
            <div id="spmEventsList"></div>
          </section>`;

        var list = document.getElementById('spmEventsList');

        function renderEventCards() {
          var events = getVisibleEvents();
          list.innerHTML = '';
          if (!events.length) {
            list.innerHTML = '<div class="spm-empty">No events in this view. Try a different filter or search.</div>';
            return;
          }

          events.forEach(function (event) {
            var pendingInvite = getPendingInvite(event);
            var sourceTag = getEventSource(event) === 'created' ? 'Created' : 'Saved';
            var inviteCount = Number(event.inviteCount || (Array.isArray(event.myInvites) ? event.myInvites.length : 0));
            var dateLabel = eventDate(event);
            var coverHtml = (event.imageUrl || event.image || event.coverUrl)
              ? '<div class="spm-feed-thumb" style="background-image:url(\'' + html(event.imageUrl || event.image || event.coverUrl) + '\')"></div>'
              : '';

          var card = document.createElement('article');
          card.className = 'spm-feed-card';
            card.innerHTML = coverHtml + `
              <div class="spm-feed-head">
                <div class="spm-mini-avatar"><i class="fa-regular fa-calendar"></i></div>
                <div class="spm-feed-title-wrap">
                  <strong>${html(eventTitle(event))}</strong>
                  <small>${html(dateLabel)}</small>
                </div>
              </div>
              <p class="spm-feed-copy">${html(event.description || event.details || 'Sports event')}</p>
              <div class="spm-feed-meta">
                <span class="spm-feed-chip static">${html(sourceTag)}</span>
                <span class="spm-feed-chip static"><i class="fa-solid fa-location-dot"></i> ${html(event.location || event.venue || 'TBD')}</span>
                <span class="spm-feed-chip static">${html(event.sport || event.type || 'Event')}</span>
                <span class="spm-feed-chip static"><i class="fa-solid fa-user-group"></i> ${inviteCount}</span>
                ${event.entryFee || event.fee ? '<span class="spm-feed-chip static">' + html(String(event.entryFee || event.fee)) + '</span>' : ''}
              </div>
              ${pendingInvite ? '<div class="spm-detail-actions"><button type="button" class="spm-chat-back" data-accept-event="' + html(String(event.id || '')) + '">Accept</button><button type="button" class="spm-chat-back" data-decline-event="' + html(String(event.id || '')) + '">Decline</button></div>' : ''}
              <div class="spm-detail-actions"><button type="button" class="spm-primary-action" data-open-event="${html(String(event.id || ''))}">View Event</button></div>`;
            list.appendChild(card);
          });

          list.querySelectorAll('[data-open-event]').forEach(function (button) {
            button.addEventListener('click', function () {
              var eventId = button.getAttribute('data-open-event');
              var selected = events.find(function (entry) { return String(entry.id || '') === String(eventId || ''); });
              if (!selected) return;
              app.selectedEvent = selected;
              app.detailBackRoute = 'events';
              app.route = 'event-detail';
              render();
            });
          });

          list.querySelectorAll('[data-accept-event]').forEach(function (button) {
            button.addEventListener('click', async function () {
              var eventId = button.getAttribute('data-accept-event');
              if (!eventId) return;
              try {
                await window.SpopeerAPI.respondToEventInvite(eventId, 'accepted');
                screens.events();
              } catch (_error) {}
            });
          });

          list.querySelectorAll('[data-decline-event]').forEach(function (button) {
            button.addEventListener('click', async function () {
              var eventId = button.getAttribute('data-decline-event');
              if (!eventId) return;
              try {
                await window.SpopeerAPI.respondToEventInvite(eventId, 'declined');
                screens.events();
              } catch (_error) {}
            });
          });
        }

        document.querySelectorAll('[data-events-source]').forEach(function (button) {
          button.addEventListener('click', function () {
            state.source = button.getAttribute('data-events-source') || 'all';
            document.querySelectorAll('[data-events-source]').forEach(function (node) {
              node.classList.toggle('active', node === button);
            });
            renderEventCards();
          });
        });

        var sortSelect = document.getElementById('spmEventsSort');
        if (sortSelect) {
          sortSelect.addEventListener('change', function () {
            state.sort = sortSelect.value || 'upcoming';
            renderEventCards();
          });
        }

        var searchInput = document.getElementById('spmEventsSearch');
        if (searchInput) {
          var searchTimer = null;
          searchInput.addEventListener('input', function () {
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(function () {
              state.query = searchInput.value || '';
              renderEventCards();
            }, 180);
          });
        }

        renderEventCards();
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load events.</div>';
      }
    },

    'event-detail': async function () {
      setTitle('Event Details', 'Inside the mobile shell');
      var screen = $('#spmScreen');
      var event = app.selectedEvent;
      screen.classList.remove('spm-snap-feed');
      if (!event) {
        app.route = eventBackRoute();
        render();
        return;
      }

      var bannerUrl = event.imageUrl || event.image || event.coverUrl || '';
      var location = event.location || event.venue || 'Location TBD';
      var sport = event.sport || event.type || 'Event';
      var dateLabel = eventDate(event);
      var timeLabel = 'Time TBD';
      var startTime = event.startDate || event.startsAt || event.date || '';
      var endTime = event.endDate || event.endsAt || '';
      if (startTime) {
        var startDate = new Date(startTime);
        if (!Number.isNaN(startDate.getTime())) {
          timeLabel = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
      }
      if (endTime) {
        var endDate = new Date(endTime);
        if (!Number.isNaN(endDate.getTime())) {
          timeLabel += ' - ' + endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
      }

      screen.innerHTML = `
        <section class="spm-detail-shell">
          <button id="spmEventDetailBack" class="spm-chat-back spm-detail-back" type="button">Back</button>
          <div class="spm-detail-hero${bannerUrl ? '' : ' no-media'}"${bannerUrl ? ' style="background-image:url(\'' + html(bannerUrl) + '\')"' : ''}>
            <div class="spm-detail-overlay">
              <span class="spm-detail-badge"><i class="fa-regular fa-calendar"></i> Event</span>
              <h2>${html(eventTitle(event))}</h2>
              <p>${html(dateLabel)}</p>
            </div>
          </div>
          <article class="spm-detail-card">
            <div class="spm-detail-grid">
              <div><span>Sport</span><strong>${html(sport)}</strong></div>
              <div><span>Location</span><strong>${html(location)}</strong></div>
              <div><span>Schedule</span><strong>${html(timeLabel)}</strong></div>
              <div><span>Entry</span><strong>${html(String(event.entryFee || event.fee || 'Open'))}</strong></div>
            </div>
            <div class="spm-detail-copy">
              <h3>About this event</h3>
              <p>${html(event.description || event.details || 'No additional event details were provided yet.')}</p>
            </div>
            <div class="spm-detail-actions">
              <button id="spmRespondEventBtn" class="spm-primary-action" type="button">Interested</button>
              <button id="spmShareEventBtn" class="spm-chat-back" type="button">Share</button>
            </div>
          </article>
        </section>`;

      document.getElementById('spmEventDetailBack').addEventListener('click', function () {
        app.route = eventBackRoute();
        app.detailBackRoute = null;
        render();
      });

      document.getElementById('spmRespondEventBtn').addEventListener('click', async function () {
        var button = document.getElementById('spmRespondEventBtn');
        button.disabled = true;
        try {
          await window.SpopeerAPI.respondToEventInvite(event.id, 'accepted');
          button.textContent = 'Going';
        } catch (_error) {
          button.textContent = 'Could not save';
          window.setTimeout(function () { button.textContent = 'Interested'; }, 1200);
        } finally {
          button.disabled = false;
        }
      });

      document.getElementById('spmShareEventBtn').addEventListener('click', function () {
        var shareText = eventTitle(event) + ' · ' + dateLabel;
        if (navigator.share) {
          navigator.share({ title: eventTitle(event), text: shareText, url: window.location.href }).catch(function () {});
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).catch(function () {});
        }
      });
    },

    sponsorship: async function () {
      setTitle('Sponsorship', 'Opportunities for you');
      var screen = $('#spmScreen');
      var state = app.sponsorshipState || { items: [], source: 'all', sort: 'newest', query: '', mode: 'all' };
      app.sponsorshipState = state;
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading sponsorship opportunities...</div>';
      try {
        try {
          var me = await window.SpopeerAPI.getProfile();
          app.user = unwrapUser(me) || app.user || {};
        } catch (_profileError) {}

        var result = await window.SpopeerAPI.listSponsorships({ limit: 200 });
        state.items = unwrapSponsorships(result);
        var currentUserId = String((app.user && (app.user.id || app.user.userId)) || '');

        function isMySponsorship(item) {
          if (!currentUserId) return false;
          return String(item.userId || (item.author && item.author.id) || '') === currentUserId;
        }

        function getSponsorshipSource(item) {
          return isMySponsorship(item) ? 'created' : 'saved';
        }

        function getMode(item) {
          var mode = String(item.mode || '').toLowerCase();
          if (mode === 'offer' || mode === 'request' || mode === 'secure') return mode;
          return 'offer';
        }

        function sponsorshipSortTime(item) {
          var parsed = new Date(item.createdAt || item.updatedAt || Date.now());
          return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        }

        function getVisibleItems() {
          var term = String(state.query || '').trim().toLowerCase();
          var filtered = (state.items || []).filter(function (item) {
            if (state.source !== 'all' && getSponsorshipSource(item) !== state.source) return false;
            if (state.mode !== 'all' && getMode(item) !== state.mode) return false;
            if (!term) return true;
            var haystack = [
              item.title,
              item.summary,
              item.description,
              item.sport,
              item.location,
              item.sponsorType,
              item.targetAudience
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.indexOf(term) >= 0;
          });

          filtered.sort(function (left, right) {
            if (state.sort === 'title') {
              return String(sponsorshipTitle(left)).localeCompare(String(sponsorshipTitle(right)));
            }
            var leftTime = sponsorshipSortTime(left);
            var rightTime = sponsorshipSortTime(right);
            return state.sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
          });

          return filtered;
        }

        var createdCount = state.items.filter(function (item) { return getSponsorshipSource(item) === 'created'; }).length;
        var savedCount = state.items.filter(function (item) { return getSponsorshipSource(item) === 'saved'; }).length;
        var secureCount = state.items.filter(function (item) { return getMode(item) === 'secure'; }).length;

        screen.innerHTML = `
          <section class="spm-library-shell">
            <div class="spm-library-hero">
              <div>
                <p class="spm-library-kicker">Sponsorship Hub</p>
                <h2>Offers, requests, and secure sponsor deals.</h2>
                <p class="spm-library-copy">Pulled from the main sponsorship board with audience, type and mode filters.</p>
              </div>
              <div class="spm-library-stats">
                <article><strong>${state.items.length}</strong><span>Total</span></article>
                <article><strong>${createdCount}</strong><span>Created</span></article>
                <article><strong>${savedCount}</strong><span>Saved</span></article>
              </div>
            </div>

            <div class="spm-library-controls">
              <div class="spm-library-source" id="spmSponsorshipSource">
                <button type="button" class="spm-library-source-btn${state.source === 'all' ? ' active' : ''}" data-sponsor-source="all">All</button>
                <button type="button" class="spm-library-source-btn${state.source === 'created' ? ' active' : ''}" data-sponsor-source="created">Created</button>
                <button type="button" class="spm-library-source-btn${state.source === 'saved' ? ' active' : ''}" data-sponsor-source="saved">Saved</button>
              </div>
              <label class="spm-library-sort-wrap">
                <span>Sort</span>
                <select id="spmSponsorshipSort" class="spm-library-sort">
                  <option value="newest"${state.sort === 'newest' ? ' selected' : ''}>Newest</option>
                  <option value="oldest"${state.sort === 'oldest' ? ' selected' : ''}>Oldest</option>
                  <option value="title"${state.sort === 'title' ? ' selected' : ''}>Title</option>
                </select>
              </label>
            </div>

            <div class="spm-library-tabs" id="spmSponsorshipModes">
              <button type="button" class="spm-library-tab${state.mode === 'all' ? ' active' : ''}" data-sponsor-mode="all">All <span>${state.items.length}</span></button>
              <button type="button" class="spm-library-tab${state.mode === 'offer' ? ' active' : ''}" data-sponsor-mode="offer">Offers <span>${state.items.filter(function (item) { return getMode(item) === 'offer'; }).length}</span></button>
              <button type="button" class="spm-library-tab${state.mode === 'request' ? ' active' : ''}" data-sponsor-mode="request">Requests <span>${state.items.filter(function (item) { return getMode(item) === 'request'; }).length}</span></button>
              <button type="button" class="spm-library-tab${state.mode === 'secure' ? ' active' : ''}" data-sponsor-mode="secure">Secure <span>${secureCount}</span></button>
            </div>

            <input id="spmSponsorshipSearch" class="spm-search" style="margin-top:4px" placeholder="Search by sport, city, sponsor type or goal" value="${html(state.query)}">
            <div id="spmSponsorList"></div>
          </section>`;

        var list = document.getElementById('spmSponsorList');

        function renderSponsorCards() {
          var items = getVisibleItems();
          list.innerHTML = '';
          if (!items.length) {
            list.innerHTML = '<div class="spm-empty">No sponsorship opportunities in this view. Try another mode or filter.</div>';
            return;
          }

          items.forEach(function (item) {
            var card = document.createElement('article');
            card.className = 'spm-feed-card';
            var sourceTag = getSponsorshipSource(item) === 'created' ? 'Created' : 'Saved';
            var modeTag = getMode(item);
            card.innerHTML = `
              <div class="spm-feed-head">
                <div class="spm-mini-avatar"><i class="fa-solid fa-handshake"></i></div>
                <div class="spm-feed-title-wrap">
                  <strong>${html(sponsorshipTitle(item))}</strong>
                  <small>${html(item.ownerName || item.company || item.brand || item.organizer || 'Sponsor')}</small>
                </div>
              </div>
              <p class="spm-feed-copy">${html(item.description || item.summary || item.details || 'Sponsorship opportunity')}</p>
              <div class="spm-feed-meta">
                <span class="spm-feed-chip static">${html(sourceTag)}</span>
                <span class="spm-feed-chip static">${html(modeTag)}</span>
                <span class="spm-feed-chip static">${html(item.sport || 'All Sports')}</span>
                ${item.sponsorType ? '<span class="spm-feed-chip static">' + html(String(item.sponsorType)) + '</span>' : ''}
                ${item.targetAudience ? '<span class="spm-feed-chip static">For ' + html(String(item.targetAudience)) + '</span>' : ''}
              </div>
              <div class="spm-detail-actions"><button type="button" class="spm-primary-action" data-open-sponsorship="${html(String(item.id || ''))}">View Opportunity</button></div>`;
            list.appendChild(card);
          });

          list.querySelectorAll('[data-open-sponsorship]').forEach(function (button) {
            button.addEventListener('click', function () {
              var itemId = button.getAttribute('data-open-sponsorship');
              var selected = items.find(function (entry) { return String(entry.id || '') === String(itemId || ''); });
              if (!selected) return;
              app.selectedSponsorship = selected;
              app.detailBackRoute = 'sponsorship';
              app.route = 'sponsorship-detail';
              render();
            });
          });
        }

        document.querySelectorAll('[data-sponsor-source]').forEach(function (button) {
          button.addEventListener('click', function () {
            state.source = button.getAttribute('data-sponsor-source') || 'all';
            document.querySelectorAll('[data-sponsor-source]').forEach(function (node) {
              node.classList.toggle('active', node === button);
            });
            renderSponsorCards();
          });
        });

        document.querySelectorAll('[data-sponsor-mode]').forEach(function (button) {
          button.addEventListener('click', function () {
            state.mode = button.getAttribute('data-sponsor-mode') || 'all';
            document.querySelectorAll('[data-sponsor-mode]').forEach(function (node) {
              node.classList.toggle('active', node === button);
            });
            renderSponsorCards();
          });
        });

        var sortSelect = document.getElementById('spmSponsorshipSort');
        if (sortSelect) {
          sortSelect.addEventListener('change', function () {
            state.sort = sortSelect.value || 'newest';
            renderSponsorCards();
          });
        }

        var searchInput = document.getElementById('spmSponsorshipSearch');
        if (searchInput) {
          var searchTimer = null;
          searchInput.addEventListener('input', function () {
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(function () {
              state.query = searchInput.value || '';
              renderSponsorCards();
            }, 180);
          });
        }

        renderSponsorCards();
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load sponsorship opportunities.</div>';
      }
    },

    'sponsorship-detail': async function () {
      setTitle('Sponsorship Details', 'Inside the mobile shell');
      var screen = $('#spmScreen');
      var item = app.selectedSponsorship;
      screen.classList.remove('spm-snap-feed');
      if (!item) {
        app.route = sponsorshipBackRoute();
        render();
        return;
      }

      if (item.id && window.SpopeerAPI && typeof window.SpopeerAPI.request === 'function') {
        try {
          var detail = await window.SpopeerAPI.request('/api/sponsorships/' + encodeURIComponent(item.id));
          item = (detail && detail.data && detail.data.sponsorship) || (detail && detail.sponsorship) || item;
          app.selectedSponsorship = item;
        } catch (_error) {}
      }

      var owner = item.ownerName || (item.author && ([item.author.firstName, item.author.lastName].filter(Boolean).join(' ') || item.author.email)) || 'Sponsor';
      var summary = item.summary || item.description || item.details || 'No additional sponsorship summary available.';
      screen.innerHTML = `
        <section class="spm-detail-shell">
          <button id="spmSponsorshipDetailBack" class="spm-chat-back spm-detail-back" type="button">Back</button>
          <div class="spm-detail-hero sponsorship${item.imageUrl || item.image ? '' : ' no-media'}"${item.imageUrl || item.image ? ' style="background-image:url(\'' + html(item.imageUrl || item.image) + '\')"' : ''}>
            <div class="spm-detail-overlay">
              <span class="spm-detail-badge"><i class="fa-solid fa-handshake"></i> Sponsorship</span>
              <h2>${html(sponsorshipTitle(item))}</h2>
              <p>${html(owner)} · ${html(item.status || 'active')}</p>
            </div>
          </div>
          <article class="spm-detail-card">
            <div class="spm-detail-grid">
              <div><span>Sport</span><strong>${html(item.sport || 'All Sports')}</strong></div>
              <div><span>Mode</span><strong>${html(item.mode || item.type || 'Open')}</strong></div>
              <div><span>Audience</span><strong>${html(item.targetAudience || 'All')}</strong></div>
              <div><span>Location</span><strong>${html(item.location || 'Flexible')}</strong></div>
              <div><span>Timeline</span><strong>${html(item.timeline || 'Open timeline')}</strong></div>
              <div><span>Sponsor Type</span><strong>${html(item.sponsorType || item.category || 'General')}</strong></div>
            </div>
            <div class="spm-detail-copy">
              <h3>Opportunity Summary</h3>
              <p>${html(summary)}</p>
            </div>
            <div class="spm-detail-actions">
              <button id="spmOpenSponsorshipDesktop" class="spm-primary-action" type="button">Open Full Page</button>
              <button id="spmShareSponsorshipBtn" class="spm-chat-back" type="button">Share</button>
            </div>
          </article>
        </section>`;

      document.getElementById('spmSponsorshipDetailBack').addEventListener('click', function () {
        app.route = sponsorshipBackRoute();
        app.detailBackRoute = null;
        render();
      });

      document.getElementById('spmOpenSponsorshipDesktop').addEventListener('click', function () {
        window.location.href = '/pages/sponsorship/sponsor.html';
      });

      document.getElementById('spmShareSponsorshipBtn').addEventListener('click', function () {
        var shareText = sponsorshipTitle(item) + ' · ' + (item.sport || 'Sponsorship');
        if (navigator.share) {
          navigator.share({ title: sponsorshipTitle(item), text: shareText, url: window.location.href }).catch(function () {});
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).catch(function () {});
        }
      });
    },

    training: async function () {
      setTitle('Training', 'Drills, tips & forums');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading training content...</div>';
      try {
        var result = await (window.SpopeerAPI.request ? window.SpopeerAPI.request('/api/forums?limit=40') : fetch('/api/forums?limit=40', { credentials: 'include' }).then(function (r) { return r.json(); }));
        var threads = (result && Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : (result && result.forums) || (result && result.threads) || []));
        var trainingThreads = threads.filter(function (t) {
          var tag = String(t.category || t.type || t.tag || t.title || '').toLowerCase();
          return tag.includes('train') || tag.includes('drill') || tag.includes('fitness') || tag.includes('workout') || tag.includes('technique') || tag.includes('coach');
        });
        var displayThreads = trainingThreads.length ? trainingThreads : threads;
        screen.innerHTML = `<div class="spm-screen-header"><h2 class="spm-screen-title"><i class="fa-solid fa-dumbbell"></i> Training</h2><p class="spm-screen-sub">Drills, workouts &amp; coaching forums</p></div><div id="spmTrainingList"></div>`;
        var list = document.getElementById('spmTrainingList');
        if (!displayThreads.length) {
          list.innerHTML = '<div class="spm-empty">No training content yet. Be the first to post a drill or tip.</div>';
          return;
        }
        displayThreads.slice(0, 25).forEach(function (thread) {
          var card = document.createElement('article');
          card.className = 'spm-feed-card';
          var authorStr = (thread.author && (thread.author.displayName || thread.author.firstName || thread.author.email)) || thread.userName || thread.authorName || 'Trainer';
          var threadId = String(thread.id || '');
          card.innerHTML = `
            <div class="spm-feed-head">
              <div class="spm-mini-avatar">${html(initialForName(authorStr))}</div>
              <div class="spm-feed-title-wrap">
                <strong>${html(thread.title || thread.subject || 'Training Thread')}</strong>
                <small>${html(authorStr)} · ${html(formatTime(thread.createdAt || thread.created_at))}</small>
              </div>
            </div>
            <p class="spm-feed-copy">${html(thread.body || thread.content || thread.description || '')}</p>
            <div class="spm-feed-meta">
              <span class="spm-feed-chip static"><i class="fa-solid fa-dumbbell"></i> ${html(thread.category || thread.type || 'Training')}</span>
              ${thread.repliesCount || thread.replies ? '<span class="spm-feed-chip static"><i class="fa-regular fa-comment"></i> ' + html(String(thread.repliesCount || thread.replies || 0)) + ' replies</span>' : ''}
            </div>
            <div class="spm-detail-actions"><button type="button" class="spm-primary-action" data-open-thread="${html(threadId)}">Open Thread</button></div>`;
          list.appendChild(card);
        });
        list.querySelectorAll('[data-open-thread]').forEach(function (button) {
          button.addEventListener('click', function () {
            var threadId = button.getAttribute('data-open-thread');
            var selected = displayThreads.find(function (entry) { return String(entry.id || '') === String(threadId || ''); });
            if (!selected) return;
            app.selectedThread = selected;
            app.detailBackRoute = 'training';
            app.route = 'thread-detail';
            render();
          });
        });
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load training content.</div>';
      }
    },

    'thread-detail': async function () {
      setTitle('Thread Details', 'Community discussion');
      var screen = $('#spmScreen');
      var thread = app.selectedThread;
      screen.classList.remove('spm-snap-feed');
      if (!thread) {
        app.route = threadBackRoute();
        render();
        return;
      }

      if (thread.id && window.SpopeerAPI && typeof window.SpopeerAPI.request === 'function') {
        try {
          var detail = await window.SpopeerAPI.request('/api/forums/' + encodeURIComponent(thread.id));
          thread = (detail && detail.data) || thread;
          app.selectedThread = thread;
        } catch (_error) {}
      }

      var threadAuthor = (thread.author && ([thread.author.firstName, thread.author.lastName].filter(Boolean).join(' ') || thread.author.email)) || 'Member';
      var replies = Array.isArray(thread.replies) ? thread.replies : [];
      screen.innerHTML = `
        <section class="spm-detail-shell">
          <button id="spmThreadDetailBack" class="spm-chat-back spm-detail-back" type="button">Back</button>
          <div class="spm-detail-hero thread no-media">
            <div class="spm-detail-overlay">
              <span class="spm-detail-badge"><i class="fa-solid fa-comments"></i> Thread</span>
              <h2>${html(thread.title || thread.subject || 'Discussion')}</h2>
              <p>${html(threadAuthor)} · ${html(formatTime(thread.createdAt || thread.created_at))}</p>
            </div>
          </div>
          <article class="spm-detail-card">
            <div class="spm-detail-grid">
              <div><span>Category</span><strong>${html(thread.category || 'General')}</strong></div>
              <div><span>Sport</span><strong>${html(thread.sport || 'Sports')}</strong></div>
              <div><span>Replies</span><strong>${html(String(thread.replyCount || replies.length || 0))}</strong></div>
              <div><span>Views</span><strong>${html(String(thread.viewCount || 0))}</strong></div>
            </div>
            <div class="spm-detail-copy">
              <h3>Topic</h3>
              <p>${html(thread.body || thread.content || thread.description || 'No content provided.')}</p>
            </div>
            <div class="spm-thread-replies" id="spmThreadReplies">
              <h4>Replies</h4>
              ${replies.length ? replies.map(function (reply) {
                var author = (reply.author && ([reply.author.firstName, reply.author.lastName].filter(Boolean).join(' ') || reply.author.email)) || 'Member';
                return '<article class="spm-thread-reply"><strong>' + html(author) + '</strong><small>' + html(formatTime(reply.createdAt)) + '</small><p>' + html(reply.body || '') + '</p></article>';
              }).join('') : '<div class="spm-empty" style="padding:10px 0">No replies yet.</div>'}
            </div>
            <div class="spm-thread-reply-form">
              <textarea id="spmThreadReplyInput" class="spm-search" placeholder="Reply to this thread..."></textarea>
              <button id="spmSendThreadReplyBtn" class="spm-primary-action" type="button">Reply</button>
            </div>
          </article>
        </section>`;

      document.getElementById('spmThreadDetailBack').addEventListener('click', function () {
        app.route = threadBackRoute();
        app.detailBackRoute = null;
        render();
      });

      document.getElementById('spmSendThreadReplyBtn').addEventListener('click', async function () {
        var button = document.getElementById('spmSendThreadReplyBtn');
        var input = document.getElementById('spmThreadReplyInput');
        var value = (input && input.value || '').trim();
        if (!value) return;
        button.disabled = true;
        try {
          await window.SpopeerAPI.request('/api/forums/' + encodeURIComponent(thread.id) + '/replies', {
            method: 'POST',
            body: JSON.stringify({ body: value })
          });
          app.selectedThread = thread;
          app.route = 'thread-detail';
          render();
        } catch (_error) {
          button.textContent = 'Could not send';
          window.setTimeout(function () { button.textContent = 'Reply'; }, 1000);
        } finally {
          button.disabled = false;
        }
      });
    },

    community: async function () {
      setTitle('Community', 'Groups & forums');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading community...</div>';
      try {
        var responses = await Promise.allSettled([
          window.SpopeerAPI.request ? window.SpopeerAPI.request('/api/groups?limit=20') : fetch('/api/groups?limit=20', { credentials: 'include' }).then(function (r) { return r.json(); }),
          window.SpopeerAPI.request ? window.SpopeerAPI.request('/api/forums?limit=20') : fetch('/api/forums?limit=20', { credentials: 'include' }).then(function (r) { return r.json(); })
        ]);
        var groupsRaw = responses[0].status === 'fulfilled' ? responses[0].value : null;
        var forumsRaw = responses[1].status === 'fulfilled' ? responses[1].value : null;
        var groups = groupsRaw && Array.isArray(groupsRaw.data) ? groupsRaw.data : (Array.isArray(groupsRaw) ? groupsRaw : (groupsRaw && groupsRaw.groups) || []);
        var forums = forumsRaw && Array.isArray(forumsRaw.data) ? forumsRaw.data : (Array.isArray(forumsRaw) ? forumsRaw : (forumsRaw && forumsRaw.forums) || []);

        screen.innerHTML = `<div class="spm-screen-header"><h2 class="spm-screen-title"><i class="fa-solid fa-users"></i> Community</h2><p class="spm-screen-sub">Groups &amp; discussion forums</p></div>` +
          (groups.length ? '<div class="spm-section-label">Groups</div><div id="spmGroupsList"></div>' : '') +
          (forums.length ? '<div class="spm-section-label">Forum Threads</div><div id="spmForumsList"></div>' : '') +
          (!groups.length && !forums.length ? '<div class="spm-empty">No community content yet.</div>' : '');

        var groupsList = document.getElementById('spmGroupsList');
        if (groupsList) {
          groups.slice(0, 10).forEach(function (group) {
            var card = document.createElement('article');
            card.className = 'spm-feed-card';
            var memberCount = Number(group.memberCount || group.membersCount || 0);
            var groupId = String(group.id || '');
            card.innerHTML = `
              <div class="spm-feed-head">
                <div class="spm-mini-avatar"><i class="fa-solid fa-users"></i></div>
                <div class="spm-feed-title-wrap">
                  <strong>${html(group.name || 'Group')}</strong>
                  <small>${memberCount ? memberCount.toLocaleString() + ' members' : 'Open group'}</small>
                </div>
                <span class="spm-feed-chip static">${html(group.sport || group.category || 'Sports')}</span>
              </div>
              <p class="spm-feed-copy">${html(group.description || group.bio || 'A sports community group.')}</p>
              <div class="spm-detail-actions"><button type="button" class="spm-primary-action" data-open-group="${html(groupId)}">Open Group</button></div>`;
            groupsList.appendChild(card);
          });
          groupsList.querySelectorAll('[data-open-group]').forEach(function (button) {
            button.addEventListener('click', function () {
              var groupId = button.getAttribute('data-open-group');
              var selected = groups.find(function (entry) { return String(entry.id || '') === String(groupId || ''); });
              if (!selected) return;
              app.selectedGroup = selected;
              app.detailBackRoute = 'community';
              app.route = 'group-detail';
              render();
            });
          });
        }

        var forumsList = document.getElementById('spmForumsList');
        if (forumsList) {
          forums.slice(0, 15).forEach(function (thread) {
            var card = document.createElement('article');
            card.className = 'spm-feed-card';
            var authorStr = (thread.author && (thread.author.displayName || thread.author.firstName || thread.author.email)) || thread.userName || thread.authorName || 'Member';
            var threadId = String(thread.id || '');
            card.innerHTML = `
              <div class="spm-feed-head">
                <div class="spm-mini-avatar">${html(initialForName(authorStr))}</div>
                <div class="spm-feed-title-wrap">
                  <strong>${html(thread.title || thread.subject || 'Discussion')}</strong>
                  <small>${html(authorStr)} · ${html(formatTime(thread.createdAt))}</small>
                </div>
              </div>
              <p class="spm-feed-copy">${html(thread.body || thread.content || thread.description || '')}</p>
              <div class="spm-feed-meta">
                <span class="spm-feed-chip static">${html(thread.category || 'Forum')}</span>
                ${thread.repliesCount ? '<span class="spm-feed-chip static"><i class="fa-regular fa-comment"></i> ' + html(String(thread.repliesCount)) + '</span>' : ''}
              </div>
              <div class="spm-detail-actions"><button type="button" class="spm-primary-action" data-open-forum-thread="${html(threadId)}">Open Thread</button></div>`;
            forumsList.appendChild(card);
          });
          forumsList.querySelectorAll('[data-open-forum-thread]').forEach(function (button) {
            button.addEventListener('click', function () {
              var threadId = button.getAttribute('data-open-forum-thread');
              var selected = forums.find(function (entry) { return String(entry.id || '') === String(threadId || ''); });
              if (!selected) return;
              app.selectedThread = selected;
              app.detailBackRoute = 'community';
              app.route = 'thread-detail';
              render();
            });
          });
        }
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load community content.</div>';
      }
    },

    'group-detail': async function () {
      setTitle('Group Details', 'Community');
      var screen = $('#spmScreen');
      var group = app.selectedGroup;
      screen.classList.remove('spm-snap-feed');
      if (!group) {
        app.route = groupBackRoute();
        render();
        return;
      }

      if (group.id && window.SpopeerAPI && typeof window.SpopeerAPI.request === 'function') {
        try {
          var detail = await window.SpopeerAPI.request('/api/groups/' + encodeURIComponent(group.id));
          group = (detail && detail.data) || group;
          app.selectedGroup = group;
        } catch (_error) {}
      }

      var creator = group.creator || {};
      var creatorName = [creator.firstName, creator.lastName].filter(Boolean).join(' ') || 'Community member';
      var memberCount = Number(group.memberCount || (group.members && group.members.length) || 0);
      var members = Array.isArray(group.members) ? group.members : [];
      screen.innerHTML = `
        <section class="spm-detail-shell">
          <button id="spmGroupDetailBack" class="spm-chat-back spm-detail-back" type="button">Back</button>
          <div class="spm-detail-hero group no-media">
            <div class="spm-detail-overlay">
              <span class="spm-detail-badge"><i class="fa-solid fa-users"></i> Group</span>
              <h2>${html(group.name || 'Community Group')}</h2>
              <p>${html(creatorName)} · ${memberCount.toLocaleString()} members</p>
            </div>
          </div>
          <article class="spm-detail-card">
            <div class="spm-detail-grid">
              <div><span>Sport</span><strong>${html(group.sport || 'All Sports')}</strong></div>
              <div><span>Privacy</span><strong>${group.isPrivate ? 'Private' : 'Public'}</strong></div>
              <div><span>Member Count</span><strong>${memberCount.toLocaleString()}</strong></div>
              <div><span>Status</span><strong>${group.isMember ? 'Joined' : 'Not Joined'}</strong></div>
            </div>
            <div class="spm-detail-copy">
              <h3>About this group</h3>
              <p>${html(group.description || 'No group description available yet.')}</p>
            </div>
            <div class="spm-thread-replies" id="spmGroupMembers">
              <h4>Members</h4>
              ${members.length ? members.slice(0, 12).map(function (member) {
                var user = member.user || {};
                var name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Member';
                return '<article class="spm-thread-reply"><strong>' + html(name) + '</strong><small>' + html(member.role || user.role || 'member') + '</small></article>';
              }).join('') : '<div class="spm-empty" style="padding:10px 0">No member list yet.</div>'}
            </div>
            <div class="spm-detail-actions">
              <button id="spmGroupJoinLeaveBtn" class="spm-primary-action" type="button">${group.isMember ? 'Leave Group' : 'Join Group'}</button>
              <button id="spmGroupShareBtn" class="spm-chat-back" type="button">Share</button>
            </div>
          </article>
        </section>`;

      document.getElementById('spmGroupDetailBack').addEventListener('click', function () {
        app.route = groupBackRoute();
        app.detailBackRoute = null;
        render();
      });

      document.getElementById('spmGroupJoinLeaveBtn').addEventListener('click', async function () {
        var button = document.getElementById('spmGroupJoinLeaveBtn');
        button.disabled = true;
        try {
          if (group.isMember) {
            await window.SpopeerAPI.request('/api/groups/' + encodeURIComponent(group.id) + '/leave', { method: 'DELETE' });
            group.isMember = false;
          } else {
            await window.SpopeerAPI.request('/api/groups/' + encodeURIComponent(group.id) + '/join', { method: 'POST' });
            group.isMember = true;
          }
          app.selectedGroup = group;
          app.route = 'group-detail';
          render();
        } catch (_error) {
          button.textContent = 'Could not update';
          window.setTimeout(function () { button.textContent = group.isMember ? 'Leave Group' : 'Join Group'; }, 1000);
        } finally {
          button.disabled = false;
        }
      });

      document.getElementById('spmGroupShareBtn').addEventListener('click', function () {
        var shareText = (group.name || 'Community Group') + ' · ' + (group.sport || 'Sports');
        if (navigator.share) {
          navigator.share({ title: group.name || 'Community Group', text: shareText, url: window.location.href }).catch(function () {});
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).catch(function () {});
        }
      });
    },

    profile: async function () {
      setTitle('Profile', 'Your sports identity');
      $('#spmScreen').classList.remove('spm-snap-feed');
      try { const result = await window.SpopeerAPI.getProfile(); app.user = unwrapUser(result) || app.user || {}; } catch (_error) {}
      const user = app.user || {};
      const name = displayNameFromUser(user);
      const avatarUrl = user.avatarUrl || user.avatar || user.profileImageUrl || user.profilePhoto || '';
      const coverUrl = user.coverUrl || user.coverImage || avatarUrl || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=900';
      const role = user.role || user.userType || 'Sports profile';
      const sport = user.sport || user.primarySport || '-';
      const position = user.position || user.preferredPosition || user.cardPosition || '-';
      const team = user.team || user.clubName || user.organization || '-';
      const level = user.level || user.skillLevel || user.competitiveLevel || '-';
      const location = user.location || user.city || user.country || '-';
      const experience = user.experience || user.sportsYears || user.profExperience || user.yearsOfExperience || user.yearsOfCoaching || '-';
      const media = Number(user.mediaCount || user.postsCount || user.postCount || 0);
      const followers = Number(user.followersCount || user.followers || 0);
      const following = Number(user.followingCount || user.following || 0);
      const subscriptionInfo = resolveSubscriptionInfo(user);
      var pendingFollowRequestsCount = 0;
      if (window.SpopeerAPI) {
        try {
          var incomingCount = 0;
          var outgoingCount = 0;
          if (typeof window.SpopeerAPI.listIncomingFollowRequests === 'function') {
            incomingCount = unwrapFollowRequests(await window.SpopeerAPI.listIncomingFollowRequests()).length;
          }
          if (typeof window.SpopeerAPI.listOutgoingFollowRequests === 'function') {
            outgoingCount = unwrapFollowRequests(await window.SpopeerAPI.listOutgoingFollowRequests()).length;
          }
          pendingFollowRequestsCount = incomingCount + outgoingCount;
        } catch (_requestsErr) {}
      }

      const joinedValue = user.createdAt || user.created_at || user.joinedAt || user.memberSince || user.updatedAt;
      var joinedLabel = '-';
      if (joinedValue) {
        var joinedDate = new Date(joinedValue);
        if (!Number.isNaN(joinedDate.getTime())) {
          joinedLabel = joinedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }
      }

      $('#spmScreen').innerHTML = `
        <section class="spm-profile-shell">
          <div class="spm-profile-cover" style="background-image:url('${html(coverUrl)}')"></div>
          <div class="spm-profile-card">
            <div class="spm-profile-head">
              <div class="spm-profile-avatar">${avatarUrl ? '<img src="' + html(avatarUrl) + '" alt="' + html(name) + '">' : html(initialForName(name))}</div>
              <div class="spm-profile-identity">
                <h2>${html(name)}</h2>
                <p>${html(role)} · ${html(sport)}</p>
              </div>
            </div>

            <div class="spm-profile-stats">
              <div><strong>${followers.toLocaleString()}</strong><span>Followers</span></div>
              <div><strong>${following.toLocaleString()}</strong><span>Following</span></div>
              <div><strong>${media.toLocaleString()}</strong><span>Media</span></div>
            </div>

            <div class="spm-profile-fields">
              <div class="spm-profile-field"><span>Sport</span><strong>${html(sport)}</strong></div>
              <div class="spm-profile-field"><span>Position</span><strong>${html(position)}</strong></div>
              <div class="spm-profile-field"><span>Team</span><strong>${html(team)}</strong></div>
              <div class="spm-profile-field"><span>Level</span><strong>${html(level)}</strong></div>
              <div class="spm-profile-field"><span>Location</span><strong>${html(location)}</strong></div>
              <div class="spm-profile-field"><span>Experience</span><strong>${html(String(experience))}</strong></div>
              <div class="spm-profile-field"><span>Member Since</span><strong>${html(joinedLabel)}</strong></div>
              <div class="spm-profile-field"><span>Subscription</span><strong>${html(subscriptionInfo.code + ' · ' + subscriptionInfo.label)}</strong></div>
              ${renderSubscriptionFeatureRows(subscriptionInfo.features, 3)}
            </div>

            <div class="spm-profile-bio">${html(user.bio || user.about || 'Add your story, achievements, and goals to strengthen your profile.')}</div>

            <div class="spm-profile-actions">
              <button id="spmChangeCoverBtn" class="spm-primary-action" type="button"><i class="fa-solid fa-panorama"></i> Change Profile Cover</button>
              <button id="spmChangeAvatarBtn" class="spm-primary-action" type="button"><i class="fa-solid fa-camera"></i> Change Avatar</button>
              <button id="spmChooseAvatarFromMediaBtn" class="spm-primary-action" type="button"><i class="fa-regular fa-images"></i> Choose From My Media</button>
              <input id="spmCoverFileInput" type="file" accept="image/*" class="spm-hidden">
              <input id="spmAvatarFileInput" type="file" accept="image/*" class="spm-hidden">
              <div id="spmAvatarMediaPicker" class="spm-avatar-picker spm-hidden"></div>
              <button id="spmEditProfileBtn" class="spm-primary-action" type="button"><i class="fa-solid fa-pen-to-square"></i> Edit Profile</button>
              <button id="spmFollowRequestsBtn" class="spm-primary-action" type="button"><i class="fa-regular fa-envelope-open"></i> Follow Requests${pendingFollowRequestsCount > 0 ? ' (' + pendingFollowRequestsCount + ')' : ''}</button>
              <button id="spmManagePlanBtn" class="spm-primary-action" type="button"><i class="fa-solid fa-layer-group"></i> Manage Plan</button>
              <button id="spmSignOutBtn" class="spm-signout-btn" type="button"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
            </div>
          </div>
        </section>`;

      async function refreshProfileAfterProfileImageChange() {
        try {
          var refreshed = await window.SpopeerAPI.getProfile();
          app.user = unwrapUser(refreshed) || app.user || {};
        } catch (_error) {}
        app.route = 'profile';
        render();
      }

      var coverFileInput = document.getElementById('spmCoverFileInput');
      var changeCoverBtn = document.getElementById('spmChangeCoverBtn');
      if (changeCoverBtn && coverFileInput) {
        changeCoverBtn.addEventListener('click', function () {
          coverFileInput.click();
        });

        coverFileInput.addEventListener('change', async function () {
          var file = coverFileInput.files && coverFileInput.files[0];
          if (!file) return;
          changeCoverBtn.disabled = true;
          changeCoverBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
          try {
            await window.SpopeerAPI.uploadCover(file);
            await refreshProfileAfterProfileImageChange();
          } catch (_error) {
            changeCoverBtn.disabled = false;
            changeCoverBtn.innerHTML = '<i class="fa-solid fa-panorama"></i> Change Profile Cover';
          }
        });
      }

      var avatarFileInput = document.getElementById('spmAvatarFileInput');
      var changeAvatarBtn = document.getElementById('spmChangeAvatarBtn');
      if (changeAvatarBtn && avatarFileInput) {
        changeAvatarBtn.addEventListener('click', function () {
          avatarFileInput.click();
        });

        avatarFileInput.addEventListener('change', async function () {
          var file = avatarFileInput.files && avatarFileInput.files[0];
          if (!file) return;
          changeAvatarBtn.disabled = true;
          changeAvatarBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
          try {
            await window.SpopeerAPI.uploadAvatar(file);
            await refreshProfileAfterProfileImageChange();
          } catch (_error) {
            changeAvatarBtn.disabled = false;
            changeAvatarBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Change Avatar';
          }
        });
      }

      var chooseFromMediaBtn = document.getElementById('spmChooseAvatarFromMediaBtn');
      var avatarMediaPicker = document.getElementById('spmAvatarMediaPicker');
      if (chooseFromMediaBtn && avatarMediaPicker) {
        chooseFromMediaBtn.addEventListener('click', async function () {
          chooseFromMediaBtn.disabled = true;
          chooseFromMediaBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading Media...';
          try {
            var mediaItems = await fetchMyUploadedMedia(user);
            if (!mediaItems.length) {
              avatarMediaPicker.innerHTML = '<div class="spm-empty" style="padding:10px">No uploaded images found yet.</div>';
              avatarMediaPicker.classList.remove('spm-hidden');
            } else {
              avatarMediaPicker.innerHTML =
                '<div class="spm-avatar-picker-head"><strong>Select Profile Image</strong><button id="spmCloseAvatarPickerBtn" type="button">Close</button></div>' +
                '<div class="spm-avatar-picker-grid">' +
                mediaItems.map(function (item) {
                  return '<button type="button" class="spm-avatar-media-item" data-avatar-url="' + html(item.url) + '"><img src="' + html(item.url) + '" alt="Media"></button>';
                }).join('') +
                '</div>';
              avatarMediaPicker.classList.remove('spm-hidden');

              var closePickerBtn = document.getElementById('spmCloseAvatarPickerBtn');
              if (closePickerBtn) {
                closePickerBtn.addEventListener('click', function () {
                  avatarMediaPicker.classList.add('spm-hidden');
                });
              }

              avatarMediaPicker.querySelectorAll('.spm-avatar-media-item').forEach(function (button) {
                button.addEventListener('click', async function () {
                  var selectedUrl = button.getAttribute('data-avatar-url');
                  if (!selectedUrl) return;
                  button.disabled = true;
                  try {
                    await window.SpopeerAPI.updateProfile({ avatarUrl: selectedUrl });
                    await refreshProfileAfterProfileImageChange();
                  } catch (_error) {
                    button.disabled = false;
                  }
                });
              });
            }
          } catch (_error) {
          } finally {
            chooseFromMediaBtn.disabled = false;
            chooseFromMediaBtn.innerHTML = '<i class="fa-regular fa-images"></i> Choose From My Media';
          }
        });
      }

      var editProfileBtn = document.getElementById('spmEditProfileBtn');
      if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function () {
          window.location.href = '/pages/profiles/edit-profile.html';
        });
      }

      var managePlanBtn = document.getElementById('spmManagePlanBtn');
      if (managePlanBtn) {
        managePlanBtn.addEventListener('click', function () {
          window.location.href = '/pages/dashboard/settings.html#section-subscription';
        });
      }

      var followRequestsBtn = document.getElementById('spmFollowRequestsBtn');
      if (followRequestsBtn) {
        followRequestsBtn.addEventListener('click', function () {
          app.route = 'follow-requests';
          render();
        });
      }

      document.getElementById('spmSignOutBtn').addEventListener('click', async function () {
        if (window.Auth && typeof window.Auth.logout === 'function') {
          await window.Auth.logout();
        } else {
          ['token','user','session','sb-auth-token','supabase.auth.token','spopeer_loggedIn','spopeer_user','spopeer_token'].forEach(function(k){ localStorage.removeItem(k); });
          sessionStorage.clear();
        }
        window.location.href = '/mobile.html';
      });
    }

    ,

    'follow-requests': async function () {
      setTitle('Follow Requests', 'Manage incoming and sent requests');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading follow requests...</div>';

      try {
        var incomingResult = null;
        var outgoingResult = null;
        if (window.SpopeerAPI && typeof window.SpopeerAPI.listIncomingFollowRequests === 'function') {
          incomingResult = await window.SpopeerAPI.listIncomingFollowRequests();
        }
        if (window.SpopeerAPI && typeof window.SpopeerAPI.listOutgoingFollowRequests === 'function') {
          outgoingResult = await window.SpopeerAPI.listOutgoingFollowRequests();
        }
        var incomingRequests = unwrapFollowRequests(incomingResult);
        var outgoingRequests = unwrapFollowRequests(outgoingResult);

        if (!incomingRequests.length && !outgoingRequests.length) {
          screen.innerHTML = '<section class="spm-library-shell"><div class="spm-empty"><strong>No pending requests</strong><p>When users request to follow you, they will appear here.</p><button id="spmBackToProfileFromRequests" class="spm-chat-back" type="button">Back to Profile</button></div></section>';
          var backEmpty = document.getElementById('spmBackToProfileFromRequests');
          if (backEmpty) {
            backEmpty.addEventListener('click', function () {
              app.route = 'profile';
              render();
            });
          }
          return;
        }

        screen.innerHTML = '<section class="spm-library-shell"><div class="spm-library-hero"><div><p class="spm-library-kicker">Connections</p><h2>Follow requests</h2><p class="spm-library-copy">Accept incoming requests or cancel requests you sent.</p></div><div class="spm-library-stats"><article><strong>' + incomingRequests.length + '</strong><span>Incoming</span></article><article><strong>' + outgoingRequests.length + '</strong><span>Sent</span></article></div></div><div id="spmFollowRequestsList"></div><div class="spm-detail-actions" style="margin-top:12px"><button id="spmBackToProfileRequests" class="spm-chat-back" type="button">Back to Profile</button></div></section>';

        var list = document.getElementById('spmFollowRequestsList');
        if (incomingRequests.length) {
          var incomingHeader = document.createElement('p');
          incomingHeader.className = 'spm-library-kicker';
          incomingHeader.style.margin = '4px 0 8px';
          incomingHeader.textContent = 'Incoming requests';
          list.appendChild(incomingHeader);

          incomingRequests.forEach(function (request) {
            var requestId = request.id || request.connectionId;
            var reqUser = request.user || request.follower || request.sender || {};
            var userId = reqUser.id || reqUser.userId || '';
            var name = displayNameFromUser(reqUser);
            var sport = reqUser.sport || reqUser.primarySport || 'Sport';
            var role = reqUser.role || reqUser.userType || 'Member';
            var card = document.createElement('article');
            card.className = 'spm-feed-card';
            card.innerHTML = '<div class="spm-feed-head"><div class="spm-mini-avatar">' + html(initialForName(name)) + '</div><div class="spm-feed-title-wrap"><strong>' + html(name) + '</strong><small>' + html(role + ' · ' + sport) + '</small></div></div><div class="spm-detail-actions"><button class="spm-chat-back" data-follow-reject="' + html(String(requestId || '')) + '">Reject</button><button class="spm-primary-action" data-follow-accept="' + html(String(requestId || '')) + '" data-request-user-id="' + html(String(userId || '')) + '">Accept</button></div>';
            list.appendChild(card);
          });
        }

        if (outgoingRequests.length) {
          var outgoingHeader = document.createElement('p');
          outgoingHeader.className = 'spm-library-kicker';
          outgoingHeader.style.margin = '16px 0 8px';
          outgoingHeader.textContent = 'Sent requests';
          list.appendChild(outgoingHeader);

          outgoingRequests.forEach(function (request) {
            var requestId = request.id || request.connectionId;
            var reqUser = request.user || request.followedUser || request.following || {};
            var name = displayNameFromUser(reqUser);
            var sport = reqUser.sport || reqUser.primarySport || 'Sport';
            var role = reqUser.role || reqUser.userType || 'Member';
            var card = document.createElement('article');
            card.className = 'spm-feed-card';
            card.innerHTML = '<div class="spm-feed-head"><div class="spm-mini-avatar">' + html(initialForName(name)) + '</div><div class="spm-feed-title-wrap"><strong>' + html(name) + '</strong><small>' + html(role + ' · ' + sport) + '</small></div></div><div class="spm-detail-actions"><button class="spm-chat-back" data-follow-cancel="' + html(String(requestId || '')) + '">Cancel Request</button></div>';
            list.appendChild(card);
          });
        }

        list.querySelectorAll('[data-follow-accept]').forEach(function (button) {
          button.addEventListener('click', async function () {
            var requestId = button.getAttribute('data-follow-accept');
            var requestUserId = button.getAttribute('data-request-user-id');
            if (!requestId) return;
            button.disabled = true;
            try {
              await window.SpopeerAPI.acceptFollowRequest(requestId);
              if (window.CurrentUserStore && typeof window.CurrentUserStore.refreshCurrentUser === 'function') {
                try { await window.CurrentUserStore.refreshCurrentUser(); } catch (_refreshErr) {}
              }
              if (requestUserId) {
                window.dispatchEvent(new CustomEvent('followRelationChanged', {
                  detail: {
                    targetUserId: requestUserId,
                    deltaFollowers: 1,
                    deltaFollowing: 0,
                    action: 'accept-follow-request'
                  }
                }));
              }
              app.route = 'follow-requests';
              render();
            } catch (_error) {
              button.disabled = false;
            }
          });
        });

        list.querySelectorAll('[data-follow-reject]').forEach(function (button) {
          button.addEventListener('click', async function () {
            var requestId = button.getAttribute('data-follow-reject');
            if (!requestId) return;
            button.disabled = true;
            try {
              await window.SpopeerAPI.rejectFollowRequest(requestId);
              app.route = 'follow-requests';
              render();
            } catch (_error) {
              button.disabled = false;
            }
          });
        });

        list.querySelectorAll('[data-follow-cancel]').forEach(function (button) {
          button.addEventListener('click', async function () {
            var requestId = button.getAttribute('data-follow-cancel');
            if (!requestId) return;
            button.disabled = true;
            try {
              if (window.SpopeerAPI && typeof window.SpopeerAPI.cancelFollowRequest === 'function') {
                await window.SpopeerAPI.cancelFollowRequest(requestId);
              } else {
                await window.SpopeerAPI.rejectFollowRequest(requestId);
              }
              app.route = 'follow-requests';
              render();
            } catch (_error) {
              button.disabled = false;
            }
          });
        });

        var backBtn = document.getElementById('spmBackToProfileRequests');
        if (backBtn) {
          backBtn.addEventListener('click', function () {
            app.route = 'profile';
            render();
          });
        }
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load follow requests.</div>';
      }
    }
  };

  function render() {
    if (app.route !== 'story-view') {
      clearStoryTimer();
    }
    const screen = screens[app.route] || screens.feed;
    document.querySelectorAll('.spm-tabbar button').forEach(function (button) { button.classList.toggle('active', button.dataset.route === app.route); });
    Promise.resolve(screen()).finally(function () {
      refreshTopbarStats();
    });
  }

  function isAdminUser(user) {
    if (!user) return false;
    var role = String(user.role || user.userType || '').toLowerCase();
    return user.isAdmin === true || role === 'admin' || role === 'superadmin';
  }

  function updateDrawerAccessByRole() {
    var adminDashboardItem = document.getElementById('spmAdminDashboardItem');
    if (!adminDashboardItem) return;
    adminDashboardItem.classList.toggle('spm-hidden', !isAdminUser(app.user));

    var drawer = document.getElementById('spmDrawer');
    if (!drawer) return;

    var user = app.user || {};
    var info = resolveSubscriptionInfo(user);
    var block = document.getElementById('spmDrawerPlanBlock');
    if (!block) {
      block = document.createElement('div');
      block.id = 'spmDrawerPlanBlock';
      block.className = 'spm-drawer-item';
      block.style.display = 'block';
      block.style.borderTop = '1px solid rgba(148, 163, 184, 0.25)';
      block.style.marginTop = '10px';
      block.style.paddingTop = '12px';
      var accountSection = Array.from(drawer.querySelectorAll('.spm-drawer-section')).find(function (node) {
        return String(node.textContent || '').toLowerCase().indexOf('account') !== -1;
      });
      if (accountSection && accountSection.parentNode) {
        accountSection.parentNode.insertBefore(block, accountSection.nextSibling);
      } else {
        drawer.appendChild(block);
      }
    }

    var featureRows = (info.features || []).slice(0, 2).map(function (feature) {
      return '<div style="font-size:11px;color:#64748b;line-height:1.35">• ' + html(feature.text || '') + '</div>';
    }).join('');

    block.innerHTML = '' +
      '<div style="font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#334155">Current Plan</div>' +
      '<div style="font-size:13px;font-weight:700;color:#0f172a;margin:4px 0 6px">' + html(info.code + ' · ' + info.label) + '</div>' +
      featureRows +
      '<a href="/pages/dashboard/settings.html#section-subscription" style="display:inline-flex;margin-top:7px;font-size:12px;font-weight:700;color:#001f3f;text-decoration:none">Manage Subscription</a>';
  }

  function bindNav() {
    document.querySelectorAll('[data-route]').forEach(function (button) { button.addEventListener('click', function () { app.route = button.dataset.route; render(); }); });
    const menuBtn = $('#spmMenuBtn');
    const drawer = $('#spmDrawer');
    const drawerOverlay = $('#spmDrawerOverlay');
    function closeDrawer() { if (drawer) drawer.classList.remove('spm-drawer-open'); if (drawerOverlay) drawerOverlay.classList.remove('spm-drawer-open'); }
    if (menuBtn && drawer) {
      menuBtn.addEventListener('click', function () { drawer.classList.toggle('spm-drawer-open'); drawerOverlay.classList.toggle('spm-drawer-open'); });
      drawerOverlay.addEventListener('click', closeDrawer);
      drawer.querySelectorAll('[data-route]').forEach(function (item) {
        item.addEventListener('click', function () { app.route = item.dataset.route; closeDrawer(); render(); });
      });
      var drawerThemeToggle = document.getElementById('spmDrawerThemeToggle');
      if (drawerThemeToggle) {
        drawerThemeToggle.addEventListener('click', function () {
          toggleTheme();
          closeDrawer();
        });
      }
      var drawerSignOut = document.getElementById('spmDrawerSignOut');
      if (drawerSignOut) {
        drawerSignOut.addEventListener('click', async function () {
          teardownRealtimeSocket();
          if (window.Auth && typeof window.Auth.logout === 'function') {
            await window.Auth.logout();
          } else {
            ['token','user','session','sb-auth-token','supabase.auth.token','spopeer_loggedIn','spopeer_user','spopeerUser','spopeer_token','spopeerToken','spopeer_last_auth_at'].forEach(function(k){ localStorage.removeItem(k); });
            sessionStorage.clear();
          }
          window.location.href = '/mobile.html';
        });
      }
    }
  }

  async function init() {
    applyStoredTheme();
    bindNav();
    updateDrawerAccessByRole();
    // Safety net: never leave users on a blank splash if init hangs.
    window.setTimeout(function () {
      var splash = $('#spmSplash');
      var shell = $('#spmShell');
      var auth = $('#spmAuth');
      if (!splash || !shell || !auth) return;
      var shellHidden = shell.classList.contains('spm-hidden');
      var authHidden = auth.classList.contains('spm-hidden');
      if (shellHidden && authHidden) {
        splash.classList.add('spm-hidden');
        auth.classList.remove('spm-hidden');
      }
    }, 6000);

    window.setTimeout(async function () {
      var splash = $('#spmSplash');
      function revealTarget(targetSelector) {
        if (!splash) return;
        splash.classList.add('spm-splash-exit');
        window.setTimeout(function () {
          splash.classList.add('spm-hidden');
          var target = $(targetSelector);
          if (target) target.classList.remove('spm-hidden');
        }, 320);
      }
      try {
        const result = await window.SpopeerAPI.me();
        app.user = unwrapUser(result);
        initRealtimeSocket();
        updateDrawerAccessByRole();
        revealTarget('#spmShell');
        render();
        refreshTopbarStats();
      } catch (_error) {
        // Keep mobile app in signed-in shell when local session still exists,
        // mirroring desktop anti-bounce behavior for transient /me failures.
        if (hasLocalSessionSignal()) {
          app.user = getStoredSessionUser() || app.user || null;
          initRealtimeSocket();
          updateDrawerAccessByRole();
          revealTarget('#spmShell');
          render();
          refreshTopbarStats();
          return;
        }

        app.user = null;
        teardownRealtimeSocket();
        updateDrawerAccessByRole();
        revealTarget('#spmAuth');
      }
    }, 1650);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
