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

  function imageForPost(post) {
    return post.image || post.imageUrl || post.mediaUrl || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=900';
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
    card.innerHTML = `
      <div class="spm-feed-head">
        <div class="spm-mini-avatar"></div>
        <div class="spm-feed-title-wrap">
          <strong>${html(authorName(post))}</strong>
          <small>${html(formatTime(post.createdAt || post.created_at))}</small>
        </div>
      </div>
      <div class="spm-feed-image" style="background-image:url('${html(imageForPost(post))}')"></div>
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

  const screens = {
    feed: async function () {
      setTitle('Feed', 'AI Agent Center');
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

        container.innerHTML = `
          <section class="spm-ai-card">
            <div class="spm-ai-head">
              <strong>AI Sports Agent</strong>
              <button id="spmThemeToggle" class="spm-theme-toggle" type="button" aria-label="Toggle dark mode">🌓</button>
            </div>
            <p>Ask me to find athletes, write an article, manage messages, or surface opportunities in your network.</p>
            <div class="spm-chip-row">
              <span class="spm-chip">Secretary</span>
              <span class="spm-chip">Manager</span>
              <span class="spm-chip">Journalist</span>
            </div>
          </section>`;

        var themeButton = document.getElementById('spmThemeToggle');
        if (themeButton) themeButton.addEventListener('click', toggleTheme);

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
      $('#spmScreen').innerHTML = `
        <div class="spm-profile-hero"><div style="background-image:url('${html(imageForPost(post))}')"></div></div>
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
      $('#spmScreen').innerHTML = '<div class="spm-timeline"><div class="spm-timeline-item"><span class="spm-dot"></span><div><strong>New follower</strong><p>2 min ago</p></div></div><div class="spm-timeline-item"><span class="spm-dot"></span><div><strong>Post liked</strong><p>10 min ago</p></div></div></div>';
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
    screen();
  }

  function bindNav() {
    document.querySelectorAll('[data-route]').forEach(function (button) { button.addEventListener('click', function () { app.route = button.dataset.route; render(); }); });
    const back = $('[data-back]');
    if (back) back.addEventListener('click', function () { app.route = 'feed'; render(); });
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
      } catch (_error) {
        revealTarget('#spmAuth');
      }
    }, 1650);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
