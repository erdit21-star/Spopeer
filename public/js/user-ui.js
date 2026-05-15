(function () {
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

    renderAvatar(root.querySelector('[data-user-chip-avatar]') || root.querySelector('.chip-avatar'), user);
    renderShortName(root.querySelector('[data-user-chip-name]') || root.querySelector('.chip-name'), user);
    renderFullName(root.querySelector('[data-user-full-name]') || root.querySelector('.full-name'), user);
    renderHandle(root.querySelector('[data-user-handle]') || root.querySelector('.chip-handle'), user);
    renderRole(root.querySelector('[data-user-role]') || root.querySelector('.chip-role'), user);
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
})();
