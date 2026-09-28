(function () {
  function ensureFeedChipStyles() {
    if (document.getElementById('sp-feed-chip-unified-style')) return;
    var style = document.createElement('style');
    style.id = 'sp-feed-chip-unified-style';
    style.textContent = [
      '.user-chip[data-user-chip]{display:inline-flex!important;align-items:center!important;gap:8px!important;padding:5px 12px 5px 6px!important;background:var(--white,#fff)!important;border:1.5px solid var(--border,#ebebe7)!important;border-radius:999px!important;cursor:pointer!important;transition:background .15s ease,border-color .15s ease!important;position:relative!important;box-shadow:none!important}',
      '.user-chip[data-user-chip]:hover,.user-chip[data-user-chip].open,.user-chip[data-user-chip]:focus,.user-chip[data-user-chip]:focus-visible{background:var(--white,#fff)!important;border-color:var(--border,#ebebe7)!important;outline:none!important;box-shadow:none!important}',
      '.user-chip[data-user-chip] .chip-avatar{width:28px!important;height:28px!important;border-radius:50%!important;background:var(--surface,#f3f3ef)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-weight:700!important;font-size:11px!important;color:var(--ink-2,#333)!important;flex-shrink:0!important;overflow:hidden!important;line-height:1!important}',
      '.user-chip[data-user-chip] .chip-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important}',
      '.user-chip[data-user-chip] .chip-name{display:block!important;font-size:13px!important;font-weight:600!important;color:var(--ink,#111)!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:160px!important}',
      '.user-chip[data-user-chip] .chip-caret{display:flex!important;align-items:center!important;justify-content:center!important;color:var(--muted,#7a7a7a)!important;font-size:9px!important;transition:transform .2s ease!important;flex-shrink:0!important}',
      '.user-chip[data-user-chip].open .chip-caret{transform:rotate(180deg)!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureFeedChipStructure(root) {
    if (!root) return;
    root.setAttribute('data-user-chip', '');

    var avatar = root.querySelector('[data-user-chip-avatar]') || root.querySelector('.chip-avatar');
    if (!avatar) {
      avatar = document.createElement('span');
      avatar.className = 'chip-avatar';
      avatar.textContent = 'U';
    }
    avatar.classList.add('chip-avatar');
    avatar.setAttribute('data-user-chip-avatar', '');

    var nameEl = root.querySelector('[data-user-chip-name]') || root.querySelector('.chip-name');
    if (!nameEl) {
      nameEl = document.createElement('span');
      nameEl.className = 'chip-name';
      nameEl.textContent = 'User';
    }
    nameEl.classList.add('chip-name');
    nameEl.setAttribute('data-user-chip-name', '');

    var caret = root.querySelector('.chip-caret');
    if (!caret) {
      caret = document.createElement('i');
      caret.className = 'fa-solid fa-chevron-down chip-caret';
      caret.setAttribute('aria-hidden', 'true');
    }

    Array.prototype.slice.call(root.children).forEach(function (child) {
      if (child === avatar || child === nameEl || child === caret) return;
      if (child.matches && (
        child.matches('.chip-avatar,.chip-text,.chip-name,.chip-handle,.chip-online-dot,.chip-caret') ||
        child.hasAttribute('data-user-chip-avatar') ||
        child.hasAttribute('data-user-chip-name') ||
        child.hasAttribute('data-user-chip-handle') ||
        child.hasAttribute('data-chip-online-dot')
      )) child.remove();
    });

    root.appendChild(avatar);
    root.appendChild(nameEl);
    root.appendChild(caret);
  }

  function renderAvatar(el, user) {
    if (!el) return;

    if (!user) {
      el.innerHTML = '';
      el.textContent = 'U';
      return;
    }

    if (user.avatarUrl) {
      el.innerHTML = `<img src="${user.avatarUrl}" alt="${escapeHtml(
        user.displayName || 'User'
      )}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      const img = el.querySelector('img');
      if (img) {
        img.addEventListener('error', function handleAvatarError() {
          el.innerHTML = '';
          el.textContent = user.initials || 'U';
        }, { once: true });
      }
      return;
    }

    el.innerHTML = '';
    el.textContent = user.initials || 'U';
  }

  function renderShortName(el, user) {
    if (!el) return;
    el.textContent = user
      ? user.displayName.split(' ')[0] || user.displayName
      : 'User';
  }

  function renderFullName(el, user) {
    if (!el) return;
    el.textContent = user ? user.displayName : 'User';
  }

  function renderHandle(el, user) {
    if (!el) return;

    if (!user) {
      el.textContent = '@user';
      return;
    }

    const handle =
      user.username ||
      (user.email ? user.email.split('@')[0] : '') ||
      'user';

    el.textContent = '@' + handle;
  }

  function renderRole(el, user) {
    if (!el) return;
    el.textContent = user ? user.role || 'user' : 'user';
  }

  function renderChip(root, user) {
    if (!root) return;

    ensureFeedChipStructure(root);

    renderAvatar(root.querySelector('[data-user-chip-avatar]') || root.querySelector('.chip-avatar'), user);
    renderShortName(root.querySelector('[data-user-chip-name]') || root.querySelector('.chip-name'), user);
  }

  function bindChip(root) {
    if (!root || !window.CurrentUserStore) return function noop() {};
    if (root.dataset.userChipBound === '1') return function noop() {};
    root.dataset.userChipBound = '1';

    const update = function (user) {
      renderChip(root, user);
    };

    update(window.CurrentUserStore.getCurrentUser());
    return window.CurrentUserStore.subscribe(update);
  }

  function bindAllChips() {
    ensureFeedChipStyles();

    var roots = [];
    document.querySelectorAll('[data-user-chip]').forEach(function (el) {
      roots.push(el);
    });

    var legacy = document.getElementById('userChip');
    if (legacy && roots.indexOf(legacy) === -1) {
      roots.push(legacy);
    }

    roots.forEach(bindChip);
  }

  function escapeHtml(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  window.UserUI = {
    renderAvatar,
    renderShortName,
    renderFullName,
    renderHandle,
    renderRole,
    renderChip,
    bindChip,
    bindAllChips
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindAllChips);
    } else {
      bindAllChips();
    }
  }
})();
