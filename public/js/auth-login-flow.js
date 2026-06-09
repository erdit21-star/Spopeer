(function () {
  'use strict';

  function resolveSafeNext(rawValue, fallbackPath) {
    var fallback = fallbackPath || '/feed.html';
    if (window.SpopeerAPI && typeof window.SpopeerAPI.getSafeNextPath === 'function') {
      var viaApi = window.SpopeerAPI.getSafeNextPath(rawValue, fallback);
      if (isUnsafePostLoginPath(viaApi)) return fallback;
      return viaApi;
    }

    var raw = String(rawValue || '').trim();
    if (!raw) return fallback;
    if (raw.indexOf('http://') === 0 || raw.indexOf('https://') === 0 || raw.indexOf('//') === 0) {
      return fallback;
    }
    var normalized = raw.charAt(0) === '/' ? raw : '/' + raw;
    return isUnsafePostLoginPath(normalized) ? fallback : normalized;
  }

  function isUnsafePostLoginPath(pathname) {
    var path = String(pathname || '').toLowerCase();
    if (!path || path === '/') return false;
    if (path.indexOf('/api/') === 0) return true;
    if (path.indexOf('/socket.io/') === 0) return true;
    if (path.indexOf('/pages/auth/login.html') === 0) return true;
    if (path.indexOf('/pages/auth/signup.html') === 0) return true;
    return false;
  }

  function navigateAfterLogin(targetPath) {
    var target = String(targetPath || '/feed.html');
    var sep = target.indexOf('?') === -1 ? '?' : '&';
    var href = target + sep + 'loginAt=' + Date.now();
    window.location.replace(href);
  }

  function readNextFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return params.get('next') || params.get('redirect') || '';
    } catch (_err) {
      return '';
    }
  }

  function setError(errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message || '';
    errorEl.style.display = message ? 'block' : 'none';
  }

  async function loginWithEmail(options) {
    var config = options || {};
    var email = String(config.email || '').trim();
    var password = String(config.password || '');
    var submitButton = config.submitButton || null;
    var errorEl = config.errorEl || null;
    var fallbackTarget = config.fallbackTarget || '/feed.html';
    var nextRaw = config.nextRaw || readNextFromUrl();
    var loadingText = config.loadingText || 'Signing in...';
    var idleText = config.idleText || (submitButton ? submitButton.textContent : 'Log In');

    setError(errorEl, '');

    if (!email || !password) {
      setError(errorEl, 'Please fill in both email and password.');
      return { ok: false, reason: 'validation' };
    }

    if (!window.SpopeerAPI || typeof window.SpopeerAPI.login !== 'function') {
      setError(errorEl, 'Login service is unavailable. Please refresh and try again.');
      return { ok: false, reason: 'api-missing' };
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = loadingText;
    }

    try {
      var result = await window.SpopeerAPI.login({ email: email, password: password });
      var user = (result && result.data && result.data.user) || (result && result.user) || null;
      if (user && window.Auth && typeof window.Auth.login === 'function') {
        window.Auth.login(user);
      }

      var nextTarget = resolveSafeNext(nextRaw, fallbackTarget);
      navigateAfterLogin(nextTarget);
      return { ok: true, target: nextTarget };
    } catch (err) {
      setError(errorEl, (err && err.message) || 'Login failed.');
      return { ok: false, reason: 'request', error: err };
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = idleText;
      }
    }
  }

  window.SpopeerAuthFlow = {
    loginWithEmail: loginWithEmail,
    resolveSafeNext: resolveSafeNext
  };
})();
