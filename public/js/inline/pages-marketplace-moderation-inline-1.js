var _ud = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('spopeerUser') || localStorage.getItem('user') || 'null');
    var _li = localStorage.getItem('spopeer_loggedIn') === 'true' || !!_ud || !!(localStorage.getItem('spopeer_token') || localStorage.getItem('spopeerToken') || localStorage.getItem('token'));
    var _isAdmin = !!_ud && ((_ud.userType === 'admin') || (_ud.role === 'admin') || (_ud.isAdmin === true));
    if (!_ud || !_li || !_isAdmin) window.location.href = '/pages/auth/login.html';
