(function () {
  const $ = (selector) => document.querySelector(selector);
  const app = { route: 'feed', user: null, selectedPost: null, activeConversationId: null };

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

  function unwrapConversationDetails(result) {
    return (result && result.data) || result || {};
  }

  function displayNameFromUser(user) {
    return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Spopeer member';
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

  function renderStoriesRail(posts) {
    var mediaPosts = posts.filter(function (post) { return Boolean(postMediaType(post)); });
    if (!mediaPosts.length) return '';

    var seen = {};
    var items = mediaPosts.filter(function (post) {
      var author = post.author || post.user || {};
      var key = String(author.id || author.email || authorName(post));
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, 12);

    if (!items.length) return '';

    var storiesHtml = items.map(function (post) {
      var author = authorName(post);
      return '<button class="spm-story-item" type="button" data-story-post="' + html(post.id) + '"><span class="spm-story-ring"><span class="spm-story-avatar">' + html(initialForName(author)) + '</span></span><span class="spm-story-name">' + html(author.split(' ')[0] || author) + '</span></button>';
    }).join('');

    return '<section class="spm-stories"><div class="spm-stories-head"><strong>Stories</strong><small>Latest media updates</small></div><div class="spm-stories-row">' + storiesHtml + '</div></section>';
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
          window.SpopeerAPI.listPosts({ limit: 12, page: 1, _: Date.now() }),
          window.SpopeerAPI.listEvents(),
          window.SpopeerAPI.listSponsorships({ limit: 5 })
        ]);

        var posts = responses[0].status === 'fulfilled' ? unwrapPosts(responses[0].value) : [];
        var events = responses[1].status === 'fulfilled' ? unwrapEvents(responses[1].value) : [];
        var opportunities = responses[2].status === 'fulfilled' ? unwrapSponsorships(responses[2].value) : [];

        var topEvent = events[0] || null;
        var topOpportunity = opportunities[0] || null;

        container.innerHTML = renderStoriesRail(posts);
        container.querySelectorAll('[data-story-post]').forEach(function (button) {
          button.addEventListener('click', function () {
            var postId = String(button.dataset.storyPost || '');
            var selected = posts.find(function (post) { return String(post.id) === postId; });
            if (!selected) return;
            app.selectedPost = selected;
            app.route = 'post';
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
          item.addEventListener('click', async function () {
            try {
              var convo = await window.SpopeerAPI.createConversation(user.id || user.userId || user.email);
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
      const name = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Spopeer member';
      $('#spmScreen').innerHTML = `
        <div class="spm-profile-hero"><div style="background-image:url('${html(user.coverUrl || user.coverImage || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=900')}')"></div></div>
        <div class="spm-profile-panel">
          <h2>${html(name)}</h2>
          <p>${html(user.role || 'Sports profile')} · ${html(user.sport || user.primarySport || 'Sport')}</p>
        </div>
        <div class="spm-grid" style="margin-top:12px">
          <div class="spm-grid-card">Posts</div>
          <div class="spm-grid-card">Followers</div>
          <div class="spm-grid-card">Following</div>
          <div class="spm-grid-card">Settings</div>
        </div>
        <button id="spmSignOutBtn" style="width:100%;margin-top:20px;height:50px;border-radius:999px;background:#fff;border:1.5px solid #ef4444;color:#ef4444;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box">
          <i class="fa-solid fa-right-from-bracket"></i> Sign Out
        </button>`;
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
    const screen = screens[app.route] || screens.feed;
    document.querySelectorAll('.spm-tabbar button').forEach(function (button) { button.classList.toggle('active', button.dataset.route === app.route); });
    Promise.resolve(screen()).finally(function () {
      refreshTopbarStats();
    });
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
        revealTarget('#spmShell');
        render();
        refreshTopbarStats();
      } catch (_error) {
        revealTarget('#spmAuth');
      }
    }, 1650);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
