/**
 * Session Activity Tracker
 * Tracks user activity and auto-logs out after 30 minutes of inactivity
 * Also handles auto-logout on browser close
 */

(function () {
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIMEOUT_MS = 28 * 60 * 1000; // 28 minutes (warn 2 mins before logout)
  
  let inactivityTimer = null;
  let warningShown = false;
  let isMonitoring = false;

  function resetInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    warningShown = false;

    inactivityTimer = setTimeout(function () {
      handleInactivityLogout();
    }, INACTIVITY_TIMEOUT_MS);

    // Set warning timeout (2 mins before logout)
    setTimeout(function () {
      if (!warningShown) {
        showInactivityWarning();
        warningShown = true;
      }
    }, WARNING_TIMEOUT_MS);
  }

  function showInactivityWarning() {
    try {
      if (document.querySelector('.inactivity-warning')) return; // Already shown
      
      const warning = document.createElement('div');
      warning.className = 'inactivity-warning';
      warning.innerHTML = `
        <div class="inactivity-warning-content">
          <h3>Session Expiring</h3>
          <p>You've been inactive for 28 minutes. Your session will expire in 2 minutes.</p>
          <button class="inactivity-warning-btn" onclick="window.SessionActivityTracker.extendSession()">Stay Logged In</button>
          <button class="inactivity-warning-btn secondary" onclick="window.SessionActivityTracker.logout()">Logout Now</button>
        </div>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        .inactivity-warning {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .inactivity-warning-content {
          background: var(--white, #ffffff);
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .inactivity-warning-content h3 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 700;
          color: var(--ink, #111111);
        }
        .inactivity-warning-content p {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: var(--muted, #7a7a7a);
          line-height: 1.5;
        }
        .inactivity-warning-btn {
          display: inline-block;
          padding: 10px 20px;
          margin: 0 6px;
          background: var(--accent, #001f3f);
          color: var(--accent-lt, #cce7ff);
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .inactivity-warning-btn:hover {
          background: var(--accent-hover, #003366);
        }
        .inactivity-warning-btn.secondary {
          background: var(--surface, #f3f3ef);
          color: var(--muted, #7a7a7a);
        }
        .inactivity-warning-btn.secondary:hover {
          background: var(--surface-2, #eeeeea);
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(warning);
    } catch (err) {
      console.warn('Failed to show inactivity warning:', err);
    }
  }

  function handleInactivityLogout() {
    console.log('User inactive for 30 minutes, logging out...');
    logout();
  }

  function logout() {
    // Prefer SpopeerAPI.logout() so the server-side cookie is also cleared.
    if (window.SpopeerAPI && typeof window.SpopeerAPI.logout === 'function') {
      try {
        window.SpopeerAPI.logout();
        return; // SpopeerAPI.logout() handles clear + redirect
      } catch (e) { /* fall through to manual clear */ }
    }
    try {
      // Fallback: clear local storage and redirect
      localStorage.removeItem('spopeer_user');
      localStorage.removeItem('spopeerUser');
      localStorage.removeItem('user');
      localStorage.removeItem('spopeer_loggedIn');
      localStorage.removeItem('spopeer_token');
      localStorage.removeItem('spopeer_session_id');
      localStorage.removeItem('_profileLastUpdated_');

      try {
        sessionStorage.clear();
      } catch (e) {}

      window.location.href = '/pages/auth/login.html?reason=session_expired';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/pages/auth/login.html';
    }
  }

  function extendSession() {
    try {
      const warning = document.querySelector('.inactivity-warning');
      if (warning) warning.remove();
      resetInactivityTimer();
    } catch (err) {
      console.warn('Failed to extend session:', err);
    }
  }

  function startMonitoring() {
    if (isMonitoring) return;
    isMonitoring = true;

    // Activity events to track
    const activityEvents = ['mousedown', 'keydown', 'click', 'touchstart', 'mousemove'];
    
    function onActivity() {
      resetInactivityTimer();
    }

    activityEvents.forEach(function (event) {
      document.addEventListener(event, onActivity, true);
    });

    // Initial timer start
    resetInactivityTimer();

    // Handle browser close
    window.addEventListener('beforeunload', function () {
      // On browser close, clear session
      try {
        localStorage.removeItem('spopeer_session_id');
      } catch (e) {}
    });
  }

  function stopMonitoring() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    isMonitoring = false;
  }

  window.SessionActivityTracker = {
    start: startMonitoring,
    stop: stopMonitoring,
    extendSession: extendSession,
    logout: logout,
    reset: resetInactivityTimer
  };

  // Auto-start if user is logged in
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      try {
        const user = localStorage.getItem('spopeer_user') || localStorage.getItem('user');
        if (user) {
          window.SessionActivityTracker.start();
        }
      } catch (err) {
        console.debug('SessionActivityTracker auto-start debug:', err);
      }
    });

    // Also check on page visibility change
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        window.SessionActivityTracker.stop();
      } else {
        try {
          const user = localStorage.getItem('spopeer_user') || localStorage.getItem('user');
          if (user) {
            window.SessionActivityTracker.start();
          }
        } catch (err) {
          console.debug('SessionActivityTracker visibility change debug:', err);
        }
      }
    });
  }
})();
