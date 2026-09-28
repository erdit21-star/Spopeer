var _ud = (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') ? window.CurrentUserStore.getCurrentUser() : null;
var _li = !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
var _isAdmin = !!_ud && ((_ud.userType === 'admin') || (_ud.role === 'admin') || (_ud.isAdmin === true));
if (!_ud || !_li || !_isAdmin) window.location.href = '/pages/auth/login.html';
