// google-auth-init.js
// Centralizes Google Sign-In initialization and button binding for CSP compliance

function _initGoogleSignIn() {
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
        window.google.accounts.id.prompt();
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    // GSI already loaded (e.g. cached) — initialize now
    _initGoogleSignIn();
  } else {
    // GSI hasn't loaded yet — initialize once it does
    window.onGoogleLibraryLoad = _initGoogleSignIn;
  }
});

