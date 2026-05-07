(function () {
  const $ = (selector) => document.querySelector(selector);
  const app = { route: 'feed', user: null, selectedPost: null, selectedStory: null, storyFeed: [], storyIndex: -1, storyAutoTimer: null, selectedProfile: null, selectedProfileIdentifier: null, activeConversationId: null };

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

  function unwrapSearchUsers(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.users)) return result.users;
    if (Array.isArray(result.data)) return result.data;
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
          <strong>${html(authorName(post))}</strong>
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

  function listingTitle(item) {
    return item.title || item.name || item.category || 'Marketplace listing';
  }

  function listingPrice(item) {
    if (item.price === 0) return 'Free';
    if (item.price) return '$' + Number(item.price).toLocaleString();
    return item.status || 'Available';
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
    var formData = new FormData();
    formData.append('media', file);
    formData.append('caption', caption || '');
    formData.append('sport', sport || (app.user && (app.user.sport || app.user.primarySport)) || 'Sport');
    formData.append('type', file.type && file.type.indexOf('video/') === 0 ? 'video' : 'image');

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
          var shareUrl = window.location.origin + '/app.html#feed';
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

      if (canFollow && window.SpopeerAPI && typeof window.SpopeerAPI.getFollowStatus === 'function') {
        try {
          var statusResult = await window.SpopeerAPI.getFollowStatus(targetUserId);
          var statusPayload = (statusResult && statusResult.data) || statusResult || {};
          isFollowing = !!statusPayload.isFollowing || statusPayload.relation === 'accepted' || statusPayload.connectionStatus === 'active';
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
              ${canFollow ? '<button id="spmFollowUserBtn" class="spm-primary-action' + (isFollowing ? ' spm-following-btn' : '') + '" type="button"><i class="fa-solid fa-user-plus"></i> ' + (isFollowing ? 'Following' : 'Follow') + '</button>' : ''}
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
            } else {
              await window.SpopeerAPI.followUser(targetUserId);
              isFollowing = true;
              followers += 1;
            }
            var followersEl = document.getElementById('spmPublicFollowersCount');
            if (followersEl) followersEl.textContent = followers.toLocaleString();
            followBtn.classList.toggle('spm-following-btn', isFollowing);
            followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> ' + (isFollowing ? 'Following' : 'Follow');
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
            item.innerHTML = `
              <span class="spm-convo-avatar">${html(initialForName(conversation.otherName || 'S'))}</span>
              <span class="spm-convo-main"><strong>${html(conversation.otherName || 'Conversation')}</strong><small>${html(conversation.lastMessage || 'Say hello')}</small></span>
              <span class="spm-convo-side">${conversation.unread ? '<i>' + html(String(conversation.unread)) + '</i>' : html(formatTime(conversation.lastAt))}</span>`;
            item.addEventListener('click', function () {
              app.activeConversationId = conversation.id;
              render();
            });
            list.appendChild(item);
          });
          return;
        }

        var detailsResult = await window.SpopeerAPI.getConversation(app.activeConversationId);
        var details = unwrapConversationDetails(detailsResult);
        var messages = Array.isArray(details.messages) ? details.messages : [];

        screen.innerHTML = `
          <div class="spm-chat">
            <div class="spm-chat-head"><button id="spmBackToConvos" class="spm-chat-back" type="button">← Back</button></div>
            <div id="spmChatBody" class="spm-chat-body"></div>
            <div class="spm-chat-input"><input id="spmChatText" placeholder="Type message"><button id="spmSendMsg">Send</button></div>
          </div>`;

        document.getElementById('spmBackToConvos').addEventListener('click', function () {
          app.activeConversationId = null;
          render();
        });

        var body = document.getElementById('spmChatBody');
        if (!messages.length) {
          body.innerHTML = '<div class="spm-empty">No messages yet. Say hello.</div>';
        } else {
          body.innerHTML = '';
          messages.forEach(function (message) {
            var bubble = document.createElement('div');
            var isMine = Number(message.senderId || message.fromId) === Number(app.user && app.user.id);
            bubble.className = 'spm-bubble' + (isMine ? ' me' : '');
            bubble.textContent = message.body || message.text || message.content || '';
            body.appendChild(bubble);
          });
          body.scrollTop = body.scrollHeight;
        }

        document.getElementById('spmSendMsg').addEventListener('click', async function () {
          var input = document.getElementById('spmChatText');
          var text = input.value.trim();
          if (!text) return;
          input.value = '';
          try {
            await window.SpopeerAPI.sendConversationMessage(app.activeConversationId, text);
            render();
          } catch (error) {
            alert(error.message || 'Could not send message.');
          }
        });
      } catch (error) {
        screen.innerHTML = '<div class="spm-empty">Could not load messages.</div>';
      }
    },

    notifications: function () {
      setTitle('Notifications', 'Latest activity');
      $('#spmScreen').classList.remove('spm-snap-feed');
      $('#spmScreen').innerHTML = '<div id="spmNotificationsList" class="spm-list"><div class="spm-empty">Loading notifications...</div></div>';
      var box = document.getElementById('spmNotificationsList');

      window.SpopeerAPI.listNotifications({ page: 1, limit: 30 }).then(function (result) {
        var notifications = unwrapNotifications(result);
        if (!notifications.length) {
          box.innerHTML = '<div class="spm-empty">No notifications yet.</div>';
          return;
        }
        box.innerHTML = '';
        notifications.forEach(function (notification) {
          var item = document.createElement('div');
          item.className = 'spm-list-item';
          item.innerHTML = '<strong>' + html(notification.type || 'Activity') + '</strong><div>' + html(notification.message || 'You have a new notification.') + '</div><small>' + html(formatTime(notification.createdAt)) + '</small>';
          box.appendChild(item);
        });
      }).catch(function () {
        box.innerHTML = '<div class="spm-empty">Could not load notifications.</div>';
      });
    },

    articles: async function () {
      setTitle('Articles', 'Latest from the network');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading articles...</div>';

      try {
        var result = await window.SpopeerAPI.listPosts({ limit: 60, page: 1, _: Date.now() });
        var posts = unwrapPosts(result).filter(looksLikeArticlePost);

        if (!posts.length) {
          screen.innerHTML = '<div class="spm-empty">No articles found yet.</div>';
          return;
        }

        screen.innerHTML = '';
        posts.slice(0, 20).forEach(function (post) {
          var card = document.createElement('article');
          card.className = 'spm-feed-card';
          card.innerHTML = `
            <div class="spm-feed-head">
              <div class="spm-mini-avatar"></div>
              <div class="spm-feed-title-wrap">
                <strong>${html(authorName(post))}</strong>
                <small>${html(formatTime(post.createdAt || post.created_at))}</small>
              </div>
            </div>
            <p class="spm-feed-copy">${html(post.content || 'Article update')}</p>
            <div class="spm-feed-meta"><span class="spm-feed-chip static">Article</span><span class="spm-feed-chip static">${html(post.sport || 'Sports')}</span></div>`;
          screen.appendChild(card);
        });
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load articles.</div>';
      }
    },

    marketplace: async function () {
      setTitle('Marketplace', 'Live listings');
      var screen = $('#spmScreen');
      screen.classList.remove('spm-snap-feed');
      screen.innerHTML = '<div class="spm-empty">Loading marketplace...</div>';

      try {
        var result = await window.SpopeerAPI.listMarketplaceListings({ page: 1, limit: 20, status: 'active' });
        var listings = unwrapMarketplaceListings(result);

        if (!listings.length) {
          screen.innerHTML = '<div class="spm-empty">No active listings right now.</div>';
          return;
        }

        screen.innerHTML = '';
        listings.forEach(function (listing) {
          var card = document.createElement('article');
          card.className = 'spm-feed-card';
          card.innerHTML = `
            <div class="spm-feed-head">
              <div class="spm-mini-avatar"></div>
              <div class="spm-feed-title-wrap">
                <strong>${html(listingTitle(listing))}</strong>
                <small>${html(formatTime(listing.createdAt))}</small>
              </div>
            </div>
            <p class="spm-feed-copy">${html(listing.description || listing.category || 'Marketplace opportunity')}</p>
            <div class="spm-feed-meta"><span class="spm-feed-chip static">${html(listingPrice(listing))}</span><span class="spm-feed-chip static">${html(listing.sport || listing.category || 'Listing')}</span></div>`;
          screen.appendChild(card);
        });
      } catch (_error) {
        screen.innerHTML = '<div class="spm-empty">Could not load marketplace listings.</div>';
      }
    },

    profile: async function () {
      setTitle('Profile', 'Your sports identity');
      $('#spmScreen').classList.remove('spm-snap-feed');
      try { const result = await window.SpopeerAPI.getProfile(); app.user = unwrapUser(result) || app.user || {}; } catch (_error) {}
      const user = app.user || {};
      const name = displayNameFromUser(user);
      const avatarUrl = user.avatarUrl || user.avatar || user.profileImageUrl || user.profilePhoto || '';
      const coverUrl = user.coverUrl || user.coverImage || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=900';
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
            </div>

            <div class="spm-profile-bio">${html(user.bio || user.about || 'Add your story, achievements, and goals to strengthen your profile.')}</div>

            <div class="spm-profile-actions">
              <button id="spmEditProfileBtn" class="spm-primary-action" type="button"><i class="fa-solid fa-pen-to-square"></i> Edit Profile</button>
              <button id="spmSignOutBtn" class="spm-signout-btn" type="button"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
            </div>
          </div>
        </section>`;

      var editProfileBtn = document.getElementById('spmEditProfileBtn');
      if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function () {
          window.location.href = '/pages/profiles/edit-profile.html';
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
          if (window.Auth && typeof window.Auth.logout === 'function') {
            await window.Auth.logout();
          } else {
            ['token','user','session','sb-auth-token','supabase.auth.token','spopeer_loggedIn','spopeer_user','spopeer_token'].forEach(function(k){ localStorage.removeItem(k); });
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
        updateDrawerAccessByRole();
        revealTarget('#spmShell');
        render();
        refreshTopbarStats();
      } catch (_error) {
        app.user = null;
        updateDrawerAccessByRole();
        revealTarget('#spmAuth');
      }
    }, 1650);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
