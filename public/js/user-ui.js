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

  function bindAllChips() {
    document.querySelectorAll('[data-user-chip]').forEach(root => {
      bindChip(root);
    });
  }

  window.UserUI = {
    renderAvatar,
    renderName,
    renderFullName,
    renderRole,
    renderChip,
    bindChip,
    bindAllChips
  };
})();
// user-ui.js
(function () {
  function renderAvatar(el, user) {
    if (!el) return;

    if (!user) {
      el.textContent = '?';
      return;
    }

    if (user.avatarUrl) {
      el.innerHTML = `<img src="${user.avatarUrl}" alt="${(user.displayName||'User')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      el.textContent = user.initials || 'U';
    }
  }

  function renderName(el, user) {
    if (!el) return;
    el.textContent = user ? (String(user.displayName).split(' ')[0] || user.displayName) : 'User';
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

  function applyLegacyIds(user) {
    try {
      const a = document.getElementById('chipAvatar');
      const n = document.getElementById('chipName');
      if (a) {
        if (user && user.avatarUrl) a.innerHTML = `<img src="${user.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        else if (a) a.textContent = user ? (user.initials || 'U') : 'U';
      }
      if (n) {
        if (user) n.textContent = (user.displayName||'User').split(' ')[0] || user.displayName;
        else n.textContent = 'User';
      }
    } catch (e) { /* ignore */ }
  }

  function bindChip(root) {
    if (!root || !window.CurrentUserStore) return;

    function update(user) { renderChip(root, user); applyLegacyIds(user); }

    update(window.CurrentUserStore.getCurrentUser());
    return window.CurrentUserStore.subscribe(update);
  }

  function bindAllChips() {
    // data-attribute chips
    document.querySelectorAll('[data-user-chip]').forEach(root => bindChip(root));
    // also update legacy ids once
    applyLegacyIds(window.CurrentUserStore.getCurrentUser());
  }

  window.UserUI = {
    renderAvatar,
    renderName,
    renderFullName,
    renderRole,
    renderChip,
    bindChip,
    bindAllChips
  };
})();
