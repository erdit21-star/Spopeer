(async function () {
  const _ud = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('spopeerUser') || localStorage.getItem('user') || 'null');
  const _li = localStorage.getItem('spopeer_loggedIn') === 'true' || !!_ud;
  if (!_ud || !_li) { window.location.href = '../../pages/auth/login.html'; return; }

  /* ── IIFE-scope vars shared with renderPost ── */
  const roleMap = {
    athlete:  { cls: 'athlete', icon: 'fa-person-running',  label: 'Athlete' },
    coach:    { cls: 'coach',   icon: 'fa-bullseye',         label: 'Coach'   },
    club:     { cls: 'club',    icon: 'fa-shield-halved',    label: 'Club'    },
    'supportive_professional': { cls: 'pro', icon: 'fa-star', label: 'Pro'     },
  };
  let initials = (() => {
    const dn = _ud.displayName || [_ud.firstName, _ud.lastName].filter(Boolean).join(' ') || '';
    const fi = (dn.split(' ')[0] || '')[0] || '';
    const li = (dn.split(' ')[1] || '')[0] || '';
    return (fi + li).toUpperCase() || 'U';
  })();
  let r = roleMap[_ud.role || _ud.userType] || roleMap.athlete;

  /* ── Function to update header from profile data ── */
  function updateHeaderFromProfile(profile) {
    if (!profile) return;
    
    // Get name from displayName or firstName+lastName
    const fullName = profile.displayName
      || [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      || 'User';
    
    // Get initials
    const firstInitial = (fullName.split(' ')[0] || '')[0] || '';
    const lastInitial = (fullName.split(' ')[1] || '')[0] || '';
    initials = (firstInitial + lastInitial).toUpperCase() || 'U';
    const handle = '@' + (profile.email ? profile.email.split('@')[0] : profile.username || 'user');

    document.getElementById('headerAvatar').textContent = initials;
    document.getElementById('headerName').textContent = fullName;
    document.getElementById('headerHandle').textContent = handle;

    /* role badge */
    r = roleMap[profile.role || profile.userType] || roleMap.athlete;
    const rb = document.getElementById('roleBadge');
    rb.className = 'role-badge ' + r.cls;
    rb.innerHTML = `<i class="fa-solid ${r.icon}" style="font-size:9px"></i> ${r.label}`;

    if (profile.primarySport || profile.sport) {
      document.getElementById('sportBadge').innerHTML =
        `<i class="fa-solid fa-shoe-prints" style="font-size:9px"></i> ${profile.primarySport || profile.sport}`;
    }
  }

  /* ── Hydrate header from user data ── */
  updateHeaderFromProfile(_ud);

  /* ── Hydrate stats from user data ── */
  var sf = document.getElementById('statFollowers');
  var sfg = document.getElementById('statFollowing');
  var sv = document.getElementById('statViews');
  if(sf) sf.textContent = _ud.followersCount || _ud.followers || '0';
  if(sfg) sfg.textContent = _ud.followingCount || _ud.following || '0';
  if(sv) sv.textContent = _ud.totalViews || '0';

  /* ── PROFILE SYNC: Listen for currentUserChanged ── */
  window.addEventListener('currentUserChanged', (event) => {
    const u = event.detail;
    if (u) updateHeaderFromProfile(u);
  });

  /* edit profile links */
  const editUrl = 'edit-profile.html';
  document.getElementById('editProfileBtn').href = editUrl;
  document.getElementById('editLink').href = editUrl;

  /* View profile links — use stable user id */
  const stableUserId = window.SpopeerProfileIdentity
    ? window.SpopeerProfileIdentity.getStableId(_ud)
    : String(_ud.id || _ud.userId || _ud.email || _ud.userEmail || '');
  const viewProfileUrl = 'public-profile.html?userId=' + encodeURIComponent(stableUserId);
  const vpBtn = document.getElementById('viewProfileBtn');
  const vpLink = document.getElementById('viewPublicProfileLink');
  if (vpBtn) vpBtn.href = viewProfileUrl;
  if (vpLink) vpLink.href = viewProfileUrl;

  /* ── Posts data — fetch from API, fallback to empty ── */
  let posts = [];
  try {
    const hdrs = {};
    const uid = _ud.id || _ud.userId || '';
    if (uid) {
      const r = await fetch('/api/posts?authorId=' + encodeURIComponent(uid), { headers: hdrs, credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        posts = d.payload || d.posts || [];
      }
    }
  } catch (e) {
    console.log('Failed to fetch user posts:', e.message);
  }

  /* update stat counts */
  document.getElementById('statPosts').textContent = posts.length;
  document.getElementById('countAll').textContent = posts.length;
  document.getElementById('countMedia').textContent = posts.filter(p => !!(p.image || p.media)).length;
  document.getElementById('countText').textContent = posts.filter(p => !(p.image || p.media)).length;

  /* ── Time-ago helper ── */
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString();
  }

  /* ── Render a single post card ── */
  function renderPost(post) {
    const postText = post.content || post.text || '';
    const postTags = post.tags || [];
    const hasMedia = !!(post.image || post.media);
    const likes = post.likesCount ?? post.likes ?? 0;
    const comments = post.commentsCount ?? post.comments ?? 0;
    const reposts = post.repostsCount ?? post.shares ?? 0;
    const timestamp = post.timestamp || timeAgo(post.createdAt) || '';
    const authorName = post.author
      ? ((post.author.firstName || '') + ' ' + (post.author.lastName || '')).trim() || 'User'
      : (_ud.fullName || _ud.name || 'User');

    const tagsHtml = postTags.map(t => `<span class="tag">${typeof t === 'string' && t.startsWith('#') ? t : '#' + t}</span>`).join('');
    const div = document.createElement('div');
    div.className = 'post-card';
    div.id = 'post-' + post.id;
    div.dataset.type = hasMedia ? 'media' : 'text';
    div.innerHTML = `
      <div class="post-body">
        <div class="post-head">
          <div class="post-author">
            <div class="author-av">${initials}</div>
            <div class="author-info">
              <div class="author-name">${authorName}</div>
              <div class="author-meta">
                <span class="role-tag">${r.label}</span>
                @${(_ud.email || '').split('@')[0] || 'user'} · ${timestamp}
              </div>
            </div>
          </div>
          <div class="post-menu-wrap">
            <button class="post-menu-btn" data-post="${post.id}">
              <i class="fa-solid fa-ellipsis"></i>
            </button>
            <div class="post-dropdown" id="dropdown-${post.id}">
              <button class="post-dropdown-item"><i class="fa-regular fa-pen-to-square"></i> Edit post</button>
              <button class="post-dropdown-item"><i class="fa-regular fa-bookmark"></i> Save to library</button>
              <button class="post-dropdown-item"><i class="fa-regular fa-share-from-square"></i> Share</button>
              <button class="post-dropdown-item"><i class="fa-solid fa-chart-simple"></i> View analytics</button>
              <button class="post-dropdown-item danger"><i class="fa-regular fa-trash-can"></i> Delete post</button>
            </div>
          </div>
        </div>
        <p class="post-text">${postText}</p>
        ${postTags.length ? `<div class="post-tags">${tagsHtml}</div>` : ''}
        ${hasMedia ? (post.image ? `<div class="post-media"><img src="${post.image}" alt="Post media" style="width:100%;border-radius:8px"></div>` : '<div class="post-media"><i class="fa-regular fa-image"></i></div>') : ''}
        <div class="post-stats">
          <span><i class="fa-regular fa-heart"></i> ${likes} likes</span>
          <span><i class="fa-regular fa-message"></i> ${comments} comments</span>
          <span><i class="fa-solid fa-retweet"></i> ${reposts} reposts</span>
        </div>
        <div class="post-actions">
          <button class="act-btn like-btn" data-post-id="${post.id}" data-liked="${post.liked ? 'true' : 'false'}"><i class="fa-${post.liked ? 'solid' : 'regular'} fa-heart"></i> ${post.liked ? 'Liked' : 'Like'}</button>
          <button class="act-btn"><i class="fa-regular fa-message"></i> Comment</button>
          <button class="act-btn"><i class="fa-solid fa-retweet"></i> Repost</button>
          <button class="act-btn edit-btn"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
          <button class="act-btn del-btn" data-post-id="${post.id}"><i class="fa-regular fa-trash-can"></i> Delete</button>
        </div>
      </div>`;

    /* like toggle — calls API */
    div.querySelector('.like-btn').addEventListener('click', async function () {
      const btn = this;
      const pid = btn.dataset.postId;
      btn.disabled = true;
      try {
        const hdrs = {};
        const resp = await fetch('/api/posts/' + pid + '/like', { method: 'POST', headers: hdrs, credentials: 'include' });
        if (resp.ok) {
          const d = await resp.json();
          btn.dataset.liked = d.liked ? 'true' : 'false';
          btn.innerHTML = d.liked
            ? '<i class="fa-solid fa-heart"></i> Liked'
            : '<i class="fa-regular fa-heart"></i> Like';
          if (d.liked) btn.classList.add('liked'); else btn.classList.remove('liked');
        }
      } catch (e) {
        console.log('Like toggle failed:', e.message);
      }
      btn.disabled = false;
    });

    /* post menu dropdown */
    div.querySelector('.post-menu-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      const dd = document.getElementById('dropdown-' + post.id);
      document.querySelectorAll('.post-dropdown').forEach(d => { if (d !== dd) d.classList.remove('open'); });
      dd.classList.toggle('open');
    });

    /* delete — calls real API */
    async function deletePost(el) {
      if (!confirm('Delete this post?')) return;
      try {
        const hdrs = {};
        const resp = await fetch('/api/posts/' + post.id, { method: 'DELETE', headers: hdrs, credentials: 'include' });
        if (resp.ok) {
          posts = posts.filter(p => p.id !== post.id);
          div.remove();
          document.getElementById('statPosts').textContent = posts.length;
          document.getElementById('countAll').textContent = posts.length;
          document.getElementById('countMedia').textContent = posts.filter(p => !!(p.image || p.media)).length;
          document.getElementById('countText').textContent = posts.filter(p => !(p.image || p.media)).length;
          if (posts.length === 0) {
            document.getElementById('postsList').style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
          }
        } else {
          const d = await resp.json().catch(() => ({}));
          if (window.SpopeerToast) window.SpopeerToast.error(d.error || 'Failed to delete post.');
        }
      } catch (e) {
        console.log('Delete failed:', e.message);
      }
    }
    div.querySelector('.del-btn').addEventListener('click', function () { deletePost(this); });
    div.querySelectorAll('.post-dropdown-item.danger').forEach(btn => {
      btn.addEventListener('click', () => deletePost(btn));
    });

    return div;
  }

  /* ── Render posts list ── */
  function renderPosts(filter = 'all') {
    const list = document.getElementById('postsList');
    const empty = document.getElementById('emptyState');
    const filtered = filter === 'all' ? posts
      : filter === 'media' ? posts.filter(p => !!(p.image || p.media))
      : posts.filter(p => !(p.image || p.media));

    list.innerHTML = '';
    if (filtered.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
    } else {
      list.style.display = 'flex';
      empty.style.display = 'none';
      filtered.forEach(p => list.appendChild(renderPost(p)));
    }
  }

  renderPosts();

  /* ── Filter tabs ── */
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      renderPosts(this.dataset.filter);
    });
  });

  /* ── Sort toggle newest/oldest ── */
  let newestFirst = true;
  document.getElementById('sortBtn').addEventListener('click', function () {
    newestFirst = !newestFirst;
    posts.reverse();
    this.innerHTML = newestFirst
      ? '<i class="fa-solid fa-arrow-down-wide-short" style="font-size:11px"></i> Newest'
      : '<i class="fa-solid fa-arrow-up-wide-short" style="font-size:11px"></i> Oldest';
    renderPosts(document.querySelector('.filter-tab.active')?.dataset.filter || 'all');
  });

  /* ── Close dropdowns on outside click ── */
  document.addEventListener('click', () => {
    document.querySelectorAll('.post-dropdown').forEach(d => d.classList.remove('open'));
  });

  /* ══ STORIES SYSTEM ══ */
  const storiesData = [
    { id: 1, name: 'Alex', initials: 'AN', content: 'Just crushed my morning run! 🏃‍♂️💨', time: '2 hours ago', role: 'Athlete', sport: 'Running' },
    { id: 2, name: 'Sarah', initials: 'SR', content: 'New coaching session went amazing! 🎯', time: '4 hours ago', role: 'Coach', sport: 'Basketball' },
    { id: 3, name: 'Michael', initials: 'MC', content: 'Power lifting PR today! 💪🔥', time: '6 hours ago', role: 'Athlete', sport: 'Weightlifting' },
    { id: 4, name: 'Elena', initials: 'EL', content: 'Recovery day - stretching and mobility work', time: '8 hours ago', role: 'Athlete', sport: 'Fitness' },
  ];

  let currentStoryIndex = 0;
  let storyProgressInterval = null;

  function viewStory(index) {
    currentStoryIndex = index - 1;
    if (currentStoryIndex < 0 || currentStoryIndex >= storiesData.length) return;
    const story = storiesData[currentStoryIndex];
    const viewer = document.getElementById('storyViewer');
    document.getElementById('storyContent').style.background = `linear-gradient(135deg, ${['#667eea', '#764ba2', '#f093fb', '#4facfe'][currentStoryIndex % 4]} 0%, ${['#764ba2', '#f093fb', '#4facfe', '#fa709a'][currentStoryIndex % 4]} 100%)`;
    document.getElementById('storyAvatar').textContent = story.initials;
    document.getElementById('storyName').textContent = story.name;
    document.getElementById('storyTime').textContent = story.time;
    document.getElementById('storyText').textContent = story.content;
    viewer.classList.add('active');
    document.querySelector('.story-item') && document.querySelectorAll('.story-item')[index]?.querySelector('.story-ring')?.classList.add('viewed');
    startStoryProgress();
  }

  function closeStories() {
    document.getElementById('storyViewer').classList.remove('active');
    if (storyProgressInterval) clearInterval(storyProgressInterval);
  }

  function nextStory() {
    if (storyProgressInterval) clearInterval(storyProgressInterval);
    currentStoryIndex++;
    if (currentStoryIndex >= storiesData.length) closeStories();
    else viewStory(currentStoryIndex + 1);
  }

  function prevStory() {
    if (storyProgressInterval) clearInterval(storyProgressInterval);
    currentStoryIndex--;
    if (currentStoryIndex < 0) currentStoryIndex = 0;
    viewStory(currentStoryIndex + 1);
  }

  function startStoryProgress() {
    const progressBar = document.getElementById('storyProgress');
    let progress = 0;
    progressBar.style.width = '0%';
    if (storyProgressInterval) clearInterval(storyProgressInterval);
    storyProgressInterval = setInterval(() => {
      progress += 2;
      progressBar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(storyProgressInterval);
        setTimeout(nextStory, 300);
      }
    }, 50);
  }

  document.querySelectorAll('.story-item').forEach((item, index) => {
    if (index === 0) {
      item.addEventListener('click', () => { if (window.SpopeerToast) window.SpopeerToast.info('Add a new story (upload feature)'); });
    } else {
      item.addEventListener('click', () => viewStory(index));
    }
  });

  document.addEventListener('keydown', (e) => {
    const viewer = document.getElementById('storyViewer');
    if (viewer && viewer.classList.contains('active')) {
      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
      if (e.key === 'Escape') closeStories();
    }
  });

  /* ── PROFILE MENU: handled by shared-ui.js setupSocialFeedRuntime ── */

  /* search bar */
  document.getElementById('navSearchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = '../../pages/search/search.html?term=' + encodeURIComponent(e.target.value.trim());
    }
  });

})();
