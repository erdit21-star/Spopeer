// Updated
(function () {
  'use strict';

  function isAuthenticated() {
    try {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function') {
        return window.CurrentUserStore.isLoggedIn();
      }
    } catch (err) {
      console.debug("CurrentUserStore.isLoggedIn failed in profile-runtime", err);
    }
    var loggedIn = localStorage.getItem('spopeer_loggedIn') === 'true';
    var user = localStorage.getItem('spopeer_user');
    return loggedIn && Boolean(user);
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
      var confirmed = window.confirm('Deactivate your account? Your profile will be hidden until you log in again.');
      if (!confirmed) {
        return;
      }
      localStorage.setItem('spopeer_account_status', 'deactivated');
      if (status) {
        status.textContent = 'Account marked as deactivated locally. Log in again to reactivate it.';
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
