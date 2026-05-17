const API_BASE = '/api';

    let selectedFile = null;

    // ── Drop zone ──
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('videoFile');
    const fileNameEl = document.getElementById('fileName');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });

    function handleFile(file) {
      if (!file.type.startsWith('video/')) return (window.SpopeerToast && window.SpopeerToast.warning('Please select a video file.'), undefined);
      if (file.size > 50 * 1024 * 1024) return (window.SpopeerToast && window.SpopeerToast.warning('File too large. Max 50MB.'), undefined);
      selectedFile = file;
      fileNameEl.textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
      fileNameEl.style.display = 'block';
      document.getElementById('uploadBtn').disabled = false;
    }

    function toggleUpload() {
      document.getElementById('uploadForm').classList.toggle('visible');
    }

    // ── Upload reel ──
    async function uploadReel() {
      const title = document.getElementById('reelTitle').value.trim();
      if (!title) return (window.SpopeerToast && window.SpopeerToast.warning('Title is required.'), undefined);
      if (!selectedFile) return (window.SpopeerToast && window.SpopeerToast.warning('Please select a video.'), undefined);

      const btn = document.getElementById('uploadBtn');
      btn.disabled = true;
      btn.textContent = 'Uploading...';

      const fd = new FormData();
      fd.append('video', selectedFile);
      fd.append('title', title);
      fd.append('description', document.getElementById('reelDesc').value.trim());
      fd.append('sport', document.getElementById('reelSport').value);
      fd.append('duration', document.getElementById('reelDuration').value || '');

      try {
        const res = await fetch(`${API_BASE}/reels`, {
          method: 'POST',
          credentials: 'include',
          body: fd
        });
        const data = await res.json();
        if (!res.ok) return (window.SpopeerToast && window.SpopeerToast.error(data.error || 'Upload failed.'), undefined);

        toggleUpload();
        selectedFile = null;
        document.getElementById('reelTitle').value = '';
        document.getElementById('reelDesc').value = '';
        fileNameEl.style.display = 'none';
        btn.textContent = 'Upload Reel';
        btn.disabled = true;
        loadReels();
      } catch (e) {
        console.error('Upload error:', e);
        if (window.SpopeerToast) window.SpopeerToast.error('Upload failed. Please try again.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Reel';
      }
    }

    // ── Load reels ──
    async function loadReels() {
      try {
        const res = await fetch(`${API_BASE}/reels?limit=50`, { credentials: 'include' });
        const data = await res.json();
        renderReels(data.payload || []);
      } catch (e) {
        console.error('Load reels error:', e);
        document.getElementById('reelGrid').innerHTML = '<div class="empty-state"><i class="fa-solid fa-plug-circle-xmark"></i>Could not load reels.</div>';
      }
    }

    function renderReels(reels) {
      const grid = document.getElementById('reelGrid');
      if (!reels.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-film"></i>No highlight reels yet. Create the first one!</div>';
        return;
      }
      grid.innerHTML = reels.map(r => {
        const creator = r.creator || {};
        const initials = ((creator.firstName || '?')[0] + (creator.lastName || '?')[0]).toUpperCase();
        const dur = r.duration ? formatDuration(r.duration) : '';
        return `
          <div class="reel-card" onclick="playReel('${escapeAttr(r.videoUrl)}','${escapeAttr(r.title)}','${escapeAttr(r.description || '')}')">
            <div class="reel-thumb">
              <video src="${r.videoUrl}" preload="metadata" muted></video>
              <div class="play-overlay"><i class="fa-solid fa-play"></i></div>
              ${dur ? `<span class="reel-duration">${dur}</span>` : ''}
            </div>
            <div class="reel-info">
              <div class="reel-title">${escapeHtml(r.title)}</div>
              <div class="reel-author">
                <div class="reel-avatar">${initials}</div>
                <span class="reel-author-name">${creator.firstName || ''} ${creator.lastName || ''}</span>
                ${r.sport ? `<span class="reel-tag">${escapeHtml(r.sport)}</span>` : ''}
              </div>
              <div class="reel-stats">
                <span><i class="fa-regular fa-eye"></i> ${r.viewCount || 0}</span>
                <span><i class="fa-regular fa-heart"></i> ${r.likesCount || 0}</span>
              </div>
            </div>
          </div>`;
      }).join('');
    }

    // ── Player ──
    function playReel(url, title, desc) {
      const video = document.getElementById('playerVideo');
      video.src = url;
      document.getElementById('playerTitle').textContent = title;
      document.getElementById('playerDesc').textContent = desc;
      document.getElementById('playerOverlay').classList.add('visible');
      video.play();
    }

    function closePlayer() {
      const video = document.getElementById('playerVideo');
      video.pause();
      video.src = '';
      document.getElementById('playerOverlay').classList.remove('visible');
    }

    document.getElementById('playerOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closePlayer();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlayer(); });

    // ── Helpers ──
    function escapeHtml(text) {
      if (!text) return '';
      const d = document.createElement('div');
      d.textContent = text;
      return d.innerHTML;
    }
    function escapeAttr(text) {
      return (text || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
    function formatDuration(secs) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m + ':' + String(s).padStart(2, '0');
    }

    // ── Init ──
    loadReels();
