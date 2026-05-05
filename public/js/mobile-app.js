(function () {
  const $ = (selector) => document.querySelector(selector);
  const app = { route: 'feed', user: null, selectedPost: null };

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

  function unwrapUser(result) {
    return (result && result.data && result.data.user) || (result && result.user) || (result && result.data) || result || null;
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

  const screens = {
    feed: async function () {
      setTitle('For You', 'Swipe sports updates');
      const container = $('#spmScreen');
      container.innerHTML = '<div class="spm-empty">Loading feed...</div>';
      try {
        const result = await window.SpopeerAPI.listPosts({ limit: 20, page: 1, _: Date.now() });
        const posts = unwrapPosts(result);
        container.innerHTML = '';
        container.classList.add('spm-snap-feed');
        if (!posts.length) {
          container.innerHTML = '<div class="spm-empty">No posts yet. Create the first post.</div>';
          return;
        }
        posts.forEach(function (post) { container.appendChild(renderPostCard(post)); });
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

    search: function () {
      setTitle('Search', 'Discover people');
      $('#spmScreen').classList.remove('spm-snap-feed');
      $('#spmScreen').innerHTML = '<input class="spm-search" placeholder="Search athletes, coaches, clubs..."><div class="spm-list"><div class="spm-list-item">Athletes <span>›</span></div><div class="spm-list-item">Coaches <span>›</span></div><div class="spm-list-item">Clubs <span>›</span></div></div>';
    },

    messages: function () {
      setTitle('Messages', 'Conversation');
      $('#spmScreen').classList.remove('spm-snap-feed');
      $('#spmScreen').innerHTML = '<div class="spm-chat"><div class="spm-chat-body"><div class="spm-bubble">Hey, ready for training?</div><div class="spm-bubble me">Yes, let’s go!</div></div><div class="spm-chat-input"><input placeholder="Type message"><button>Send</button></div></div>';
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
      document.getElementById('spmSignOutBtn').addEventListener('click', function () {
        ['token','user','session','sb-auth-token','supabase.auth.token'].forEach(function(k){ localStorage.removeItem(k); });
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
        drawerSignOut.addEventListener('click', function () {
          ['token','user','session','sb-auth-token','supabase.auth.token'].forEach(function(k){ localStorage.removeItem(k); });
          window.location.href = '/mobile.html';
        });
      }
    }
  }

  async function init() {
    bindNav();
    window.setTimeout(async function () {
      try {
        const result = await window.SpopeerAPI.me();
        app.user = unwrapUser(result);
        $('#spmSplash').classList.add('spm-hidden');
        $('#spmShell').classList.remove('spm-hidden');
        render();
      } catch (_error) {
        $('#spmSplash').classList.add('spm-hidden');
        $('#spmAuth').classList.remove('spm-hidden');
      }
    }, 2900);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
