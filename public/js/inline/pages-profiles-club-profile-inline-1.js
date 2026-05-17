(function(){
      var ud = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('spopeerUser') || localStorage.getItem('user') || 'null');
      var li = localStorage.getItem('spopeer_loggedIn') === 'true' || !!ud || !!(localStorage.getItem('spopeer_token') || localStorage.getItem('spopeerToken') || localStorage.getItem('token'));
      if (!ud || !li) { window.location.replace('../../pages/auth/login.html'); return; }
      if (!ud.userType || ud.userType !== 'club') {
        ud.userType = 'club';
        localStorage.setItem('spopeer_user', JSON.stringify(ud));
      }
      window.location.replace('edit-profile.html?role=club&onboarding=1');
    })();
