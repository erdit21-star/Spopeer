const API_BASE = '/api';
    const headers = { 'Content-Type': 'application/json' };

    let currentCategory = '';
    let currentThreadId = null;

    // ── Fetch threads ──
    async function loadThreads() {
      const search = document.getElementById('searchBox').value.trim();
      let url = `${API_BASE}/forums?limit=50`;
      if (currentCategory) url += `&category=${encodeURIComponent(currentCategory)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      try {
        const res = await fetch(url, { headers, credentials: 'include' });
        const data = await res.json();
        renderThreads(data.payload || []);
      } catch (e) {
        console.error('Load threads error:', e);
        document.getElementById('threadList').innerHTML = '<div class="empty-state"><i class="fa-solid fa-plug-circle-xmark"></i>Could not load threads. Is the server running?</div>';
      }
    }

    function renderThreads(threads) {
      const list = document.getElementById('threadList');
      if (!threads.length) {
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-comments"></i>No threads yet. Start a discussion!</div>';
        return;
      }
      list.innerHTML = threads.map(t => {
        const author = t.author || {};
        const initials = ((author.firstName || '?')[0] + (author.lastName || '?')[0]).toUpperCase();
        const timeAgo = formatTimeAgo(t.createdAt);
        return `
          <div class="thread-card ${t.isPinned ? 'pinned' : ''}" onclick="openThread(${t.id})">
            <div class="thread-top">
              <div class="thread-avatar">${initials}</div>
              <div class="thread-meta">
                <span><b>${author.firstName || ''} ${author.lastName || ''}</b></span>
                <span>${timeAgo}</span>
                <span class="thread-tag">${escapeHtml(t.category || 'General')}</span>
                ${t.sport ? `<span class="thread-tag">${escapeHtml(t.sport)}</span>` : ''}
                ${t.isPinned ? '<span><i class="fa-solid fa-thumbtack"></i> Pinned</span>' : ''}
              </div>
            </div>
            <div class="thread-title">${escapeHtml(t.title)}</div>
            <div class="thread-preview">${escapeHtml(t.body)}</div>
            <div class="thread-stats">
              <span><i class="fa-regular fa-message"></i> ${t.replyCount || 0} replies</span>
              <span><i class="fa-regular fa-eye"></i> ${t.viewCount || 0} views</span>
            </div>
          </div>`;
      }).join('');
    }

    // ── Open thread detail ──
    async function openThread(id) {
      currentThreadId = id;
      try {
        const res = await fetch(`${API_BASE}/forums/${id}`, { headers, credentials: 'include' });
        const data = await res.json();
        const t = data.payload;
        const author = t.author || {};
        const initials = ((author.firstName || '?')[0] + (author.lastName || '?')[0]).toUpperCase();

        document.getElementById('threadDetail').innerHTML = `
          <div class="author-row">
            <div class="thread-avatar">${initials}</div>
            <div>
              <b>${author.firstName || ''} ${author.lastName || ''}</b>
              <div style="font-size:12px;color:var(--muted)">${author.role || ''} · ${formatTimeAgo(t.createdAt)}</div>
            </div>
            ${t.sport ? `<span class="thread-tag" style="margin-left:auto">${escapeHtml(t.sport)}</span>` : ''}
            <span class="thread-tag">${escapeHtml(t.category || 'General')}</span>
          </div>
          <h2>${escapeHtml(t.title)}</h2>
          <div class="body-text">${escapeHtml(t.body)}</div>
        `;

        const replies = t.replies || [];
        document.getElementById('replyCount').textContent = `Replies (${replies.length})`;
        document.getElementById('repliesList').innerHTML = replies.map(r => {
          const ra = r.author || {};
          const ri = ((ra.firstName || '?')[0] + (ra.lastName || '?')[0]).toUpperCase();
          return `
            <div class="reply-card">
              <div class="reply-top">
                <div class="thread-avatar" style="width:28px;height:28px;font-size:11px">${ri}</div>
                <b style="font-size:13px">${ra.firstName || ''} ${ra.lastName || ''}</b>
                <span class="reply-time">${formatTimeAgo(r.createdAt)}</span>
              </div>
              <div class="reply-body">${escapeHtml(r.body)}</div>
            </div>`;
        }).join('') || '<div style="color:var(--muted);font-size:13px;padding:20px 0">No replies yet. Be the first!</div>';

        document.getElementById('listView').style.display = 'none';
        document.getElementById('detailView').classList.add('visible');
      } catch (e) {
        console.error('Open thread error:', e);
      }
    }

    function showList() {
      document.getElementById('detailView').classList.remove('visible');
      document.getElementById('listView').style.display = 'block';
      currentThreadId = null;
    }

    // ── Create thread ──
    async function createThread() {
      const title = document.getElementById('threadTitle').value.trim();
      const body = document.getElementById('threadBody').value.trim();
      const category = document.getElementById('threadCategory').value;
      const sport = document.getElementById('threadSport').value;

      if (!title || !body) return (window.SpopeerToast && window.SpopeerToast.warning('Title and body are required.'), undefined);
      if (!token) return (window.SpopeerToast && window.SpopeerToast.warning('Please log in first.'), undefined);

      try {
        const res = await fetch(`${API_BASE}/forums`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title, body, category, sport: sport || undefined })
        });
        const data = await res.json();
        if (!res.ok) return (window.SpopeerToast && window.SpopeerToast.error(data.error || 'Failed to create thread.'), undefined);

        hideCompose();
        loadThreads();
      } catch (e) {
        console.error('Create thread error:', e);
      }
    }

    // ── Post reply ──
    async function postReply() {
      const body = document.getElementById('replyBody').value.trim();
      if (!body) return (window.SpopeerToast && window.SpopeerToast.warning('Reply cannot be empty.'), undefined);
      if (!token) return (window.SpopeerToast && window.SpopeerToast.warning('Please log in first.'), undefined);

      try {
        const res = await fetch(`${API_BASE}/forums/${currentThreadId}/replies`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ body })
        });
        const data = await res.json();
        if (!res.ok) return (window.SpopeerToast && window.SpopeerToast.error(data.error || 'Failed to post reply.'), undefined);

        document.getElementById('replyBody').value = '';
        openThread(currentThreadId);
      } catch (e) {
        console.error('Post reply error:', e);
      }
    }

    // ── Compose toggle ──
    function showCompose() {
      document.getElementById('composeForm').style.display = 'block';
    }
    function hideCompose() {
      document.getElementById('composeForm').style.display = 'none';
      document.getElementById('threadTitle').value = '';
      document.getElementById('threadBody').value = '';
    }

    // ── Filter buttons ──
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat || '';
        loadThreads();
      });
    });

    document.getElementById('searchBox').addEventListener('input', debounce(loadThreads, 400));

    // ── Helpers ──
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function formatTimeAgo(dateStr) {
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

    function debounce(fn, ms) {
      let t;
      return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
    }

    // ── Init ──
    loadThreads();
