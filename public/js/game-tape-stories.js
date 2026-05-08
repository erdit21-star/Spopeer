// ============================================================
// SPOPEER GAME TAPE STORIES
// Frontend-only prototype for feed.html
// Later can connect to /api/reels, /api/posts, or /api/stories
// ============================================================

(function () {
  'use strict';

  const sportIcons = {
    running: '🏃',
    weightlifting: '🏋️',
    basketball: '🏀',
    cycling: '🚴',
    swimming: '🏊',
    football: '⚽',
    soccer: '⚽',
    tennis: '🎾',
    boxing: '🥊',
    volleyball: '🏐',
    golf: '⛳',
    default: '🏅'
  };

  const demoStories = [
    {
      id: 'demo-1',
      userName: 'Alex Navarro',
      userInitials: 'AN',
      sport: 'Running',
      mediaType: 'image',
      mediaUrl: 'https://placehold.co/400x600/001f3f/ffffff?text=Morning+Run',
      createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
      isLive: false,
      isViewedByCurrentUser: false,
      isLikedByCurrentUser: false,
      caption: 'Negative split today. Felt strong on the second half.',
      metrics: {
        primary: { value: '4:32', unit: 'min/km', label: 'Avg pace' },
        secondary: { value: '168', unit: 'bpm', label: 'Heart rate' },
        tertiary: { value: '342', unit: 'kcal', label: 'Calories' }
      },
      comparison: { value: '-0:12', trend: 'up', label: 'vs last run' },
      graphData: [28, 35, 42, 32, 28],
      likesCount: 23,
      commentsCount: 5
    },
    {
      id: 'demo-2',
      userName: 'Michael Chen',
      userInitials: 'MC',
      sport: 'Weightlifting',
      mediaType: 'image',
      mediaUrl: 'https://placehold.co/400x600/1a6bff/ffffff?text=Squat+PR',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      isLive: false,
      isViewedByCurrentUser: false,
      isLikedByCurrentUser: false,
      caption: 'Finally hit 185kg on squat. Next target: 200kg.',
      metrics: {
        primary: { value: '185', unit: 'kg', label: 'New 1RM' },
        secondary: { value: '+12', unit: 'kg', label: 'Month gain' },
        tertiary: { value: '5×5', unit: '', label: 'Working set' }
      },
      comparison: { value: '+12kg', trend: 'up', label: 'vs last month' },
      graphData: [20, 28, 35, 42, 48],
      likesCount: 47,
      commentsCount: 12
    },
    {
      id: 'demo-3',
      userName: 'Sarah Rodriguez',
      userInitials: 'SR',
      sport: 'Basketball',
      mediaType: 'image',
      mediaUrl: 'https://placehold.co/400x600/003d7a/ffffff?text=Game+Highlights',
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      isLive: true,
      isViewedByCurrentUser: false,
      isLikedByCurrentUser: false,
      caption: 'Last quarter push. Coach drew up a play for me.',
      metrics: {
        primary: { value: '28', unit: 'PTS', label: 'Career high' },
        secondary: { value: '8', unit: 'REB', label: 'Rebounds' },
        tertiary: { value: '6', unit: 'AST', label: 'Assists' }
      },
      comparison: { value: '+12pts', trend: 'up', label: 'vs average' },
      graphData: [12, 28, 44, 38],
      likesCount: 89,
      commentsCount: 24
    },
    {
      id: 'demo-4',
      userName: 'Elena Vargas',
      userInitials: 'EV',
      sport: 'Cycling',
      mediaType: 'image',
      mediaUrl: 'https://placehold.co/400x600/16a34a/ffffff?text=Hill+Climb',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      isLive: false,
      isViewedByCurrentUser: false,
      isLikedByCurrentUser: false,
      caption: 'Hill climb session. Legs are burning.',
      metrics: {
        primary: { value: '285', unit: 'w', label: 'Avg power' },
        secondary: { value: '342', unit: 'm', label: 'Elevation' },
        tertiary: { value: '28', unit: 'km/h', label: 'Avg speed' }
      },
      comparison: { value: '+15w', trend: 'up', label: 'vs climb' },
      graphData: [22, 30, 38, 42, 35, 28],
      likesCount: 34,
      commentsCount: 7
    }
  ];

  let stories = [];
  let currentIndex = 0;
  let progressTimer = null;
  let progress = 0;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getSportIcon(sport) {
    return sportIcons[String(sport || '').toLowerCase()] || sportIcons.default;
  }

  function formatTimeAgo(dateString) {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.max(0, Math.floor(diff / 60000));
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function getFirstName(name) {
    return String(name || 'User').split(' ')[0];
  }

  function normalizeStory(story) {
    const author = story.author || {};
    const firstName = author.firstName || '';
    const lastName  = author.lastName  || '';
    const fullName  = story.userName || story.name ||
                      [firstName, lastName].filter(Boolean).join(' ') || 'User';
    const initials  = story.userInitials || story.avatarInitials ||
                      (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
    return {
      id: story.id,
      userName: fullName,
      userInitials: initials,
      sport: story.sport || author.sport || 'Sport',
      mediaType: story.mediaType || story.type || 'image',
      mediaUrl: story.mediaUrl || story.thumbnailUrl || '',
      thumbnailUrl: story.thumbnailUrl || story.mediaUrl || '',
      createdAt: story.createdAt || story.timestamp || new Date().toISOString(),
      isLive: !!story.isLive,
      isViewedByCurrentUser: !!(story.isViewedByCurrentUser || story.viewed),
      isLikedByCurrentUser: !!(story.isLikedByCurrentUser || story.liked),
      caption: story.caption || '',
      metrics: story.metrics || { primary: { value: '—', unit: '', label: 'Performance' } },
      comparison: story.comparison || story.compareData || { value: '', trend: 'same', label: '' },
      graphData: story.graphData || story.paceGraph || [20, 34, 28, 42],
      likesCount: Number(story.likesCount ?? story.likes ?? 0),
      commentsCount: Number(story.commentsCount ?? story.comments ?? 0)
    };
  }

  function updateBadge() {
    const badge = document.getElementById('gameTapeNewBadge');
    if (!badge) return;
    const unseen = stories.filter((story) => !story.isViewedByCurrentUser).length;
    badge.textContent = `${unseen} new`;
    badge.style.display = unseen > 0 ? 'inline-flex' : 'none';
  }

  function renderStrip() {
    const strip = document.getElementById('gameTapeStrip');
    if (!strip) return;

    let html = `
      <div class="game-story-card add-story" data-story-id="add">
        <div class="game-media-preview">
          <div class="add-story-content">
            <div class="plus-icon">+</div>
            <div class="add-text">Add story</div>
          </div>
        </div>
        <div class="game-story-label">Your story</div>
      </div>
    `;

    stories.forEach((story, index) => {
      const primary = story.metrics.primary || { value: '—', unit: '', label: 'Performance' };
      const mediaUrl = escapeHtml(story.thumbnailUrl || story.mediaUrl);
      const caption = escapeHtml(story.caption);
      const viewedClass = story.isViewedByCurrentUser ? 'viewed' : '';

      html += `
        <div class="game-story-card ${viewedClass}" data-story-index="${index}">
          <div class="game-media-preview" style="background-image:url('${mediaUrl}')">
            <div class="game-user-overlay">
              <div class="game-avatar-sm">${escapeHtml(story.userInitials)}</div>
              <div class="game-name-sm">${escapeHtml(getFirstName(story.userName))}</div>
            </div>
            ${story.isLive ? '<div class="game-live-badge">LIVE</div>' : ''}
            <div class="game-metric-overlay">
              <div class="game-metric-primary">
                ${escapeHtml(primary.value)} <span>${escapeHtml(primary.unit)}</span>
              </div>
              <div class="game-metric-label">${escapeHtml(primary.label)}</div>
              <div class="game-metric-secondary">
                <span>${getSportIcon(story.sport)} ${escapeHtml(story.sport)}</span>
                <span>${story.likesCount} ❤️</span>
              </div>
            </div>
          </div>
          <div class="game-story-label">${caption.length > 25 ? caption.slice(0, 25) + '...' : caption}</div>
        </div>
      `;
    });

    strip.innerHTML = html;

    const addCard = strip.querySelector('[data-story-id="add"]');
    if (addCard) addCard.addEventListener('click', openStoryComposerPlaceholder);

    strip.querySelectorAll('[data-story-index]').forEach((card) => {
      card.addEventListener('click', function () {
        const index = Number(this.getAttribute('data-story-index'));
        openViewer(index);
      });
    });

    updateBadge();
  }

  function openStoryComposerPlaceholder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async function () {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return;

      try {
        if (window.showToast) window.showToast('Uploading your story...', 'info');
        await createStory(file, 'General', '', false, '');
        if (window.showToast) window.showToast('Story posted!', 'success');
        if (typeof loadStories === 'function') await loadStories();
      } catch (err) {
        if (window.showToast) window.showToast(err.message || 'Could not post story.', 'error');
        else alert(err.message || 'Could not post story.');
      }
    });

    input.click();
  }

  async function createStory(mediaFile, sport, caption, isLive, metricValue) {
    const formData = new FormData();
    formData.append('media', mediaFile);
    formData.append('sport', sport || 'General');
    formData.append('caption', caption || '');
    formData.append('isLive', String(!!isLive));
    formData.append('metrics', JSON.stringify({
      primary: { value: metricValue || '', unit: '', label: 'Performance' }
    }));

    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.createStory === 'function') {
        return await window.SpopeerAPI.createStory(formData);
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const json = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        throw new Error((json.error && json.error.message) || 'Failed to create story.');
      }

      return json;
    } catch (err) {
      if (err && err.message) {
        throw err;
      }
      throw new Error(err || 'Failed to create story.');
    }
  }

  function openViewer(index) {
    const story = stories[index];
    if (!story) return;

    currentIndex = index;
    story.isViewedByCurrentUser = true;
    renderStrip();

    // Register view in backend (non-blocking, best-effort)
    if (story.id && !String(story.id).startsWith('demo-')) {
      fetch('/api/stories/' + encodeURIComponent(story.id) + '/view', {
        method: 'POST',
        credentials: 'include'
      }).catch(function () {});
    }

    const viewer = document.getElementById('gameStoryViewer');
    const avatar = document.getElementById('viewerAvatar');
    const name = document.getElementById('viewerName');
    const meta = document.getElementById('viewerMeta');
    const media = document.getElementById('viewerMedia');

    if (!viewer || !avatar || !name || !meta || !media) return;

    avatar.textContent = story.userInitials;
    name.textContent = story.userName;
    meta.textContent = `${getSportIcon(story.sport)} ${story.sport} · ${formatTimeAgo(story.createdAt)}`;

    if (story.mediaType === 'video') {
      media.innerHTML = `<video controls autoplay playsinline><source src="${escapeHtml(story.mediaUrl)}" type="video/mp4"></video>`;
    } else {
      media.innerHTML = `<img src="${escapeHtml(story.mediaUrl)}" alt="Story media">`;
    }

    renderViewerStats(story);
    viewer.classList.add('active');
    document.body.style.overflow = 'hidden';
    startProgress();
  }

  function renderViewerStats(story) {
    const stats = document.getElementById('viewerStats');
    if (!stats) return;

    const primary = story.metrics.primary || { value: '—', unit: '', label: 'Performance' };
    const secondary = story.metrics.secondary || { value: '—', unit: '', label: 'Metric' };
    const tertiary = story.metrics.tertiary || { value: '—', unit: '', label: 'Metric' };
    const trendClass = story.comparison.trend === 'down' ? 'down' : 'up';
    const trendSymbol = story.comparison.trend === 'down' ? '▼' : '▲';

    stats.innerHTML = `
      <div class="game-stats-grid">
        <div class="game-stat-card">
          <div class="game-stat-value">${escapeHtml(primary.value)}</div>
          <div class="game-stat-label">${escapeHtml(primary.label)}</div>
          <div class="game-stat-compare ${trendClass}">${trendSymbol} ${escapeHtml(story.comparison.value || '')}</div>
        </div>
        <div class="game-stat-card">
          <div class="game-stat-value">${escapeHtml(secondary.value)}</div>
          <div class="game-stat-label">${escapeHtml(secondary.label)}</div>
        </div>
        <div class="game-stat-card">
          <div class="game-stat-value">${escapeHtml(tertiary.value)}</div>
          <div class="game-stat-label">${escapeHtml(tertiary.label)}</div>
        </div>
      </div>

      <div class="game-mini-graph">
        <div class="game-graph-title">Performance trend</div>
        <div class="game-graph-bars">
          ${story.graphData.map((height) => `<div class="game-graph-bar" style="height:${Math.min(Number(height) || 8, 48)}px"></div>`).join('')}
        </div>
        <div class="game-graph-labels">
          ${story.graphData.map((_, i) => `<span class="game-graph-label">${i + 1}</span>`).join('')}
        </div>
      </div>

      <div class="game-viewer-caption">${escapeHtml(story.caption)}</div>

      <div class="game-viewer-engagement">
        <span class="game-engagement-item" id="viewerLikeText">❤️ ${story.likesCount} likes</span>
        <span class="game-engagement-item" id="viewerReplyText">💬 ${story.commentsCount} replies</span>
      </div>

      <div class="game-viewer-actions">
        <button class="game-action-btn like ${story.isLikedByCurrentUser ? 'liked' : ''}" id="viewerLikeActionBtn">
          ${story.isLikedByCurrentUser ? '❤️ Liked' : '❤️ Like'}
        </button>
        <button class="game-action-btn reply" id="viewerReplyBtn">💬 Reply</button>
        <button class="game-action-btn compare" id="viewerCompareBtn">📊 Compare</button>
      </div>
    `;

    const likeBtn = document.getElementById('viewerLikeActionBtn');
    const replyBtn = document.getElementById('viewerReplyBtn');
    const replyText = document.getElementById('viewerReplyText');
    const compareBtn = document.getElementById('viewerCompareBtn');

    if (likeBtn) likeBtn.addEventListener('click', () => toggleLike(story));
    if (replyBtn) replyBtn.addEventListener('click', toggleReplyComposer);
    if (replyText) replyText.addEventListener('click', toggleReplyComposer);
    if (compareBtn) compareBtn.addEventListener('click', () => {
      if (window.showToast) window.showToast('Compare mode will be connected later.', 'info');
      else alert('Compare mode will be connected later.');
    });
  }

  async function toggleLike(story) {
    if (!story) return;

    const previousLiked = story.isLikedByCurrentUser;
    const previousCount = story.likesCount;

    story.isLikedByCurrentUser = !previousLiked;
    story.likesCount = Math.max(0, previousCount + (story.isLikedByCurrentUser ? 1 : -1));
    renderViewerStats(story);
    renderStrip();

    if (String(story.id).startsWith('demo-')) return;

    try {
      const res = await fetch('/api/stories/' + encodeURIComponent(story.id) + '/like', {
        method: 'POST',
        credentials: 'include'
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error((json.error && json.error.message) || 'Could not like story.');
      }

      if (json.data && typeof json.data.likesCount === 'number') {
        story.likesCount = json.data.likesCount;
      }

      if (json.data && typeof json.data.liked === 'boolean') {
        story.isLikedByCurrentUser = json.data.liked;
      }

      renderViewerStats(story);
      renderStrip();
    } catch (err) {
      story.isLikedByCurrentUser = previousLiked;
      story.likesCount = previousCount;
      renderViewerStats(story);
      renderStrip();
      if (window.showToast) window.showToast(err.message || 'Could not like story.', 'error');
    }
  }

  function toggleReplyComposer() {
    const composer = document.getElementById('replyComposer');
    const input = document.getElementById('replyInput');
    if (!composer) return;
    composer.classList.toggle('active');
    if (composer.classList.contains('active') && input) input.focus();
  }

  function sendReply() {
    const input = document.getElementById('replyInput');
    const composer = document.getElementById('replyComposer');
    const story = stories[currentIndex];
    if (!input || !story) return;

    const reply = input.value.trim();
    if (!reply) return;

    story.commentsCount += 1;
    input.value = '';
    if (composer) composer.classList.remove('active');
    renderViewerStats(story);
    renderStrip();

    if (window.showToast) window.showToast('Reply saved locally for this prototype.', 'success');
  }

  function closeViewer() {
    const viewer = document.getElementById('gameStoryViewer');
    if (viewer) viewer.classList.remove('active');
    document.body.style.overflow = '';
    stopProgress();

    const video = document.querySelector('#viewerMedia video');
    if (video) video.pause();
  }

  function startProgress() {
    stopProgress();
    progress = 0;
    const fill = document.getElementById('viewerProgress');
    if (fill) fill.style.width = '0%';

    progressTimer = setInterval(function () {
      progress += 1.6;
      if (fill) fill.style.width = `${progress}%`;
      if (progress >= 100) nextStory();
    }, 80);
  }

  function stopProgress() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
  }

  function resetProgress() {
    startProgress();
  }

  function nextStory() {
    if (currentIndex + 1 < stories.length) {
      openViewer(currentIndex + 1);
      resetProgress();
    } else {
      closeViewer();
    }
  }

  function prevStory() {
    if (currentIndex - 1 >= 0) {
      openViewer(currentIndex - 1);
      resetProgress();
    }
  }

  function wireControls() {
    const closeBtn = document.getElementById('closeViewerBtn');
    const prevBtn = document.getElementById('viewerPrevBtn');
    const nextBtn = document.getElementById('viewerNextBtn');
    const sendBtn = document.getElementById('replySendBtn');
    const replyInput = document.getElementById('replyInput');

    if (closeBtn) closeBtn.addEventListener('click', closeViewer);
    if (prevBtn) prevBtn.addEventListener('click', prevStory);
    if (nextBtn) nextBtn.addEventListener('click', nextStory);
    if (sendBtn) sendBtn.addEventListener('click', sendReply);
    if (replyInput) {
      replyInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') sendReply();
      });
    }

    document.addEventListener('keydown', function (event) {
      const viewer = document.getElementById('gameStoryViewer');
      const isOpen = viewer && viewer.classList.contains('active');
      if (!isOpen) return;

      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowRight') nextStory();
      if (event.key === 'ArrowLeft') prevStory();
    });
  }

  async function loadStories() {
    try {
      const res = await fetch('/api/stories', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json || !Array.isArray(json.data)) {
        throw new Error('Invalid stories response');
      }
      stories = json.data.map(normalizeStory);
      renderStrip();
    } catch (_err) {
      // Keep the feed usable if backend stories are unavailable.
      stories = demoStories.map(normalizeStory);
      renderStrip();
    }
  }

  window.GameTapeStories = {
    loadStories,
    createStory,
    renderStories: function (items) {
      stories = (items || []).map(normalizeStory);
      renderStrip();
    }
  };

  window.GameTapeStoriesManager = {
    createStory
  };

  document.addEventListener('DOMContentLoaded', function () {
    wireControls();
    loadStories();
  });
})();
