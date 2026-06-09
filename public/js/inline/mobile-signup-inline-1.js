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
  var requestedPath = params.get('next') || params.get('redirect') || path || '/feed.html';
  var targetPath = (window.SpopeerAPI && typeof window.SpopeerAPI.getSafeNextPath === 'function')
    ? window.SpopeerAPI.getSafeNextPath(requestedPath, '/feed.html')
    : (String(requestedPath || '/feed.html').charAt(0) === '/' ? String(requestedPath) : '/feed.html');
  // Mobile browsers are unreliable with opener/popup close flows.
  // Always navigate the current tab to avoid ending on a blank white page.
  try { localStorage.setItem('spopeer_google_auth_complete', String(Date.now())); } catch (_error) { /* ignore storage failures */ }
  window.location.assign(targetPath);
}

function setMessage(elId, msg) {
  var el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

async function handleGoogleCredential(response) {
  setMessage('signupError', '');
  setMessage('msSuccess', '');
  try {
    if (!response || !response.credential) {
      throw new Error('Google did not return a valid credential. Please try again.');
    }

    const res = await postGoogleCredential(response.credential);
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      const errMsg = (data && data.error && data.error.message) || data.error || 'Google sign-up failed.';
      throw new Error(errMsg);
    }

    let userData = (data.data && data.data.user) || data.user || null;
    const accessToken = (data.data && data.data.accessToken) || data.token;

    if (!userData && window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
      const me = await window.SpopeerAPI.me();
      userData = (me && (me.user || (me.data && me.data.user) || me.payload || (me.payload && me.payload.user))) || null;
    }

    if (!userData) throw new Error('Google sign-up finished, but profile could not be loaded.');
    if (window.Auth) window.Auth.login(userData);
    completeAuthNavigation('/feed.html');
  } catch (err) {
    setMessage('signupError', (err && err.message) || 'Google sign-up failed. Please try email signup.');
  }
}

function initGoogleSignupButton() {
  var host = document.getElementById('signupGoogleButton');
  if (!host) return;

  async function wire() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return false;

    var clientId = await getMobileGoogleClientId();
    if (!clientId) {
      setMessage('signupError', 'Google sign-up is not configured for this environment. Please use email signup for now.');
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

    try {
      window.google.accounts.id.prompt(function (notification) {
        var isNotDisplayed = notification && typeof notification.isNotDisplayed === 'function' && notification.isNotDisplayed();
        var reason = notification && typeof notification.getNotDisplayedReason === 'function'
          ? notification.getNotDisplayedReason()
          : '';
        if (isNotDisplayed && reason === 'unregistered_origin') {
          setMessage('signupError', 'Google sign-up is blocked: this domain is not authorized in Google OAuth settings.');
        }
      });
    } catch (_err) { /* ignore prompt observer errors */ }

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
          setMessage('signupError', 'Google sign-up is unavailable on this browser. Please use email sign-up.');
        }
      }
    });
  }, 250);

  window.addEventListener('load', function () {
    wire().catch(function () {});
  }, { once: true });
}

document.getElementById('signupBtn').onclick = async function() {
  setMessage('signupError', '');
  setMessage('msSuccess', '');
  var payload = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
    setMessage('signupError', 'Please fill all fields.');
    return;
  }

  try {
    const result = await window.SpopeerAPI.signup(payload);
    const user = (result.data && result.data.user) || result.user || null;
    if (user && window.Auth) {
      window.Auth.login(user);
      window.location.assign('/feed.html');
      return;
    }
    setMessage('msSuccess', 'Account created. Please check your email to verify, then log in.');
  } catch (e) {
    setMessage('signupError', (e && e.message) || 'Signup failed.');
  }
};

document.addEventListener('DOMContentLoaded', initGoogleSignupButton);
