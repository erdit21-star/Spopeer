(function(){
  var ud = (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') ? window.CurrentUserStore.getCurrentUser() : null;
  var li = !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
  if (!ud || !li) { window.location.replace('../../pages/auth/login.html'); return; }
  if (!ud.userType || ud.userType !== 'coach') {
    if (window.SpopeerAPI && typeof window.SpopeerAPI.updateProfile === 'function') {
      window.SpopeerAPI.updateProfile({ userType: 'coach' }).then(function(result){
        var saved = result && result.data && (result.data.user || result.data.payload);
        if (saved && window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') window.CurrentUserStore.setCurrentUser(saved);
      }).catch(function(err){ console.debug('Profile role bootstrap save failed', err); });
    }
  }
  window.location.replace('edit-profile.html?role=coach&onboarding=1');
})();
