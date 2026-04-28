// google-auth-init.js
// Centralizes Google button event binding for CSP compliance

function _attachGoogleBtns() {
  var ids = ['signupGoogleBtn', 'loginGoogleBtn', 'loginModernGoogleBtn'];
  ids.forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn && !btn.dataset.googleBound) {
      btn.dataset.googleBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        window.google.accounts.id.prompt();
      });
    }
  });
}

// Called by the GSI library when it has fully loaded (async-safe)
window.onGoogleLibraryLoad = function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _attachGoogleBtns);
  } else {
    _attachGoogleBtns();
  }
};

// Fallback: if GSI loaded before this script ran (e.g. cached), bind on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    _attachGoogleBtns();
  }
});
