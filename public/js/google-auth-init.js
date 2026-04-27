// google-auth-init.js
// Centralizes Google button event binding for CSP compliance

document.addEventListener('DOMContentLoaded', function () {
  // Signup page
  var signupGoogleBtn = document.getElementById('signupGoogleBtn');
  if (signupGoogleBtn && window.google && window.google.accounts && window.google.accounts.id) {
    signupGoogleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.google.accounts.id.prompt();
    });
  }

  // Login page
  var loginGoogleBtn = document.getElementById('loginGoogleBtn');
  if (loginGoogleBtn && window.google && window.google.accounts && window.google.accounts.id) {
    loginGoogleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.google.accounts.id.prompt();
    });
  }

  // Login-modern page
  var loginModernGoogleBtn = document.getElementById('loginModernGoogleBtn');
  if (loginModernGoogleBtn && window.google && window.google.accounts && window.google.accounts.id) {
    loginModernGoogleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.google.accounts.id.prompt();
    });
  }
});
