(function () {
  function normalizeUser(user) {
    if (!user) return null;

    const displayName =
      user.displayName ||
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email ||
      'User';

    const initials = displayName
      .split(' ')
      .map(part => part[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return Object.assign({}, user, {
      displayName,
      initials,
      avatarUrl: user.avatarUrl || user.avatar || '',
      role: user.role || user.userType || 'user'
    });
  }

  let currentUser = null;
  const listeners = new Set();

  function emit() {
    listeners.forEach(fn => {
      try { fn(currentUser); } catch (err) { console.error('CurrentUserStore listener error:', err); }
    });

    try {
      window.dispatchEvent(new CustomEvent('currentUserChanged', { detail: { user: currentUser } }));
    } catch (_) {}
  }

  function getStoredUser() {
    try {
      const raw = localStorage.getItem('spopeer_user') || localStorage.getItem('user') || 'null';
      return normalizeUser(JSON.parse(raw));
    } catch (_) { return null; }
  }

  function persistUser(user) {
    if (user) {
      localStorage.setItem('spopeer_user', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('spopeer_loggedIn', 'true');
      localStorage.setItem('_profileLastUpdated_', Date.now().toString());
    } else {
      localStorage.removeItem('spopeer_user');
      localStorage.removeItem('user');
      localStorage.removeItem('spopeer_loggedIn');
      localStorage.removeItem('_profileLastUpdated_');
    }
  }

  function setCurrentUser(user) {
    currentUser = normalizeUser(user);
    try { persistUser(currentUser); } catch (err) { console.warn('Failed to persist current user:', err); }
    emit();
    return currentUser;
  }

  function clearCurrentUser() {
    currentUser = null;
    try { persistUser(null); } catch (_) {}
    emit();
  }

  async function refreshCurrentUser() {
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.me !== 'function') {
      currentUser = getStoredUser();
      emit();
      return currentUser;
    }

    try {
      const res = await window.SpopeerAPI.me();
      const user = res?.user || res?.data?.user || res?.payload || res?.payload?.user || null;

      return setCurrentUser(user);
    } catch (err) {
      console.warn('Failed to refresh current user:', err);
      clearCurrentUser();
      return null;
    }
  }

  function getCurrentUser() { if (!currentUser) currentUser = getStoredUser(); return currentUser; }
  function isLoggedIn() { return !!getCurrentUser(); }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function noop() {};
    listeners.add(fn);
    return function unsubscribe(){ listeners.delete(fn); };
  }

  window.CurrentUserStore = {
    normalizeUser,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    refreshCurrentUser,
    isLoggedIn,
    subscribe
  };
})();
