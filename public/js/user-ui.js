(function () {
  function ensureFeedChipStyles() {
    if (document.getElementById('sp-feed-chip-unified-style')) return;
    var style = document.createElement('style');
    style.id = 'sp-feed-chip-unified-style';
    style.textContent = [
      '.user-chip[data-user-chip]{display:inline-flex!important;align-items:center!important;gap:10px!important;padding:5px 12px 5px 5px!important;background:transparent!important;border:1px solid var(--color-border-secondary,#d1d5db)!important;border-radius:999px!important;cursor:pointer!important;transition:background .15s ease,border-color .15s ease!important;position:relative!important}',
      '.user-chip[data-user-chip]:hover{background:var(--color-background-secondary,#f3f4f6)!important;border-color:var(--color-border-secondary,#d1d5db)!important}',
      '.user-chip[data-user-chip].open{background:var(--color-background-secondary,#f3f4f6)!important;border-color:var(--color-border-primary,#9ca3af)!important}',
      '.user-chip[data-user-chip] .chip-avatar{width:28px!important;height:28px!important;border-radius:50%!important;background:var(--color-background-secondary,#f3f4f6)!important;display:flex!important;align-items:center!important;justify-content:center!important;font-weight:600!important;font-size:12px!important;color:var(--color-text-secondary,#6b7280)!important;flex-shrink:0!important;overflow:hidden!important;line-height:1!important}',
      '.user-chip[data-user-chip] .chip-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important}',
      '.user-chip[data-user-chip] .chip-text{display:flex!important;flex-direction:column!important;gap:2px!important;min-width:0!important}',
      '.user-chip[data-user-chip] .chip-name{display:block!important;font-size:12px!important;font-weight:500!important;color:var(--color-text-primary,#1f2937)!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      '.user-chip[data-user-chip] .chip-handle{display:block!important;font-size:11px!important;color:var(--color-text-tertiary,#9ca3af)!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      '.user-chip[data-user-chip] .chip-online-dot{display:block!important;width:7px!important;height:7px!important;border-radius:50%!important;background:#10b981!important;flex-shrink:0!important}',
      '.user-chip[data-user-chip] .chip-online-dot.offline{background:#d1d5db!important}',
      '.user-chip[data-user-chip] .chip-caret{display:flex!important;align-items:center!important;justify-content:center!important;color:var(--color-text-tertiary,#9ca3af)!important;transition:transform .2s ease!important;flex-shrink:0!important}',
      '.user-chip[data-user-chip].open .chip-caret{transform:rotate(180deg)!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureFeedChipStructure(root) {
    if (!root) return;

    // Canonical structure for every page:
    // avatar -> text(name + handle) -> online dot -> caret.
    root.setAttribute('data-user-chip', '');

    var avatar = root.querySelector('[data-user-chip-avatar]') || root.querySelector('.chip-avatar');
    if (!avatar) {
      avatar = document.createElement('span');
      avatar.className = 'chip-avatar';
      avatar.textContent = 'U';
    }
    avatar.classList.add('chip-avatar');
    avatar.setAttribute('data-user-chip-avatar', '');

    var textWrap = root.querySelector('.chip-text');
    if (!textWrap) {
      textWrap = document.createElement('div');
      textWrap.className = 'chip-text';
    }

    var nameEl = root.querySelector('[data-user-chip-name]') || root.querySelector('.chip-name');
    if (!nameEl) {
      nameEl = document.createElement('span');
      nameEl.className = 'chip-name';
      nameEl.textContent = 'User';
    }
    nameEl.classList.add('chip-name');
    nameEl.setAttribute('data-user-chip-name', '');

    var handleEl = root.querySelector('[data-user-chip-handle]') ||
      root.querySelector('[data-user-handle]') ||
      root.querySelector('.chip-handle');
    if (!handleEl) {
      handleEl = document.createElement('span');
      handleEl.className = 'chip-handle';
      handleEl.textContent = '@user';
    }
    handleEl.classList.add('chip-handle');
    handleEl.setAttribute('data-user-chip-handle', '');

    var onlineDot = root.querySelector('[data-chip-online-dot]') ||
      root.querySelector('.chip-online-dot');
    if (!onlineDot) {
      onlineDot = document.createElement('span');
      onlineDot.className = 'chip-online-dot';
    }
    onlineDot.classList.add('chip-online-dot');
    onlineDot.setAttribute('data-chip-online-dot', '');

    var caret = root.querySelector('.chip-caret');
    if (!caret) {
      caret = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      caret.setAttribute('class', 'chip-caret');
      caret.setAttribute('width', '10');
      caret.setAttribute('height', '6');
      caret.setAttribute('viewBox', '0 0 10 6');
      caret.setAttribute('fill', 'none');
      caret.setAttribute('aria-hidden', 'true');

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M1 1l4 4 4-4');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.3');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      caret.appendChild(path);
    }

    textWrap.appendChild(nameEl);
    textWrap.appendChild(handleEl);

    // Remove legacy chip-only elements so old pages cannot produce duplicates.
    Array.prototype.slice.call(root.children).forEach(function (child) {
      if (child === avatar || child === textWrap || child === onlineDot || child === caret) return;
      if (
        child.matches &&
        (child.matches('.chip-avatar') ||
          child.matches('.chip-text') ||
          child.matches('.chip-name') ||
          child.matches('.chip-handle') ||
          child.matches('.chip-online-dot') ||
          child.matches('.chip-caret') ||
          child.hasAttribute('data-user-chip-avatar') ||
          child.hasAttribute('data-user-chip-name') ||
          child.hasAttribute('data-user-chip-handle') ||
          child.hasAttribute('data-chip-online-dot'))
      ) {
        child.remove();
      }
    });

    // Always append in exactly the same order on every page.
    root.appendChild(avatar);
    root.appendChild(textWrap);
    root.appendChild(onlineDot);
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
    renderFullName(root.querySelector('[data-user-full-name]') || root.querySelector('.full-name'), user);
    renderHandle(root.querySelector('[data-user-chip-handle]') || root.querySelector('[data-user-handle]') || root.querySelector('.chip-handle'), user);
    renderRole(root.querySelector('[data-user-role]') || root.querySelector('.chip-role'), user);

    // Update online status dot
    const onlineDot = root.querySelector('[data-chip-online-dot]');
    if (onlineDot) {
      const isOnline = user && user.isOnline !== false;
      if (isOnline) {
        onlineDot.classList.remove('offline');
      } else {
        onlineDot.classList.add('offline');
      }
    }
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
