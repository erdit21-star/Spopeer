// Normalize a server-format post to the display format used by generatePostHTML
function normalizePost(p) {
  if (window.Spopeer && window.Spopeer.schema && typeof window.Spopeer.schema.normalizePostForFeed === 'function') {
    return window.Spopeer.schema.normalizePostForFeed(p);
  }
  return p;
}

// Initialize on page load with real backend data only
document.addEventListener('DOMContentLoaded', function() {
  if (!window.SpopeerFeedEngine) {
    loadAllPosts();
  }
});

async function loadAllPosts() {
  try {
    // Try to load from real API first (with 5-second timeout for cold starts)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const data = (window.Spopeer && window.Spopeer.api && typeof window.Spopeer.api.get === 'function')
      ? await window.Spopeer.api.get('/api/posts', { signal: controller.signal })
      : await window.SpopeerAPI.request('/api/posts', { signal: controller.signal });
    clearTimeout(timer);
    const rows = (window.Spopeer && window.Spopeer.schema && typeof window.Spopeer.schema.listFromResponse === 'function')
      ? window.Spopeer.schema.listFromResponse(data)
      : (Array.isArray(data) ? data : []);
    const posts = rows.map(normalizePost);
    if (posts.length > 0) {
      loadPostsFromArray(posts);
      return;
    }
  } catch (error) {
    console.warn('API post fetch failed:', error.message);
  }

  loadPostsFromArray([]);
}

function loadPostsFromArray(posts) {
  // Get the feed-col container
  const feedCol = document.querySelector('.feed-col');
  if (!feedCol) return;
  
  // Find the composer anchor element
  const createCard = document.getElementById('sp-inline-composer') || feedCol.querySelector('.game-tape-container');
  
  // Remove ALL existing post cards before re-rendering
  feedCol.querySelectorAll('.post-card').forEach(card => card.remove());

  if (!posts || posts.length === 0) {
    const emptyHTML = `
      <div class="feed-empty-state" data-empty-state="1">
        <div class="feed-empty-icon"><i class="fa-regular fa-compass"></i></div>
        <h3>Your feed is empty</h3>
        <p>Follow athletes, coaches, and clubs to see their posts here. Or be the first to share something with your network.</p>
        <div class="feed-empty-actions">
          <a href="/pages/search/search.html" class="feed-empty-btn-primary"><i class="fa-solid fa-magnifying-glass"></i> Discover people</a>
          <button class="feed-empty-btn-secondary" data-focus-composer><i class="fa-regular fa-pen-to-square"></i> Create a post</button>
        </div>
      </div>`;
    if (createCard) {
      createCard.insertAdjacentHTML('afterend', emptyHTML);
      // Wire the compose button
      const composeBtn = createCard.nextElementSibling && createCard.nextElementSibling.querySelector('[data-focus-composer]');
      if (composeBtn) {
        composeBtn.addEventListener('click', function() {
          const ta = document.querySelector('.composer-textarea');
          if (ta) { ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); ta.focus(); }
        });
      }
    }
    return;
  }
  
  // Render posts from backend payload (keep array order: newest first)
  let insertRef = createCard; // track the last inserted element
  posts.forEach((post, index) => {
    const postHTML = generatePostHTML(post);
    if (insertRef) {
      insertRef.insertAdjacentHTML('afterend', postHTML);
      // Move reference to the just-inserted card so next card goes after it
      insertRef = insertRef.nextElementSibling;
    }
  });
  
  // Re-attach event listeners to like buttons
  attachLikeListeners();
  attachPollVoteListeners();
  attachPostMenuListeners();
  attachCommentListeners();
  attachRepostListeners();

  // Re-apply current feed filter to newly loaded posts
  if (typeof applyFeedFilter === 'function') {
    try { applyFeedFilter(); } catch(e) { /* filter not ready yet */ }
  }
}

