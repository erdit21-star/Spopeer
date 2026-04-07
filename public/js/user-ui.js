(function () {
  function renderAvatar(el, user) {
    if (!el) return;

    if (!user) {
      el.textContent = '?';
      return;
    }

    if (user.avatarUrl) {
      el.innerHTML = `<img src="${user.avatarUrl}" alt="${user.displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      el.textContent = user.initials || 'U';
    }
  }

  function renderName(el, user) {
    if (!el) return;
    el.textContent = user ? (user.displayName.split(' ')[0] || user.displayName) : 'User';
  }

  function renderFullName(el, user) {
    if (!el) return;
    el.textContent = user ? user.displayName : 'User';
  }

  function renderRole(el, user) {
    if (!el) return;
    el.textContent = user ? (user.role || 'user') : 'user';
  }

  function renderChip(root, user) {
    if (!root) return;

    renderAvatar(root.querySelector('[data-user-chip-avatar]'), user);
    renderName(root.querySelector('[data-user-chip-name]'), user);
    renderFullName(root.querySelector('[data-user-full-name]'), user);
    renderRole(root.querySelector('[data-user-role]'), user);
  }

  function bindChip(root) {
    if (!root || !window.CurrentUserStore) return;

    function update(user) {
      renderChip(root, user);
    }

    update(window.CurrentUserStore.getCurrentUser());
    return window.CurrentUserStore.subscribe(update);
  }
(function () {
  function escapeHtml(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderAvatar(el, user) {
    if (!el) return;

    if (!user) {
      el.innerHTML = '';
      el.textContent = 'U';
      return;
    }

    if (user.avatarUrl) {
      el.innerHTML = `<img src="${user.avatarUrl}" alt="${escapeHtml(user.displayName || 'User')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      return;
    }

    el.innerHTML = '';
    el.textContent = user.initials || 'U';
  }

  function renderShortName(el, user) {
    if (!el) return;
    el.textContent = user ? (user.displayName.split(' ')[0] || user.displayName) : 'User';
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

    const handle = user.username || (user.email ? user.email.split('@')[0] : '') || 'user';
    el.textContent = '@' + handle;
  }

  function renderRole(el, user) {
    if (!el) return;
    el.textContent = user ? user.role || 'user' : 'user';
  }

  function renderChip(root, user) {
    if (!root) return;

    renderAvatar(root.querySelector('[data-user-chip-avatar]'), user);
    renderShortName(root.querySelector('[data-user-chip-name]'), user);
    renderFullName(root.querySelector('[data-user-full-name]'), user);
    renderHandle(root.querySelector('[data-user-handle]'), user);
    renderRole(root.querySelector('[data-user-role]'), user);
  }

  function bindChip(root) {
    if (!root || !window.CurrentUserStore) return function noop() {};

    const update = function(user) { renderChip(root, user); };

    update(window.CurrentUserStore.getCurrentUser());
    return window.CurrentUserStore.subscribe(update);
  }

  function bindAllChips() { document.querySelectorAll('[data-user-chip]').forEach(bindChip); }

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
})();
    renderChip,
    bindChip,
    bindAllChips
  };
})();
