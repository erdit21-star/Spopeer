// google-auth-init.js
// Centralizes Google Sign-In initialization and button binding for CSP compliance
(function () {
  'use strict';

  var googlePromptInFlight = false;

  function showGoogleFallbackError(message) {
    var text = message || 'Google sign-in could not open on this browser. Allow pop-ups and try again, or use email/password.';
    var box = document.getElementById('loginError') || document.getElementById('signupError');
    if (!box) {
      window.alert(text);
      return;
    }
    box.textContent = text;
    box.style.display = 'block';
  }

  function requestGooglePrompt() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      showGoogleFallbackError('Google sign-in is still loading. Please wait a moment and try again.');
      return;
    }
    if (googlePromptInFlight) return;

    googlePromptInFlight = true;
    try {
      window.google.accounts.id.prompt(function (notification) {
        googlePromptInFlight = false;

        var isNotDisplayed = notification && typeof notification.isNotDisplayed === 'function' && notification.isNotDisplayed();
        var isSkipped = notification && typeof notification.isSkippedMoment === 'function' && notification.isSkippedMoment();
        var notDisplayedReason = notification && typeof notification.getNotDisplayedReason === 'function'
          ? notification.getNotDisplayedReason()
          : '';
        var skippedReason = notification && typeof notification.getSkippedReason === 'function'
          ? notification.getSkippedReason()
          : '';

        // Avoid false alarms for expected One Tap skip moments.
        var hardBlocked = isNotDisplayed && [
          'browser_not_supported',
          'invalid_client',
          'missing_client_id',
          'opt_out_or_no_session',
          'secure_http_required',
          'suppressed_by_user',
          'unregistered_origin'
        ].indexOf(notDisplayedReason) !== -1;
        var hardSkipped = isSkipped && skippedReason === 'tap_outside';

        if (hardBlocked || hardSkipped) {
          showGoogleFallbackError('Google sign-in was blocked or unavailable in this browser. Please allow pop-ups and retry, or use email/password.');
        }
      });
    } catch (error) {
      googlePromptInFlight = false;
      showGoogleFallbackError('Google sign-in could not start. Please try again or use email/password.');
    }
  }

  function initGoogleSignIn() {
    var onloadDiv = document.getElementById('g_id_onload');
    if (!onloadDiv) return;

    var clientId = onloadDiv.getAttribute('data-client_id');
    var callbackName = onloadDiv.getAttribute('data-callback');
    // By the time this runs (DOMContentLoaded), all inline scripts have executed,
    // so the callback function is guaranteed to be on window.
    var callback = window[callbackName];
    if (!clientId || !callback) return;

    // Explicitly initialize — overrides any earlier auto-init by the async GSI script
    // that may have run before the callback function was defined.
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: callback
    });

    // Bind click handlers to all Google buttons on this page
    ['loginGoogleBtn', 'signupGoogleBtn', 'loginModernGoogleBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          requestGooglePrompt();
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      // GSI already loaded (e.g. cached) — initialize now
      initGoogleSignIn();
    } else {
      // GSI hasn't loaded yet — initialize once it does
      window.onGoogleLibraryLoad = initGoogleSignIn;
    }
  });
})();

