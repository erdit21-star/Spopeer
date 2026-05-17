var _ud = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('spopeerUser') || localStorage.getItem('user') || 'null');
    var _li = localStorage.getItem('spopeer_loggedIn') === 'true' || !!_ud || !!(localStorage.getItem('spopeer_token') || localStorage.getItem('spopeerToken') || localStorage.getItem('token'));
    if (!_ud || !_li) window.location.href = '/pages/auth/login.html';
