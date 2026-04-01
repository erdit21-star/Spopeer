(function () {
  'use strict';

  function isAuthenticated() {
    var user = localStorage.getItem('spopeer_user');
    var token = localStorage.getItem('spopeer_token');
    var loggedIn = localStorage.getItem('spopeer_loggedIn') === 'true';
    return Boolean(user) && Boolean(token || loggedIn);
  }

  function ensureAuthenticated(loginPath) {
    if (!isAuthenticated()) {
      window.location.href = loginPath;
      return false;
    }
    return true;
  }

  function attachCameraFallback(buttonSelector, fileInputSelector, statusSelector) {
    var button = document.querySelector(buttonSelector);
    var fileInput = document.querySelector(fileInputSelector);
    var status = statusSelector ? document.querySelector(statusSelector) : null;
    if (!button || !fileInput) {
      return;
    }

    button.addEventListener('click', function () {
      if (status) {
        status.textContent = 'Camera capture is not available in this build. Choose a file instead.';
        status.hidden = false;
      }
      fileInput.click();
    });
  }

  function wireDeactivateAccount(buttonSelector, statusSelector) {
    var button = document.querySelector(buttonSelector);
    var status = statusSelector ? document.querySelector(statusSelector) : null;
    if (!button) {
      return;
    }

    button.addEventListener('click', function () {
      var confirmed = window.confirm('Deactivate your account? Your profile will be hidden until you sign in again.');
      if (!confirmed) {
        return;
      }
      localStorage.setItem('spopeer_account_status', 'deactivated');
      if (status) {
        status.textContent = 'Account marked as deactivated locally. Sign in again to reactivate it.';
        status.hidden = false;
      }
    });
  }

  window.profileRuntime = {
    ensureAuthenticated: ensureAuthenticated,
    attachCameraFallback: attachCameraFallback,
    wireDeactivateAccount: wireDeactivateAccount
  };
})();
