(function () {
      var stored = null;
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        stored = window.CurrentUserStore.getCurrentUser();
      }
      if (!stored) {
        try { stored = null; } catch(e) { stored = null; }
      }
      var _ud = stored;
      var _li = !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
      if (!_ud || !_li) window.location.href = '/pages/auth/login.html';
    })();
