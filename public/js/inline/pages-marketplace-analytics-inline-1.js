(function () {
      var stored = null;
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        stored = window.CurrentUserStore.getCurrentUser();
      }
      if (!stored) {
        try { stored = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('spopeerUser') || localStorage.getItem('user') || 'null'); } catch(e) { stored = null; }
      }
      var _ud = stored;
      var _li = !!_ud || localStorage.getItem('spopeer_loggedIn') === 'true' || !!(localStorage.getItem('spopeer_token') || localStorage.getItem('spopeerToken') || localStorage.getItem('token'));
      if (!_ud || !_li) window.location.href = '/pages/auth/login.html';
    })();
