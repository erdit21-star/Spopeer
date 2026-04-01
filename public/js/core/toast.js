/**
 * Spopeer Shared Toast / Notification
 *
 * Replaces the duplicated notification logic in:
 *   - api.js  (showNotification)
 *   - main.js (showNotification + showToast)
 *   - inline alert() calls
 *
 * Usage:
 *   window.SpopeerToast.show('Saved!');                       // info, 3 s
 *   window.SpopeerToast.show('Deleted', 'error');             // error, 8 s
 *   window.SpopeerToast.show('Done', 'success', 5000);       // success, 5 s
 *   window.SpopeerToast.success('Profile updated');
 *   window.SpopeerToast.error('Something went wrong');
 *   window.SpopeerToast.warning('Slow connection');
 *
 * Requires: /css/components/toast.css loaded on the page.
 */
(function () {
  'use strict';

  var DEFAULTS = {
    info:    3000,
    success: 3000,
    error:   8000,
    warning: 8000,
  };

  function show(message, type, duration) {
    var tone = type || 'info';
    var timeout =
      typeof duration === 'number'
        ? duration
        : DEFAULTS[tone] || 3000;

    // Remove any existing toast so they don't stack
    var prev = document.querySelector('.sp-toast');
    if (prev) prev.remove();

    var el = document.createElement('div');
    el.className = 'sp-toast sp-toast-' + tone;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = message;
    document.body.appendChild(el);

    if (timeout > 0) {
      setTimeout(function () {
        el.classList.add('sp-toast-exit');
        setTimeout(function () { el.remove(); }, 350);
      }, timeout);
    }

    return el;
  }

  window.SpopeerToast = {
    show:    show,
    success: function (msg, dur) { return show(msg, 'success', dur); },
    error:   function (msg, dur) { return show(msg, 'error',   dur); },
    warning: function (msg, dur) { return show(msg, 'warning', dur); },
    info:    function (msg, dur) { return show(msg, 'info',    dur); },
  };
})();
