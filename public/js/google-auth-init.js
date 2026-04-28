// google-auth-init.js
// Centralizes Google button event binding for CSP compliance

document.addEventListener('DOMContentLoaded', function () {
  var ids = ['signupGoogleBtn', 'loginGoogleBtn', 'loginModernGoogleBtn'];
  ids.forEach(function (id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      // Check at click-time — GSI async script will have loaded long before a user clicks
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.prompt();
      }
    });
  });
});

