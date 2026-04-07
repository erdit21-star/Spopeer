(function () {
  let currentUser = null;
  const listeners = new Set();

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

    return {
      ...user,
      displayName,
      initials,
      avatarUrl: user.avatarUrl || user.avatar || '',
      role: user.role || user.userType || 'user'
    };
  }

  function emit() {
    listeners.forEach(fn => {
      try {
        fn(currentUser);
      } catch (err) {
        console.error('CurrentUserStore listener error:', err);
      }
    });

    try {
      window.dispatchEvent(new CustomEvent('currentUserChanged', {
        detail: { user: currentUser }
      }));
    } catch (err) {
      // ignore
    }
  }

  function getStoredUser() {
    try {
      return normalizeUser(JSON.parse(localStorage.getItem('spopeer_user') || 'null'));
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    currentUser = normalizeUser(user);

    if (currentUser) {
      try {
        localStorage.setItem('spopeer_user', JSON.stringify(currentUser));
        localStorage.setItem('spopeer_loggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('_profileLastUpdated_', Date.now().toString());
      } catch (err) {
        console.warn('Failed to persist current user to localStorage', err);
      }
    } else {
      try {
        localStorage.removeItem('spopeer_user');
        localStorage.removeItem('spopeer_loggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('_profileLastUpdated_');
      } catch (err) {
        // ignore
      }
    }

    emit();
    return currentUser;
  }

  function clearCurrentUser() {
    currentUser = null;
    try {
      localStorage.removeItem('spopeer_user');
      localStorage.removeItem('spopeer_loggedIn');
      localStorage.removeItem('user');
      localStorage.removeItem('_profileLastUpdated_');
    } catch (err) {
      // ignore
    }
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
      const user =
        res?.user ||
        res?.data?.user ||
        res?.payload ||
        null;

      return setCurrentUser(user);
    } catch (err) {
      console.warn('Failed to refresh current user:', err);
      clearCurrentUser();
      return null;
    }
  }

  function getCurrentUser() {
    if (!currentUser) currentUser = getStoredUser();
    return currentUser;
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function noop() {};
    listeners.add(fn);
    return function unsubscribe() {
      listeners.delete(fn);
    };
  }

  window.CurrentUserStore = {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    refreshCurrentUser,
    isLoggedIn,
    subscribe,
    normalizeUser
  };
})();
// current-user-store.js
(function () {
  let currentUser = null;
  const listeners = new Set();

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
      .map(part => (part && part[0]) || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return {
      ...user,
      displayName,
      initials,
      avatarUrl: user.avatarUrl || user.avatar || '',
      role: user.role || user.userType || 'user'
    };
  }

  function emit() {
    listeners.forEach(fn => {
      try {
        fn(currentUser);
      } catch (err) {
        console.error('CurrentUserStore listener error:', err);
      }
    });

    try {
      window.dispatchEvent(new CustomEvent('currentUserChanged', {
        detail: { user: currentUser }
      }));
    } catch (e) {
      void e;
    }
  }

  function getStoredUser() {
    try {
      return normalizeUser(JSON.parse(localStorage.getItem('spopeer_user') || 'null'));
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    currentUser = normalizeUser(user);

    if (currentUser) {
      try { localStorage.setItem('spopeer_user', JSON.stringify(currentUser)); } catch (e) { void e; }
      try { localStorage.setItem('spopeer_loggedIn', 'true'); } catch (e) { void e; }
      try { localStorage.setItem('user', JSON.stringify(currentUser)); } catch (e) { void e; }
      try { localStorage.setItem('_profileLastUpdated_', Date.now().toString()); } catch (e) { void e; }
    } else {
      try { localStorage.removeItem('spopeer_user'); } catch (e) { void e; }
      try { localStorage.removeItem('spopeer_loggedIn'); } catch (e) { void e; }
      try { localStorage.removeItem('user'); } catch (e) { void e; }
      try { localStorage.removeItem('_profileLastUpdated_'); } catch (e) { void e; }
    }

    emit();
    return currentUser;
  }

  function clearCurrentUser() {
    currentUser = null;
    try { localStorage.removeItem('spopeer_user'); } catch (e) { void e; }
    try { localStorage.removeItem('spopeer_loggedIn'); } catch (e) { void e; }
    try { localStorage.removeItem('user'); } catch (e) { void e; }
    try { localStorage.removeItem('_profileLastUpdated_'); } catch (e) { void e; }
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
      const user = res?.user || res?.data?.user || res?.payload || null;
      return setCurrentUser(user);
    } catch (err) {
      console.warn('Failed to refresh current user:', err);
      clearCurrentUser();
      return null;
    }
  }

  function getCurrentUser() {
    if (!currentUser) currentUser = getStoredUser();
    return currentUser;
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return function unsubscribe() { listeners.delete(fn); };
  }

  window.CurrentUserStore = {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    refreshCurrentUser,
    isLoggedIn,
    subscribe,
    normalizeUser
  };
})();
