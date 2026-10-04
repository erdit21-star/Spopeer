async function handleGoogleCredential(response) {
  var errorBox = document.getElementById('loginError');
  if (errorBox) errorBox.style.display = 'none';

  try {
    if (!response || !response.credential) {
      throw new Error('Google did not return a valid sign-in credential. Please try again.');
    }

    // Establish the CSRF cookie before posting the Google credential.
    await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });

    var csrfMatch = document.cookie.match(/(?:^|;\\s*)csrf_token=([^;]+)/);
    var headers = { 'Content-Type': 'application/json' };
    if (csrfMatch && csrfMatch[1]) headers['X-CSRF-Token'] = decodeURIComponent(csrfMatch[1]);

    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: headers,
      body: JSON.stringify({ credential: response.credential })
    });

    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      const errMsg = (data.error && data.error.message) || data.message || 'Google sign-in failed (' + res.status + ').';
      console.error('[Google Auth] Server rejected sign-in:', data);
      throw new Error(errMsg);
    }

    var userData = (data.data && data.data.user) || data.user || null;
    if (!userData && window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
      var me = await window.SpopeerAPI.me();
      userData = (me && (me.user || (me.data && me.data.user) || me.payload || (me.payload && me.payload.user))) || null;
    }
    if (!userData) {
      throw new Error('Google sign-in completed, but your account could not be loaded. Please try again.');
    }

    if (!window.Auth || typeof window.Auth.login !== 'function') {
      throw new Error('Your session could not be initialized. Please refresh and try again.');
    }
    window.Auth.login(userData);
    window.location.replace('/feed.html?loginAt=' + Date.now());
  } catch (err) {
    console.error('[Google Auth]', err);
    if (errorBox) {
      errorBox.textContent = (err && err.message) || 'Google sign-in failed. Please try email/password.';
      errorBox.style.display = 'block';
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.alert('Google sign-in error: ' + ((err && err.message) || 'Unknown error'));
    }
  }
}
