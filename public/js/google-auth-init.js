// Google Identity Services button initialization for login and signup.
(function () {
  'use strict';

  var initialized = false;
  var initializing = false;

  function errorBox() {
    return document.getElementById('loginError') || document.getElementById('signupError');
  }

  function showGoogleError(message) {
    var box = errorBox();
    if (box) {
      box.textContent = message || 'Google sign-in is unavailable. Please use email and password.';
      box.style.display = 'block';
    }
  }

  function showFallback(host, message) {
    if (!host) return;
    host.innerHTML = '<button type="button" class="google-btn google-btn-loading" disabled><span class="google-loading-mark">G</span><span>' +
      String(message || 'Google sign-in unavailable') + '</span></button>';
  }

  async function loadGoogleConfig() {
    var response = await fetch('/api/auth/google-config', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error('Google configuration request failed (' + response.status + ').');
    var payload = await response.json();
    var data = (payload && payload.data) || payload || {};
    if (!data.enabled || !data.clientId) throw new Error('Google sign-in is not configured on the server.');
    return String(data.clientId);
  }

  async function initGoogleSignIn() {
    var host = document.getElementById('loginGoogleBtn') || document.getElementById('signupGoogleBtn') || document.getElementById('loginModernGoogleBtn');
    if (!host || initialized || initializing) return;
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return;

    var callbackName = 'handleGoogleCredential';
    var callback = window[callbackName];
    if (typeof callback !== 'function') {
      showFallback(host, 'Google sign-in is loading…');
      showGoogleError('Google sign-in could not initialize. Please refresh the page.');
      return;
    }

    initializing = true;
    try {
      var clientId = await loadGoogleConfig();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: callback,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true
      });

      var width = Math.floor(host.getBoundingClientRect().width || host.clientWidth || 320);
      width = Math.max(240, Math.min(400, width));
      host.innerHTML = '';
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rect',
        logo_alignment: 'left',
        width: width
      });
      host.setAttribute('data-google-ready', 'true');
      initialized = true;
      var box = errorBox();
      if (box) box.style.display = 'none';
    } catch (error) {
      console.error('[Google Auth] Initialization failed:', error);
      showFallback(host, 'Google sign-in unavailable');
      showGoogleError((error && error.message) || 'Google sign-in could not initialize. Please use email/password.');
    } finally {
      initializing = false;
    }
  }

  function waitForGoogleLibrary() {
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.clearInterval(timer);
        initGoogleSignIn();
      } else if (attempts >= 40) {
        window.clearInterval(timer);
        var host = document.getElementById('loginGoogleBtn') || document.getElementById('signupGoogleBtn') || document.getElementById('loginModernGoogleBtn');
        showFallback(host, 'Google sign-in unavailable');
        showGoogleError('Google sign-in could not load in this browser. Please use email and password.');
      }
    }, 250);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      initGoogleSignIn();
    } else {
      waitForGoogleLibrary();
    }
  });
})();
