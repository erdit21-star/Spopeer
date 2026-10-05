(function () {
  let currentUser = null;
  const listeners = new Set();
  const EMAIL_BANNER_ID = 'spopeer-email-verify-banner';

  function ensureEmailBannerStyles() {
    if (document.getElementById(`${EMAIL_BANNER_ID}-style`)) return;
    const style = document.createElement('style');
    style.id = `${EMAIL_BANNER_ID}-style`;
    style.textContent = `
      #${EMAIL_BANNER_ID} {
        position: sticky;
        top: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 14px;
        background: #f59e0b;
        color: #1f2937;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      #${EMAIL_BANNER_ID} button {
        border: none;
        background: #111827;
        color: #fff;
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function renderEmailVerificationBanner(user) {
    if (typeof document === 'undefined' || !document.body) return;

    const existing = document.getElementById(EMAIL_BANNER_ID);
    const mustShow = !!(user && user.emailVerified === false);

    if (!mustShow) {
      if (existing) existing.remove();
      return;
    }

    if (existing) return;

    ensureEmailBannerStyles();
    const el = document.createElement('div');
    el.id = EMAIL_BANNER_ID;
    el.setAttribute('role', 'alert');
    el.innerHTML = '<span>Verify your email to post, message, upload, and connect.</span>';
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = 'Resend verification';
    action.addEventListener('click', function () {
      window.location.href = '/pages/auth/login.html';
    });
    el.appendChild(action);

    document.body.insertBefore(el, document.body.firstChild);
  }

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
      coverPhotoUrl: user.coverPhotoUrl || user.coverUrl || '',
      coverUrl: user.coverUrl || user.coverPhotoUrl || '',
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
      window.dispatchEvent(
        new CustomEvent('currentUserChanged', {
          detail: { user: currentUser }
        })
      );
    } catch (err) {
      console.debug("dispatch currentUserChanged failed", err);
    }

    try {
      renderEmailVerificationBanner(currentUser);
    } catch (err) {
      console.debug('renderEmailVerificationBanner failed', err);
    }
  }

  const USER_CACHE_KEY = 'spopeer_user';
  const LEGACY_USER_KEYS = ['spopeerUser', 'user'];

  function getStoredUser() {
    try {
      const canonicalRaw = localStorage.getItem(USER_CACHE_KEY);
      if (canonicalRaw) {
        return normalizeUser(JSON.parse(canonicalRaw));
      }

      // One-time compatibility migration for users who still have an older
      // cache key. The migrated value becomes the only supported cache.
      for (const legacyKey of LEGACY_USER_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (!legacyRaw) continue;

        try {
          const migrated = normalizeUser(JSON.parse(legacyRaw));
          if (migrated) {
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(migrated));
            LEGACY_USER_KEYS.forEach(key => localStorage.removeItem(key));
            return migrated;
          }
        } catch (err) {
          console.debug('CurrentUserStore: legacy user cache parse failed', err);
          localStorage.removeItem(legacyKey);
        }
      }

      return null;
    } catch (err) {
      console.debug('CurrentUserStore: getStoredUser parse failed', err);
      return null;
    }
  }

  function persistUser(user) {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      LEGACY_USER_KEYS.forEach(key => localStorage.removeItem(key));
      localStorage.setItem('spopeer_loggedIn', 'true');
      localStorage.setItem('_profileLastUpdated_', Date.now().toString());
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
      LEGACY_USER_KEYS.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('spopeer_loggedIn');
      localStorage.removeItem('_profileLastUpdated_');
    }
  }

  // The backend session is the source of truth.
  // localStorage is only a hydration/cache layer for the current user.
  function setCurrentUser(user) {
    currentUser = normalizeUser(user);
    try {
      persistUser(currentUser);
    } catch (err) {
      console.warn('Failed to persist current user:', err);
    }
    emit();
    return currentUser;
  }

  function clearCurrentUser() {
    currentUser = null;
    try {
      persistUser(null);
    } catch (err) {
      console.debug("persistUser(null) failed", err);
    }
    emit();
  }

  let _inflightRefresh = null;

  async function refreshCurrentUser() {
    // Deduplicate concurrent calls — return the in-flight promise 
    if (_inflightRefresh) return _inflightRefresh;

    _inflightRefresh = _doRefresh();
    try {
      return await _inflightRefresh;
    } finally {
      _inflightRefresh = null;
    }
  }

  async function _doRefresh() {
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
        res?.payload?.user ||
        null;
      const stored = getStoredUser() || {};
      const merged = user ? {
        ...stored,
        ...user,
        avatarUrl: user.avatarUrl || user.avatar || stored.avatarUrl || '',
        coverPhotoUrl: user.coverPhotoUrl || user.coverUrl || stored.coverPhotoUrl || '',
        coverUrl: user.coverUrl || user.coverPhotoUrl || stored.coverUrl || ''
      } : stored;

      return setCurrentUser(merged);
    } catch (err) {
      console.warn('Failed to refresh current user:', err);

      // Do not log the user out because of a transient network/server error.
      // api.js marks a definitive unauthenticated response as 401/UNAUTHORIZED;
      // only that case should invalidate the cached session. This prevents
      // refresh/navigation races from throwing the user back to Login or Feed.
      var status = Number(err && err.status || 0);
      var code = String(err && err.code || '').toUpperCase();
      var isUnauthorized = status === 401 || code === 'UNAUTHORIZED';

      if (isUnauthorized) {
        currentUser = null;
        persistUser(null);
        emit();
        return null;
      }

      currentUser = getStoredUser();
      emit();
      return currentUser;
    }
  }

  function getCurrentUser() {
    if (!currentUser) {
      currentUser = getStoredUser();
    }
    return currentUser;
  }

  function syncFromStorage() {
    const next = getStoredUser();
    const prevJson = JSON.stringify(currentUser || null);
    const nextJson = JSON.stringify(next || null);
    if (prevJson === nextJson) return;
    currentUser = next;
    emit();
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') {
      return function noop() {};
    }
    listeners.add(fn);
    return function unsubscribe() {
      listeners.delete(fn);
    };
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

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function (event) {
      if (!event) return;
      if (event.key === USER_CACHE_KEY || event.key === '_profileLastUpdated_') {
        syncFromStorage();
      }
    });
  }
})();
