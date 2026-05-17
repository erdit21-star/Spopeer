(function () {
    'use strict';

    // ── state ──
    let _items = [];
    let _activeTab = 'all';
    let _page = 1;
    let _pages = 1;
    let _lightboxIndex = 0;
    let _editingId = null;

    // ── DOM refs ──
    const grid = document.getElementById('mediaGrid');
    const loadMoreRow = document.getElementById('loadMoreRow');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('vaultFileInput');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressFill = document.getElementById('uploadProgressFill');
    const storageFill = document.getElementById('storageBarFill');
    const storageUsed = document.getElementById('storageBarUsed');
    const toast = document.getElementById('vaultToast');

    // lightbox
    const lbOverlay = document.getElementById('lightboxOverlay');
    const lbImg = document.getElementById('lightboxImg');
    const lbVideo = document.getElementById('lightboxVideo');
    const lbCaption = document.getElementById('lightboxCaption');
    const lbClose = document.getElementById('lightboxClose');
    const lbPrev = document.getElementById('lightboxPrev');
    const lbNext = document.getElementById('lightboxNext');

    // caption modal
    const captionModal = document.getElementById('captionModal');
    const captionInput = document.getElementById('captionInput');
    const captionSaveBtn = document.getElementById('captionSaveBtn');
    const captionCancelBtn = document.getElementById('captionCancelBtn');

    // ── toast helper ──
    let _toastTimer;
    function showToast(msg, ms = 3000) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(_toastTimer);
      _toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
    }

    // ── format helpers ──
    function fmtBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    }
    function mediaType(mime) {
      if (!mime) return 'file';
      if (mime.startsWith('image/')) return 'photo';
      if (mime.startsWith('video/')) return 'video';
      return 'file';
    }
    function fileIcon(mime) {
      if (!mime) return 'fa-regular fa-file';
      if (mime.includes('pdf')) return 'fa-regular fa-file-pdf';
      if (mime.includes('word') || mime.includes('document')) return 'fa-regular fa-file-word';
      if (mime.includes('sheet') || mime.includes('excel')) return 'fa-regular fa-file-excel';
      if (mime.includes('presentation') || mime.includes('powerpoint')) return 'fa-regular fa-file-powerpoint';
      return 'fa-regular fa-file';
    }

    // ── tab counts ──
    function updateTabCounts(items) {
      document.getElementById('tabCountAll').textContent = items.length;
      document.getElementById('tabCountPhoto').textContent = items.filter(i => mediaType(i.mimeType) === 'photo').length;
      document.getElementById('tabCountVideo').textContent = items.filter(i => mediaType(i.mimeType) === 'video').length;
      document.getElementById('tabCountFile').textContent = items.filter(i => mediaType(i.mimeType) === 'file').length;
    }

    // ── storage bar ──
    function updateStorageBar(items) {
      const total = items.reduce((s, i) => s + (i.size || 0), 0);
      const limit = 5 * 1024 * 1024 * 1024; // 5 GB display cap
      const pct = Math.min((total / limit) * 100, 100);
      storageFill.style.width = pct + '%';
      storageUsed.textContent = fmtBytes(total) + ' used';
    }

    // ── render items ──
    function renderItems(items, append = false) {
      if (!append) grid.innerHTML = '';

      if (items.length === 0 && !append) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <i class="fa-regular fa-photo-film"></i>
            <h3>No media yet</h3>
            <p>Upload photos, videos and files to keep them organised in one place.</p>
            <button class="btn btn-primary" onclick="document.getElementById('uploadBtn').click()">
              <i class="fa-solid fa-cloud-arrow-up"></i> Upload your first file
            </button>
          </div>`;
        return;
      }

      items.forEach(item => {
        const type = mediaType(item.mimeType);
        const el = document.createElement('div');
        el.className = 'media-item' + (type === 'file' ? ' file-item' : '');
        el.dataset.id = item.id;

        if (type === 'photo') {
          el.innerHTML = `
            <img src="${item.url}" alt="${item.caption || item.originalName}" loading="lazy">
            <span class="media-type-badge">Photo</span>
            <div class="media-overlay">
              <div class="media-overlay-top">
                <button class="media-icon-btn caption-btn" title="Edit caption"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="media-icon-btn delete" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
              </div>
              <div class="media-overlay-bottom">
                <div class="media-overlay-caption">${item.caption || item.originalName}</div>
              </div>
            </div>`;
          el.addEventListener('click', e => { if (!e.target.closest('button')) openLightbox(item); });
        } else if (type === 'video') {
          el.innerHTML = `
            <video src="${item.url}" preload="metadata" muted></video>
            <span class="media-type-badge">Video</span>
            <div class="media-overlay">
              <div class="media-overlay-top">
                <button class="media-icon-btn caption-btn" title="Edit caption"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="media-icon-btn delete" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
              </div>
              <div class="media-overlay-bottom">
                <div class="media-overlay-caption">${item.caption || item.originalName}</div>
              </div>
            </div>`;
          el.addEventListener('click', e => { if (!e.target.closest('button')) openLightbox(item); });
        } else {
          el.innerHTML = `
            <i class="${fileIcon(item.mimeType)}"></i>
            <span class="file-name">${item.originalName}</span>
            <span class="file-size">${fmtBytes(item.size)}</span>
            <div class="media-overlay" style="opacity:0;position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;gap:8px;border-radius:inherit;">
              <a class="media-icon-btn" href="${item.url}" download="${item.originalName}" title="Download"><i class="fa-solid fa-download"></i></a>
              <button class="media-icon-btn delete" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
            </div>`;
          el.addEventListener('mouseenter', () => el.querySelector('.media-overlay').style.opacity = '1');
          el.addEventListener('mouseleave', () => el.querySelector('.media-overlay').style.opacity = '0');
        }

        // delete
        const delBtn = el.querySelector('.delete');
        if (delBtn) {
          delBtn.addEventListener('click', e => { e.stopPropagation(); confirmDelete(item.id); });
        }
        // caption
        const capBtn = el.querySelector('.caption-btn');
        if (capBtn) {
          capBtn.addEventListener('click', e => { e.stopPropagation(); openCaptionModal(item); });
        }

        grid.appendChild(el);
      });
    }

    // ── fetch ──
    async function loadMedia(tab = 'all', page = 1, append = false) {
      try {
        const res = await fetch(`/api/media/my?type=${tab}&page=${page}&limit=48`, { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const items = data.payload?.items || data.items || [];
        _pages = data.payload?.pages || data.pages || 1;
        _page = page;

        if (!append) _items = items;
        else _items = _items.concat(items);

        renderItems(append ? items : _items, append);
        updateTabCounts(_items);
        updateStorageBar(_items);

        loadMoreRow.style.display = _page < _pages ? 'block' : 'none';
      } catch {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-circle-xmark"></i><h3>Could not load media</h3><p>Check your connection and try again.</p></div>`;
      }
    }

    // ── tabs ──
    document.querySelectorAll('[data-vault-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-vault-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeTab = btn.dataset.vaultTab;
        _items = [];
        loadMedia(_activeTab, 1, false);
      });
    });

    // ── load more ──
    loadMoreBtn.addEventListener('click', () => loadMedia(_activeTab, _page + 1, true));

    // ── upload ──
    uploadBtn.addEventListener('click', () => {
      const showing = uploadZone.style.display !== 'none';
      uploadZone.style.display = showing ? 'none' : 'block';
      if (!showing) uploadZone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) uploadFiles(Array.from(e.dataTransfer.files));
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) uploadFiles(Array.from(fileInput.files));
      fileInput.value = '';
    });

    async function uploadFiles(files) {
      progressBar.classList.add('active');
      progressFill.style.width = '0%';

      let done = 0;
      for (const file of files) {
        if (file.size > 100 * 1024 * 1024) {
          showToast(`"${file.name}" exceeds 100 MB — skipped.`);
          done++;
          progressFill.style.width = Math.round((done / files.length) * 100) + '%';
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch('/api/media/upload', { method: 'POST', body: fd, credentials: 'include' });
          if (!res.ok) throw new Error('upload failed');
          showToast(`"${file.name}" uploaded.`);
        } catch {
          showToast(`Failed to upload "${file.name}".`);
        }
        done++;
        progressFill.style.width = Math.round((done / files.length) * 100) + '%';
      }

      setTimeout(() => {
        progressBar.classList.remove('active');
        uploadZone.style.display = 'none';
        loadMedia(_activeTab, 1, false);
      }, 600);
    }

    // ── delete ──
    async function confirmDelete(id) {
      if (!confirm('Delete this file permanently?')) return;
      try {
        const res = await fetch(`/api/media/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('delete failed');
        _items = _items.filter(i => i.id !== id);
        document.querySelector(`[data-id="${id}"]`)?.remove();
        updateTabCounts(_items);
        updateStorageBar(_items);
        showToast('File deleted.');
        if (_items.length === 0) renderItems([]);
      } catch {
        showToast('Could not delete file.');
      }
    }

    // ── caption modal ──
    function openCaptionModal(item) {
      _editingId = item.id;
      captionInput.value = item.caption || '';
      captionModal.classList.add('open');
      captionInput.focus();
    }
    captionCancelBtn.addEventListener('click', () => captionModal.classList.remove('open'));
    captionModal.addEventListener('click', e => { if (e.target === captionModal) captionModal.classList.remove('open'); });
    captionSaveBtn.addEventListener('click', async () => {
      const cap = captionInput.value.trim();
      try {
        const res = await fetch(`/api/media/${_editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption: cap }),
          credentials: 'include'
        });
        if (!res.ok) throw new Error();
        const idx = _items.findIndex(i => i.id === _editingId);
        if (idx !== -1) _items[idx].caption = cap;
        // update overlay caption in DOM
        const el = document.querySelector(`[data-id="${_editingId}"]`);
        const capEl = el?.querySelector('.media-overlay-caption');
        if (capEl) capEl.textContent = cap || _items[idx]?.originalName || '';
        captionModal.classList.remove('open');
        showToast('Caption saved.');
      } catch {
        showToast('Could not save caption.');
      }
    });

    // ── lightbox ──
    function lightboxItems() {
      return _items.filter(i => mediaType(i.mimeType) !== 'file');
    }
    function openLightbox(item) {
      const viewable = lightboxItems();
      _lightboxIndex = viewable.findIndex(i => i.id === item.id);
      showLightboxAt(_lightboxIndex);
    }
    function showLightboxAt(idx) {
      const viewable = lightboxItems();
      if (!viewable.length) return;
      _lightboxIndex = (idx + viewable.length) % viewable.length;
      const item = viewable[_lightboxIndex];
      const type = mediaType(item.mimeType);

      lbVideo.pause?.();
      lbImg.style.display = 'none';
      lbVideo.style.display = 'none';

      if (type === 'photo') {
        lbImg.src = item.url;
        lbImg.alt = item.caption || item.originalName;
        lbImg.style.display = 'block';
      } else {
        lbVideo.src = item.url;
        lbVideo.style.display = 'block';
      }
      lbCaption.textContent = item.caption || '';
      lbOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      lbOverlay.classList.remove('open');
      lbVideo.pause?.();
      lbVideo.src = '';
      lbImg.src = '';
      document.body.style.overflow = '';
    }
    lbClose.addEventListener('click', closeLightbox);
    lbOverlay.addEventListener('click', e => { if (e.target === lbOverlay) closeLightbox(); });
    lbPrev.addEventListener('click', () => showLightboxAt(_lightboxIndex - 1));
    lbNext.addEventListener('click', () => showLightboxAt(_lightboxIndex + 1));
    document.addEventListener('keydown', e => {
      if (!lbOverlay.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showLightboxAt(_lightboxIndex - 1);
      if (e.key === 'ArrowRight') showLightboxAt(_lightboxIndex + 1);
    });

    // ── init ──
    loadMedia('all', 1);
  })();
