var _ud = (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') ? window.CurrentUserStore.getCurrentUser() : null;
var _li = !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
if (!_ud || !_li) window.location.href = '/pages/auth/login.html';