function attachPostMenuListeners() {
  const feedCol = document.querySelector('.feed-col');
  if (!feedCol || feedCol.dataset.postMenuBound === '1') return;
  feedCol.dataset.postMenuBound = '1';

  feedCol.addEventListener('click', async function(e) {
    const menuBtn = e.target.closest('.post-menu-btn');
    if (!menuBtn) return;
    e.preventDefault();

    const postCard = menuBtn.closest('.post-card');
    const postId = Number(postCard?.getAttribute('data-post-id'));
    if (!Number.isFinite(postId)) return;

    const actionRaw = window.prompt('Post action: type "edit" or "delete"');
    const action = String(actionRaw || '').trim().toLowerCase();
    if (!action) return;

    try {
      if (action === 'edit') {
        // Try to get current content from the DOM
        const contentEl = postCard.querySelector('.post-text') || postCard.querySelector('.post-content');
        const currentContent = contentEl ? contentEl.textContent.trim() : '';
        const nextContent = window.prompt('Edit post content:', currentContent);
        if (nextContent === null) return;

        // Try real API first
        if (window.Spopeer && window.Spopeer.api && typeof window.Spopeer.api.put === 'function') {
          await window.Spopeer.api.put(`/api/posts/${postId}`, { content: String(nextContent).trim() });
        } else {
          await window.SpopeerAPI.request(`/api/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ content: String(nextContent).trim() }) });
        }
        await loadAllPosts();
      } else if (action === 'delete') {
        const confirmed = window.confirm('Delete this post?');
        if (!confirmed) return;

        if (window.Spopeer && window.Spopeer.api && typeof window.Spopeer.api.delete === 'function') {
          await window.Spopeer.api.delete(`/api/posts/${postId}`);
        } else {
          await window.SpopeerAPI.request(`/api/posts/${postId}`, { method: 'DELETE' });
        }
        await loadAllPosts();
      }
    } catch (error) {
      console.error('Post menu action failed:', error);
      if (window.SpopeerToast) window.SpopeerToast.error(error.message || 'Post action failed.');
    }
  });
}

function attachPollVoteListeners() {
  const feedCol = document.querySelector('.feed-col');
  if (!feedCol || feedCol.dataset.pollBound === '1') return;
  feedCol.dataset.pollBound = '1';

  feedCol.addEventListener('click', async function(e) {
    const voteBtn = e.target.closest('.poll-vote-btn');
    if (!voteBtn) return;
    e.preventDefault();

    const postId = Number(voteBtn.getAttribute('data-post-id'));
    const optionIndex = Number(voteBtn.getAttribute('data-option-index'));
    if (!Number.isFinite(postId) || !Number.isFinite(optionIndex)) return;

    try {
      // Try real API
      try {
        if (window.Spopeer && window.Spopeer.api && typeof window.Spopeer.api.post === 'function') {
          await window.Spopeer.api.post('/api/posts/' + postId + '/vote', { optionIndex });
        } else {
          await window.SpopeerAPI.request('/api/posts/' + postId + '/vote', {
            method: 'POST',
            body: JSON.stringify({ optionIndex })
          });
        }
        await loadAllPosts();
        return;
      } catch (apiErr) { /* fallback below */ }
    } catch (error) {
      console.error('Error voting in poll:', error);
    }
  });
}

function attachLikeListeners() {
  document.querySelectorAll('.like-btn').forEach((btn) => {
    if (btn.dataset.likeBound === '1') return;
    btn.dataset.likeBound = '1';
    // New cards already use inline like handlers; avoid double-toggling likes.
    if (btn.hasAttribute('data-like-button')) return;
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      const postCard = this.closest('.post-card');
      const postId = parseInt(postCard?.getAttribute('data-post-id'));
      
      if (postId) {
        const wasLiked = this.classList.contains('liked');
        try {
          const apiResRaw = (window.Spopeer && window.Spopeer.api && typeof window.Spopeer.api.post === 'function')
            ? await window.Spopeer.api.post('/api/posts/' + postId + '/like')
            : await window.SpopeerAPI.request('/api/posts/' + postId + '/like', { method: 'POST' });
          const apiRes = (apiResRaw && apiResRaw.data) || apiResRaw || {};
          const nowLiked = (typeof apiRes.liked === 'boolean') ? apiRes.liked : !wasLiked;
          const safeLikes = Number.isFinite(apiRes.likesCount)
            ? apiRes.likesCount
            : (nowLiked ? 1 : 0);

          this.classList.toggle('liked', nowLiked);
          this.innerHTML = nowLiked
            ? '<i class="fa-solid fa-heart"></i> Liked'
            : '<i class="fa-regular fa-heart"></i> Like';

          const likeStatsSpan = postCard.querySelector('.post-stats span:nth-child(2)');
          if (likeStatsSpan) {
            likeStatsSpan.innerHTML = `<i class="fa-regular fa-heart"></i> ${safeLikes} likes`;
          }
        } catch (error) {
          console.error('Error toggling like:', error);
          this.classList.toggle('liked', wasLiked);
          this.innerHTML = wasLiked
            ? '<i class="fa-solid fa-heart"></i> Liked'
            : '<i class="fa-regular fa-heart"></i> Like';
        }
      }
    });
  });
}

function attachCommentListeners() {
  const feedCol = document.querySelector('.feed-col');
  if (!feedCol || feedCol.dataset.commentBound === '1') return;
  feedCol.dataset.commentBound = '1';

  const COMMENTS_KEY = 'spopeer_comments';

  function getComments() {
    try { return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]'); } catch { return []; }
  }
  function saveComments(c) { localStorage.setItem(COMMENTS_KEY, JSON.stringify(c)); }

  function getInitials(name) {
    return (name || '').split(' ').map(function(w) { return (w[0] || ''); }).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function formatTime(iso) {
    var d = new Date(iso), diff = Date.now() - d.getTime(), m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  async function renderComments(section, postId) {
    var list = section.querySelector('.comment-list');
    if (!list) return;

    var all = [];
    try {
      var apiResult = await window.SpopeerAPI.getPostComments(postId);
      all = Array.isArray(apiResult)
        ? apiResult
        : (Array.isArray(apiResult?.data) ? apiResult.data : []);
      all = all.map(function(c) {
        var authorName = c.author
          ? [c.author.firstName, c.author.lastName].filter(Boolean).join(' ').trim()
          : (c.authorName || 'User');
        return {
          text: c.content || c.text || '',
          authorName: authorName || 'User',
          timestamp: c.createdAt || c.timestamp || new Date().toISOString()
        };
      });
    } catch (_apiErr) {
      all = getComments().filter(function(c) { return String(c.postId) === String(postId); });
    }

    list.innerHTML = '';
    all.forEach(function(c) {
      var bubble = document.createElement('div');
      bubble.className = 'comment-bubble';
      bubble.innerHTML = '<div class="comment-av">' + getInitials(c.authorName) + '</div>' +
        '<div class="comment-body"><div class="comment-author">' + escapeHtml(c.authorName) + '</div>' +
        '<div class="comment-text">' + escapeHtml(c.text) + '</div>' +
        '<div class="comment-time">' + formatTime(c.timestamp) + '</div></div>';
      list.appendChild(bubble);
    });
    list.scrollTop = list.scrollHeight;

    var card = section.closest('.post-card');
    if (card) {
      var statSpans = card.querySelectorAll('.post-stats span');
      statSpans.forEach(function(sp) {
        if (sp.textContent.indexOf('comments') !== -1) {
          sp.innerHTML = '<i class="fa-regular fa-message"></i> ' + all.length + ' comments';
        }
      });
    }
  }

  feedCol.addEventListener('click', function(e) {
    // Toggle comment section
    var commentBtn = e.target.closest('.comment-btn');
    if (commentBtn) {
      var card = commentBtn.closest('.post-card');
      if (!card) return;
      var section = card.querySelector('.comment-section');
      if (!section) return;
      section.classList.toggle('open');
      if (section.classList.contains('open')) {
        var postId = card.getAttribute('data-post-id');
        if (postId) renderComments(section, postId);
        var input = section.querySelector('.comment-input');
        if (input) input.focus();
      }
      return;
    }

    // Submit comment
    var submitBtn = e.target.closest('.comment-submit-btn');
    if (submitBtn) {
      var section = submitBtn.closest('.comment-section');
      var card = submitBtn.closest('.post-card');
      var input = section ? section.querySelector('.comment-input') : null;
      if (!section || !card || !input) return;
      var text = input.value.trim();
      if (!text) return;
      var postId = card.getAttribute('data-post-id');
      if (!postId) return;
      var currentUser = getCurrentUserData();

      // Try real API first
      (async function() {
        try {
          await window.SpopeerAPI.request('/api/posts/' + postId + '/comment', {
            method: 'POST',
            body: JSON.stringify({ content: text })
          });
          input.value = '';
          renderComments(section, postId);
          return;
        } catch (apiErr) {
          // API unavailable, save locally only.
        }

        // Always save to local storage for immediate rendering
        var comment = {
          id: Date.now().toString(),
          postId: postId,
          authorEmail: currentUser.email || currentUser.userEmail || '',
          authorName: currentUser.displayName || ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim() || currentUser.email || 'User',
          text: text,
          timestamp: new Date().toISOString()
        };
        var all = getComments();
        all.push(comment);
        saveComments(all);
        input.value = '';
        renderComments(section, postId);

      })();
    }
  });

  // Also handle Enter key in comment inputs
  feedCol.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
      e.preventDefault();
      var submitBtn = e.target.closest('.comment-input-row')?.querySelector('.comment-submit-btn');
      if (submitBtn) submitBtn.click();
    }
  });
}

function attachRepostListeners() {
  var feedCol = document.querySelector('.feed-col');
  if (!feedCol || feedCol.dataset.repostBound === '1') return;
  feedCol.dataset.repostBound = '1';

  feedCol.addEventListener('click', async function(e) {
    var repostBtn = e.target.closest('.repost-btn');
    if (!repostBtn) return;
    e.preventDefault();

    var card = repostBtn.closest('.post-card');
    var postId = card ? card.getAttribute('data-post-id') : null;
    if (!postId) return;

    // Prevent double repost
    if (repostBtn.classList.contains('reposted')) return;

    try {
      // Try real API first
      var isLoggedIn = localStorage.getItem('spopeer_loggedIn') === 'true';
      if (isLoggedIn) {
        var res = await fetch('/api/posts/' + postId + '/repost', {
          method: 'POST',
          credentials: 'include'
        });
        if (res.ok) {
          repostBtn.classList.add('reposted');
          repostBtn.innerHTML = '<i class="fa-solid fa-retweet"></i> Reposted';
          var toast = document.getElementById('toast');
          if (toast) {
            toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> Reposted to your feed';
            toast.classList.add('visible');
            setTimeout(function() { toast.classList.remove('visible'); }, 2500);
          }
          return;
        }
      }

      throw new Error('Repost failed');
    } catch (err) {
      console.error('Repost failed:', err);
    }
  });
}

function generatePostHTML(post) {
  const roleMap = {
    athlete: { cls: 'av-orange', tag: 'Athlete', tagCls: '' },
    coach: { cls: 'av-blue', tag: 'Coach', tagCls: 'blue' },
    club: { cls: 'av-green', tag: 'Club', tagCls: '' },
    supportive_professional: { cls: 'av-purple', tag: 'Pro', tagCls: 'blue' }
  };
  
  const role = roleMap[post.authorType] || roleMap.athlete;
  const timeAgo = formatTimeAgo(new Date(post.timestamp));
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  let imageUrl = post.image || mediaItems.find((m) => m.type === 'image')?.url || null;
  let videoUrl = mediaItems.find((m) => m.type === 'video')?.url || null;
  if (!videoUrl && imageUrl && (post.type === 'video' || /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(String(imageUrl)))) {
    videoUrl = imageUrl;
    imageUrl = null;
  }

  let mediaHTML = '';
  if (post.type === 'event') {
    mediaHTML = renderEventCardHtml(post.content || post.text || '');
  } else if (imageUrl) {
    mediaHTML += `<div class="post-media"><img src="${imageUrl}" style="width:100%;border-radius:8px;"></div>`;
    if (videoUrl) mediaHTML += `<div class="post-media"><video controls style="width:100%;border-radius:8px;"><source src="${videoUrl}"></video></div>`;
  } else if (videoUrl) {
    mediaHTML += `<div class="post-media"><video controls style="width:100%;border-radius:8px;"><source src="${videoUrl}"></video></div>`;
  }
  // Only show media section when there is actual media content

  const currentUser = getCurrentUserData();
  const currentEmail = currentUser.email || currentUser.userEmail || '';
  const hasPoll = !!(post.poll && Array.isArray(post.poll.options) && post.poll.options.length > 0);
  let pollHTML = '';
  if (hasPoll) {
    const pollOptions = post.poll.options.map((opt) => {
      if (typeof opt === 'string') {
        return { text: opt, votes: 0 };
      }
      return { text: opt.text || '', votes: Number(opt.votes || 0) };
    });
    const totalVotes = pollOptions.reduce((sum, opt) => sum + Number(opt.votes || 0), 0);
    const votedIndex = Number(post.poll?.votesBy?.[currentEmail]);

    pollHTML = `
      <div class="post-poll" style="margin: 12px 0; padding: 12px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border);">
        <div style="font-weight:600;margin-bottom:8px;">${escapeHtml(post.poll.question || 'Poll')}</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${pollOptions.map((opt, idx) => {
            const votes = Number(opt.votes || 0);
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const votedCls = idx === votedIndex ? 'background: var(--accent-light); border-color: var(--accent);' : '';
            return `<button class="poll-vote-btn" data-post-id="${post.id}" data-option-index="${idx}" style="text-align:left;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:#fff;cursor:pointer;${votedCls}">${escapeHtml(opt.text)} <span style="float:right;color:var(--muted)">${votes} (${pct}%)</span></button>`;
          }).join('')}
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px;">${totalVotes} vote${totalVotes === 1 ? '' : 's'}</div>
      </div>
    `;
  }

  const linkedContent = linkifyContent(post.content || '');
  const authorIdentifier = post.authorId || post.userId || post.authorEmail || post.userEmail || '';
  const authorProfileHref = authorIdentifier
    ? `/pages/profiles/public-profile.html?userId=${encodeURIComponent(authorIdentifier)}`
    : '';
  const profileAvatarUrl = post.authorAvatarUrl || '';
  const authorAvatarHtml = profileAvatarUrl
    ? `<img src="${escapeHtml(String(profileAvatarUrl))}" alt="${escapeHtml(post.authorName || 'User')} profile picture" loading="lazy">`
    : escapeHtml(post.authorAvatar || 'U');
  
  return `
    <div class="post-card" data-post-id="${post.id}" data-sport="${escapeHtml(post.sport || '')}">
      <div class="post-body">
        <div class="post-head">
          <div class="post-author">
            ${authorProfileHref
              ? `<a class="author-profile-link" href="${authorProfileHref}" aria-label="View ${escapeHtml(post.authorName || 'User')} profile">`
              : '<div class="author-profile-link">'}
              <div class="author-av ${role.cls}">${authorAvatarHtml}</div>
              <div class="author-info">
                <div class="author-name">${escapeHtml(post.authorName || 'Unknown user')}</div>
                <div class="author-meta">
                  <span class="role-tag ${role.tagCls}">${role.tag}</span>
                  @${escapeHtml((post.authorEmail || '').split('@')[0] || 'user')} � ${timeAgo}
                </div>
              </div>
            ${authorProfileHref ? '</a>' : '</div>'}
          </div>
          <button class="post-menu-btn"><i class="fa-solid fa-ellipsis"></i></button>
        </div>
        <p class="post-text">${linkedContent}</p>
        ${mediaHTML}
        ${pollHTML}
        <div class="post-stats">
          <span><i class="fa-regular fa-eye"></i> ${post.views || 0} views</span>
          <span><i class="fa-regular fa-heart"></i> ${post.likes || 0} likes</span>
          <span><i class="fa-regular fa-message"></i> ${post.comments || 0} comments</span>
        </div>
        <div class="post-actions">
          <button class="act-btn like-btn ${post.liked ? 'liked' : ''}">
            <i class="fa-${post.liked ? 'solid' : 'regular'} fa-heart"></i> ${post.liked ? 'Liked' : 'Like'}
          </button>
          <button class="act-btn comment-btn"><i class="fa-regular fa-message"></i> Comment</button>
          <button class="act-btn repost-btn"><i class="fa-solid fa-retweet"></i> Repost</button>
          <button class="act-btn share-post-btn"><i class="fa-regular fa-share-from-square"></i> Share</button>
        </div>
        <div class="comment-section">
          <div class="comment-list"></div>
          <div class="comment-input-row">
            <input type="text" placeholder="Write a comment..." class="comment-input" maxlength="500">
            <button class="comment-submit-btn">Post</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function linkifyContent(text) {
  return escapeHtml(text || '')
    .replace(/(^|\s)#([a-zA-Z0-9_]+)/g, '$1<a href="pages/search/search.html?q=%23$2" class="hashtag">#$2</a>')
    .replace(/(^|\s)@([a-zA-Z0-9_\.]+)/g, '$1<a href="pages/profiles/public-profile.html?userId=$2" class="mention">@$2</a>');
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const diffMins = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return (text || '').replace(/[&<>"']/g, m => map[m]);
}
