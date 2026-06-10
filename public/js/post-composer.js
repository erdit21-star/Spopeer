/**
 * post-composer.js
 * Handles the enhanced post creation form:
 *   - Privacy selector (public / followers / private / group)
 *   - Hashtag extraction
 *   - Link preview auto-fetch
 *   - Multiple image/video preview + upload
 *   - Group selector (when creating inside a group)
 *
 * Usage: include this script on any page that has a .post-composer element.
 *
 * Expected HTML structure (simplified):
 *
 *   <div class="post-composer" id="post-composer">
 *     <textarea id="post-content" placeholder="What's on your mind?"></textarea>
 *
 *     <div class="composer-toolbar">
 *       <label class="btn-icon" title="Add media">
 *         📷 <input type="file" id="post-media-input" accept="image/*,video/mp4,video/webm" multiple hidden>
 *       </label>
 *       <select id="post-visibility" title="Who can see this?">
 *         <option value="public">🌍 Public</option>
 *         <option value="followers">👥 Followers</option>
 *         <option value="private">🔒 Only me</option>
 *       </select>
 *       <input type="text" id="post-hashtags" placeholder="#hashtags" style="width:160px">
 *       <button id="btn-post-submit" class="btn-primary">Post</button>
 *     </div>
 *
 *     <div id="post-media-preview" class="media-preview-strip"></div>
 *     <div id="post-link-preview" class="link-preview-card" hidden></div>
 *   </div>
 */

