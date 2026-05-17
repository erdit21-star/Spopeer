(function(){
      var ud = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('spopeerUser') || localStorage.getItem('user') || 'null');
      var li = localStorage.getItem('spopeer_loggedIn') === 'true' || !!ud;
      if (!ud || !li) { window.location.replace('../../pages/auth/login.html'); return; }
      if (!ud.userType || ud.userType !== 'athlete') {
        ud.userType = 'athlete';
        localStorage.setItem('spopeer_user', JSON.stringify(ud));
      }
      window.location.replace('edit-profile.html?role=athlete&onboarding=1');
    })();
