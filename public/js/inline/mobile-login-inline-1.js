function getCookieValue(name) {
  var match = document.cookie.match(new RegExp('(^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

let _mobileGoogleClientId = null;

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
  var requestedPath = params.get('next') || params.get('redirect') || path || '/mobile.html';
  var targetPath = (window.SpopeerAPI && typeof window.SpopeerAPI.getSafeNextPath === 'function')
    ? window.SpopeerAPI.getSafeNextPath(requestedPath, '/mobile.html')
    : (String(requestedPath || '/mobile.html').charAt(0) === '/' ? String(requestedPath) : '/mobile.html');
  // Mobile browsers are unreliable with opener/popup close flows.
  // Always navigate the current tab to avoid ending on a blank white page.
  try { localStorage.setItem('spopeer_google_auth_complete', String(Date.now())); } catch (_error) {}
  window.location.assign(targetPath);
}

async function handleGoogleCredential(response) {
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
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
    const accessToken = (data.data && data.data.accessToken) || data.token;

    if (!userData && window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
      const me = await window.SpopeerAPI.me();
      userData = (me && (me.user || (me.data && me.data.user) || me.payload || (me.payload && me.payload.user))) || null;
    }

    if (!userData) {
      throw new Error('Google sign-in finished, but your profile could not be loaded. Please try again.');
    }

    if (window.Auth) window.Auth.login(userData);
    completeAuthNavigation('/mobile.html');
  } catch (err) {
    errBox.textContent = (err && err.message) || 'Google sign-in failed. Please try again.';
    errBox.style.display = 'block';
  }
}

function initGoogleLoginButton() {
  var errBox = document.getElementById('loginError');
  var host = document.getElementById('loginGoogleButton');
  if (!host) return;

  async function wire() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return false;

    var clientId = await getMobileGoogleClientId();
    if (!clientId) {
      errBox.textContent = 'Google sign-in is not configured for this environment. Please use email login for now.';
      errBox.style.display = 'block';
      return false;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential
    });
    host.innerHTML = '';
    window.google.accounts.id.renderButton(host, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: Math.max(260, Math.min(440, host.clientWidth || 320))
    });

    // Surface setup issues (e.g. unauthorized origin) with a user-facing message.
    try {
      window.google.accounts.id.prompt(function (notification) {
        var isNotDisplayed = notification && typeof notification.isNotDisplayed === 'function' && notification.isNotDisplayed();
        var reason = notification && typeof notification.getNotDisplayedReason === 'function'
          ? notification.getNotDisplayedReason()
          : '';
        if (isNotDisplayed && reason === 'unregistered_origin') {
          errBox.textContent = 'Google sign-in is blocked: this domain is not authorized in Google OAuth settings.';
          errBox.style.display = 'block';
        }
      });
    } catch (_err) {}

    return true;
  }

  wire().then(function (ok) {
    if (ok) return;
  });

  var attempts = 0;
  var timer = window.setInterval(function () {
    attempts += 1;
    wire().then(function (ok) {
      if (ok || attempts > 80) {
        window.clearInterval(timer);
        if (!ok && attempts > 80) {
          errBox.textContent = 'Google sign-in is unavailable on this browser. You can still log in with email.';
          errBox.style.display = 'block';
        }
      }
    });
  }, 250);

  window.addEventListener('load', function () {
    wire().catch(function () {});
  }, { once: true });
}

document.getElementById('loginBtn').onclick = async function() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
  if (!email || !password) { errBox.textContent = 'Please enter your email and password.'; errBox.style.display = 'block'; return; }
  try {
    const params = new URLSearchParams(window.location.search || '');
    const requestedPath = params.get('next') || params.get('redirect') || '/mobile.html';
    const nextTarget = (window.SpopeerAPI && typeof window.SpopeerAPI.getSafeNextPath === 'function')
      ? window.SpopeerAPI.getSafeNextPath(requestedPath, '/mobile.html')
      : (String(requestedPath || '/mobile.html').charAt(0) === '/' ? String(requestedPath) : '/mobile.html');
    const res = await window.SpopeerAPI.login({ email, password });
    const user = (res.data && res.data.user) || res.user || null;
    if (user && window.Auth) window.Auth.login(user);
    window.location.assign(nextTarget);
  } catch(e) {
    errBox.textContent = (e && e.message) || 'Login failed. Check your credentials.';
    errBox.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', initGoogleLoginButton);