(function () {
  'use strict';

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qf(selectors, ctx) {
    for (const sel of selectors) {
      const el = qs(sel, ctx);
      if (el) return el;
    }
    return null;
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Extract hashtags from text (#word, up to 20) */
  function extractHashtags(text) {
    const matches = String(text || '').match(/#([a-zA-Z0-9_]{1,60})/g) || [];
    return [...new Set(matches.map(t => t.slice(1).toLowerCase()))].slice(0, 20);
  }

  /** Return the first URL-like token found in text */
  function extractFirstUrl(text) {
    const m = String(text || '').match(/https?:\/\/[^\s"'<>]{4,}/);
    return m ? m[0] : null;
  }

  /* ── Link-preview fetcher ─────────────────────────────────────────────── */

  let _linkPreviewTimeout = null;
  let _lastFetchedUrl = null;

  async function fetchLinkPreview(url) {
    if (!url || url === _lastFetchedUrl) return null;
    _lastFetchedUrl = url;
    try {
      // Ask our OG endpoint if available, otherwise return minimal data
      const res = await fetch(`/api/og/preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json;
    } catch (_) {
      return null;
    }
  }

  function renderLinkPreview(container, data) {
    if (!data || !container) return;
    container.hidden = false;
    container.innerHTML = `
      <div class="lp-inner">
        ${data.image ? `<img class="lp-img" src="${escHtml(data.image)}" alt="" loading="lazy">` : ''}
        <div class="lp-text">
          <div class="lp-title">${escHtml(data.title || data.url || '')}</div>
          ${data.description ? `<div class="lp-desc">${escHtml(data.description)}</div>` : ''}
          <div class="lp-url">${escHtml(data.url || '')}</div>
        </div>
        <button class="lp-remove" title="Remove preview">✕</button>
      </div>`;
    container.querySelector('.lp-remove').addEventListener('click', () => {
      container.hidden = true;
      container.innerHTML = '';
      container.dataset.url = '';
      _lastFetchedUrl = null;
    });
    container.dataset.url    = data.url     || '';
    container.dataset.title  = data.title   || '';
    container.dataset.desc   = data.description || '';
    container.dataset.image  = data.image   || '';
  }

  /* ── Media preview strip ─────────────────────────────────────────────── */

  const _selectedFiles = [];

  function renderMediaPreview(strip) {
    strip.innerHTML = '';
    _selectedFiles.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'mp-item';

      if (file.type.startsWith('video/')) {
        const vid = document.createElement('video');
        vid.src = URL.createObjectURL(file);
        vid.controls = true;
        vid.muted = true;
        vid.className = 'mp-thumb';
        item.appendChild(vid);
      } else {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'mp-thumb';
        img.alt = file.name;
        item.appendChild(img);
      }

      const rm = document.createElement('button');
      rm.className = 'mp-remove';
      rm.title = 'Remove';
      rm.textContent = '✕';
      rm.addEventListener('click', () => {
        _selectedFiles.splice(idx, 1);
        renderMediaPreview(strip);
      });
      item.appendChild(rm);
      strip.appendChild(item);
    });
  }

  /* ── Form reset ───────────────────────────────────────────────────────── */

  function resetComposer(composer) {
    const textarea = qf(['#post-content', '#postContent'], composer);
    const hashtagsInput = qf(['#post-hashtags', '#postHashtags'], composer);
    const mediaPreview = qf(['#post-media-preview', '#mediaPreview'], composer);
    const linkPreview  = qf(['#post-link-preview', '#postLinkPreview'],  composer);
    const mediaInput   = qf(['#post-media-input'],   composer);
    const photoInput   = qf(['#photoInput'], composer);
    const videoInput   = qf(['#videoInput'], composer);
    const visibility   = qf(['#post-visibility', '#postVisibility'],    composer);

    if (textarea)     textarea.value = '';
    if (hashtagsInput) hashtagsInput.value = '';
    if (mediaPreview) mediaPreview.innerHTML = '';
    if (linkPreview)  { linkPreview.hidden = true; linkPreview.innerHTML = ''; }
    if (mediaInput)   mediaInput.value = '';
    if (photoInput)   photoInput.value = '';
    if (videoInput)   videoInput.value = '';
    if (visibility)   visibility.value = 'public';
    _selectedFiles.length = 0;
    _lastFetchedUrl = null;
  }

  /* ── Submit handler ───────────────────────────────────────────────────── */

  async function handleSubmit(composer) {
    const textarea      = qf(['#post-content', '#postContent'],    composer);
    const hashtagsInput = qf(['#post-hashtags', '#postHashtags'],   composer);
    const visSelect     = qf(['#post-visibility', '#postVisibility'], composer);
    const linkPreview   = qf(['#post-link-preview', '#postLinkPreview'], composer);
    const submitBtn     = qf(['#btn-post-submit', '#submitComposer'], composer);
    const groupIdInput  = qf(['#post-group-id', '#postGroupId'],   composer); // optional

    const content    = textarea    ? textarea.value.trim() : '';
    const visibility = visSelect   ? visSelect.value       : 'public';
    const groupId    = groupIdInput ? groupIdInput.value   : null;

    // Derive hashtags: from dedicated field or auto-extracted
    let hashtagStr = hashtagsInput ? hashtagsInput.value.trim() : '';
    const autoTags = extractHashtags(content);
    const manualTags = hashtagStr
      ? hashtagStr.split(/[,\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean)
      : [];
    const allTags = [...new Set([...autoTags, ...manualTags])].slice(0, 20);

    if (!content && _selectedFiles.length === 0) {
      alert('Please write something or add media.');
      return;
    }

    const formData = new FormData();
    formData.append('content', content);
    formData.append('visibility', visibility);
    if (allTags.length) formData.append('hashtags', JSON.stringify(allTags));
    if (groupId) formData.append('groupId', groupId);

    // Link preview fields
    if (linkPreview && !linkPreview.hidden && linkPreview.dataset.url) {
      formData.append('linkUrl',         linkPreview.dataset.url);
      formData.append('linkTitle',       linkPreview.dataset.title  || '');
      formData.append('linkDescription', linkPreview.dataset.desc   || '');
      formData.append('linkImage',       linkPreview.dataset.image  || '');
    }

    // Media files (all as 'media')
    _selectedFiles.forEach(f => formData.append('media', f));

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Posting…'; }

    try {
      const api = window.SpopeerAPI;
      if (!api || typeof api.createPost !== 'function') {
        throw new Error('Posting is temporarily unavailable. Please refresh and try again.');
      }

      const json = await api.createPost(formData);
      resetComposer(composer);
      // Emit event so feed can prepend the new post without reload
      document.dispatchEvent(new CustomEvent('spopeer:post:created', { detail: json.data || json }));
      if (typeof window.showToast === 'function') window.showToast('Post published!', 'success');
    } catch (err) {
      alert(err.message || 'Could not create post.');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Post'; }
    }
  }

  /* ── Init ─────────────────────────────────────────────────────────────── */

  function initComposer(composer) {
    if (composer.dataset.postComposerEnhanced === 'true') return;
    composer.dataset.postComposerEnhanced = 'true';

    const textarea    = qf(['#post-content', '#postContent'],    composer);
    const mediaInput  = qf(['#post-media-input'],  composer);
    const photoInput  = qf(['#photoInput'], composer);
    const videoInput  = qf(['#videoInput'], composer);
    const mediaStrip  = qf(['#post-media-preview', '#mediaPreview'], composer);
    const linkPreview = qf(['#post-link-preview', '#postLinkPreview'],  composer);
    const submitBtn   = qf(['#btn-post-submit', '#submitComposer'],   composer);
    const visibility  = qf(['#post-visibility', '#postVisibility'], composer);
    const groupWrap   = qf(['#postGroupWrap'], composer);

    function addFiles(files) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
      Array.from(files || []).forEach(f => {
        if (allowed.includes(f.type) && _selectedFiles.length < 10) _selectedFiles.push(f);
      });
      if (mediaStrip) renderMediaPreview(mediaStrip);
    }

    // Media file picker
    if (mediaInput && mediaStrip) {
      mediaInput.addEventListener('change', () => {
        addFiles(mediaInput.files);
        mediaInput.value = '';
      });
    }
    if (photoInput) {
      photoInput.setAttribute('multiple', 'multiple');
      photoInput.addEventListener('change', () => {
        addFiles(photoInput.files);
        photoInput.value = '';
      });
    }
    if (videoInput) {
      videoInput.setAttribute('multiple', 'multiple');
      videoInput.addEventListener('change', () => {
        addFiles(videoInput.files);
        videoInput.value = '';
      });
    }

    if (visibility && groupWrap) {
      const syncGroupWrap = () => {
        groupWrap.style.display = visibility.value === 'group' ? '' : 'none';
      };
      visibility.addEventListener('change', syncGroupWrap);
      syncGroupWrap();
    }

    // Auto link-preview on content change
    if (textarea && linkPreview) {
      textarea.addEventListener('input', () => {
        clearTimeout(_linkPreviewTimeout);
        _linkPreviewTimeout = setTimeout(async () => {
          const url = extractFirstUrl(textarea.value);
          if (url) {
            const data = await fetchLinkPreview(url);
            if (data) renderLinkPreview(linkPreview, { ...data, url });
          }
        }, 800);
      });
    }

    // Submit
    if (submitBtn) {
      submitBtn.addEventListener('click', () => handleSubmit(composer));
    }

    // Enter key in textarea (Ctrl/Cmd+Enter)
    if (textarea) {
      textarea.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSubmit(composer);
        }
      });
    }
  }

  // Auto-initialise all .post-composer elements on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.post-composer').forEach(initComposer);
    // Backwards-compatible fallback for feed modal markup
    const legacyModal = document.getElementById('postComposerModal');
    if (legacyModal) initComposer(legacyModal);
  });

  // Also expose for manual init
  window.PostComposer = { init: initComposer, reset: resetComposer };
})();
