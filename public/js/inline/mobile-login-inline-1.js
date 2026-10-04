function getCookieValue(name) {
  var match = document.cookie.match(new RegExp('(^|;\\s*)' + name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

let _mobileGoogleClientId = null;
let _mobileGoogleInitPromise = null;
let _mobileGoogleRendered = false;

async function getMobileGoogleClientId() {
  if (typeof _mobileGoogleClientId === 'string') return _mobileGoogleClientId;

  try {
    const res = await fetch('/api/auth/google-config', { credentials: 'include' });
    const payload = await res.json().catch(function () { return {}; });
    const data = (payload && payload.data) || payload || {};
    _mobileGoogleClientId = String(data.clientId || '').trim();
  } catch (_err) {
    _mobileGoogleClientId = '';
  }

  return _mobileGoogleClientId;
}

async function postGoogleCredential(credential) {
  await fetch('/api/auth/csrf', { method: 'GET', credentials: 'include' }).catch(function () {});
  var csrf = getCookieValue('csrf_token');
  var headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return fetch('/api/auth/google', {
    method: 'POST',
    credentials: 'include',
    headers: headers,
    body: JSON.stringify({ credential: credential })
  });
}

function completeAuthNavigation(path) {
  var params = new URLSearchParams(window.location.search || '');
  var requestedPath = params.get('next') || params.get('redirect') || path || '/feed.html';
  var targetPath = (window.SpopeerAPI && typeof window.SpopeerAPI.getSafeNextPath === 'function')
    ? window.SpopeerAPI.getSafeNextPath(requestedPath, '/feed.html')
    : (String(requestedPath || '/feed.html').charAt(0) === '/' ? String(requestedPath) : '/feed.html');
  var lower = String(targetPath || '').toLowerCase();
  if (lower.indexOf('/api/') === 0 || lower.indexOf('/pages/auth/login.html') === 0 || lower.indexOf('/pages/auth/signup.html') === 0) {
    targetPath = '/feed.html';
  }
  try { localStorage.setItem('spopeer_google_auth_complete', String(Date.now())); } catch (_error) { /* ignore storage failures */ }
  var sep = targetPath.indexOf('?') === -1 ? '?' : '&';
  window.location.replace(targetPath + sep + 'loginAt=' + Date.now());
}

async function handleGoogleCredential(response) {
  const errBox = document.getElementById('loginError');
  if (errBox) errBox.style.display = 'none';

  try {
    if (!response || !response.credential) {
      throw new Error('Google did not return a valid credential. Please try again.');
    }

    const res = await postGoogleCredential(response.credential);
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      const errMsg = (data && data.error && data.error.message) || data.error || 'Google sign-in failed.';
      throw new Error(errMsg);
    }

    let userData = (data.data && data.data.user) || data.user || null;

    if (!userData && window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
      const me = await window.SpopeerAPI.me();
      userData = (me && (me.user || (me.data && me.data.user) || me.payload || (me.payload && me.payload.user))) || null;
    }

    if (!userData) {
      throw new Error('Google sign-in finished, but your profile could not be loaded. Please try again.');
    }

    if (window.Auth) window.Auth.login(userData);
    completeAuthNavigation('/feed.html');
  } catch (err) {
    if (errBox) {
      errBox.textContent = (err && err.message) || 'Google sign-in failed. Please try again.';
      errBox.style.display = 'block';
    }
  }
}

async function initGoogleLoginButton() {
  var errBox = document.getElementById('loginError');
  var host = document.getElementById('loginGoogleButton');
  if (!host || _mobileGoogleRendered) return _mobileGoogleRendered;
  if (_mobileGoogleInitPromise) return _mobileGoogleInitPromise;

  _mobileGoogleInitPromise = (async function () {
    var clientId = await getMobileGoogleClientId();
    if (!clientId) {
      if (errBox) {
        errBox.textContent = 'Google sign-in is not configured for this environment. Please use email login for now.';
        errBox.style.display = 'block';
      }
      return false;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      return false;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      var width = Math.floor(host.getBoundingClientRect().width || host.clientWidth || 320);
      width = Math.max(240, Math.min(440, width));
      host.innerHTML = '';
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: width,
        logo_alignment: 'left'
      });

      _mobileGoogleRendered = true;
      if (errBox) errBox.style.display = 'none';
      return true;
    } catch (error) {
      if (errBox) {
        errBox.textContent = 'Google sign-in could not be displayed. Please refresh and try again, or use email login.';
        errBox.style.display = 'block';
      }
      console.error('[Mobile Google Sign-In] Initialization failed:', error);
      return false;
    }
  })();

  try {
    return await _mobileGoogleInitPromise;
  } finally {
    _mobileGoogleInitPromise = null;
  }
}

function waitForGoogleLoginLibrary() {
  var attempts = 0;
  var maxAttempts = 40;
  var timer = window.setInterval(async function () {
    attempts += 1;
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.clearInterval(timer);
      await initGoogleLoginButton();
      return;
    }
    if (attempts >= maxAttempts) {
      window.clearInterval(timer);
      var errBox = document.getElementById('loginError');
      if (errBox) {
        errBox.textContent = 'Google sign-in is unavailable on this browser. You can still log in with email.';
        errBox.style.display = 'block';
      }
    }
  }, 250);
}

document.getElementById('loginBtn').onclick = async function() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
  if (!email || !password) { errBox.textContent = 'Please enter your email and password.'; errBox.style.display = 'block'; return; }
  try {
    const params = new URLSearchParams(window.location.search || '');
    const requestedPath = params.get('next') || params.get('redirect') || '/feed.html';
    const nextTarget = (window.SpopeerAPI && typeof window.SpopeerAPI.getSafeNextPath === 'function')
      ? window.SpopeerAPI.getSafeNextPath(requestedPath, '/feed.html')
      : (String(requestedPath || '/feed.html').charAt(0) === '/' ? String(requestedPath) : '/feed.html');
    const res = await window.SpopeerAPI.login({ email, password });
    const user = (res.data && res.data.user) || res.user || null;
    if (user && window.Auth) window.Auth.login(user);
    const lower = String(nextTarget || '').toLowerCase();
    const safeTarget = (lower.indexOf('/api/') === 0 || lower.indexOf('/pages/auth/login.html') === 0 || lower.indexOf('/pages/auth/signup.html') === 0)
      ? '/feed.html'
      : nextTarget;
    const sep = safeTarget.indexOf('?') === -1 ? '?' : '&';
    window.location.replace(safeTarget + sep + 'loginAt=' + Date.now());
  } catch(e) {
    errBox.textContent = (e && e.message) || 'Login failed. Check your credentials.';
    errBox.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', function () {
  initGoogleLoginButton().then(function (ready) {
    if (!ready) waitForGoogleLoginLibrary();
  });
});
