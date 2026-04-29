// Updated
const Auth = {
  tokenKey: "spopeer_token",
  userKey: "spopeer_user",

  isLoggedIn() {
    return localStorage.getItem("spopeer_loggedIn") === "true" && !!localStorage.getItem(this.userKey);
  },

  getToken() {
    return null; // Auth is now cookie-based — no client-side token
  },

  getUser() {
    try {
      const raw =
        localStorage.getItem(this.userKey) ||
        localStorage.getItem("user") ||
        "{}";
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  clearSessionCacheData() {
    [
      "spopeer_user_posts",
      "spopeer_saved_posts",
      "spopeer_followed_users",
      "spopeer_viewed_24h",
      "spopeer_notifications",
      "spopeer_feed_cache",
      "spopeer_stories",
      "spopeer_drafts",
      "spopeer_reactions",
      "spopeer_bookmarks",
      "spopeer_search_history",
      "spopeer_recent_profiles"
    ].forEach((key) => localStorage.removeItem(key));

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("spopeer_profile_cache_")) {
        localStorage.removeItem(key);
      }
    });
  },

  normalizeUserForSession(user) {
    return {
      ...user,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
      followersCount: user.followersCount ?? user.followers ?? 0,
      followingCount: user.followingCount ?? user.following ?? 0,
      postsCount: user.postsCount ?? 0,
      mediaCount: user.mediaCount ?? 0
    };
  },

  login(user) {
    this.clearSessionCacheData();

    const normalizedUser = this.normalizeUserForSession({ ...this.getUser(), ...user });

    localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("spopeer_loggedIn", "true");
    localStorage.setItem("_profileLastUpdated_", Date.now().toString());

    window.dispatchEvent(new CustomEvent("profileUpdated", {
      detail: {
        profile: normalizedUser,
        timestamp: Date.now(),
        source: "auth-login"
      }
    }));

    if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
      try {
        window.CurrentUserStore.setCurrentUser(normalizedUser);
      } catch (err) {
        console.debug("CurrentUserStore.setCurrentUser failed in auth login", err);
      }
    }
  },

  async logout() {
    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.logout === "function") {
        await window.SpopeerAPI.logout();
        return;
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }

    [
      "spopeer_token",
      "spopeer_user",
      "spopeer_loggedIn",
      "authToken",
      "token",
      "user",
      "userToken",
      "userData",
      "_profileLastUpdated_"
    ].forEach((key) => localStorage.removeItem(key));

    if (window.CurrentUserStore && typeof window.CurrentUserStore.clearCurrentUser === 'function') {
      try {
        window.CurrentUserStore.clearCurrentUser();
      } catch (err) {
        console.debug("CurrentUserStore.clearCurrentUser failed in auth logout", err);
      }
    }

    try {
      sessionStorage.clear();
    } catch (err) {
      console.debug('sessionStorage.clear failed during logout', err);
    }

    window.location.replace("/index.html");
  },

  async requireAuth() {
    // Guard: api.js may not yet be loaded when requireAuth is called early in a page head.
    // Fall back to localStorage optimistic check to avoid a false redirect loop.
    if (!window.SpopeerAPI) {
      if (!this.isLoggedIn()) {
        window.location.href = '/pages/auth/login.html';
      }
      return;
    }
    try {
      // Prefer CurrentUserStore to avoid duplicate /api/auth/me calls
      if (window.CurrentUserStore) {
        const user = await window.CurrentUserStore.refreshCurrentUser();
        if (!user) throw new Error('not authenticated');
      } else {
        await window.SpopeerAPI.me();
      }
    } catch (err) {
      console.debug("Auth.requireAuth failed", err);
      localStorage.removeItem('spopeer_user');
      localStorage.removeItem('spopeer_loggedIn');
      localStorage.removeItem('user');
      window.location.href = "/pages/auth/login.html";
    }
  },

  async redirectIfLoggedInToUserApp() {
    if (!window.SpopeerAPI) return;
    try {
      await window.SpopeerAPI.me();
      window.location.href = "/feed.html";
    } catch (err) {
      console.debug("redirectIfLoggedInToUserApp check failed", err);
      // Not authenticated — stay on page
    }
  },

  async syncUserFromBackend() {
    // Delegate to CurrentUserStore to avoid duplicate /api/auth/me calls
    if (window.CurrentUserStore) {
      const user = await window.CurrentUserStore.refreshCurrentUser();
      return user || null;
    }

    if (!this.isLoggedIn()) return null;
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.me !== "function") {
      return null;
    }

    try {
      const data = await window.SpopeerAPI.me();
      if (data.user) {
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("spopeer_loggedIn", "true");
        return data.user;
      }

      return null;
    } catch (err) {
      if (err && err.code === 'UNAUTHORIZED') {
        localStorage.removeItem(this.userKey);
        localStorage.removeItem("user");
        localStorage.removeItem("spopeer_loggedIn");
      } else {
        console.warn("[Spopeer] Backend user sync failed.", err);
      }
      return null;
    }
  }
};

window.Auth = Auth;

document.addEventListener("DOMContentLoaded", async () => {
  if (window.Auth && window.Auth.isLoggedIn() && window.SpopeerAPI) {
    try {
      await window.Auth.syncUserFromBackend();
    } catch (err) {
      console.debug("Best-effort syncUserFromBackend failed", err);
    }
  }
});

/* HOMEPAGE AUTH MODAL FIX */
(function(){

function findModal(){
  return document.getElementById('authModal')
    || document.querySelector('.auth-modal')
    || document.querySelector('.auth-shell');
}

window.switchAuth=function(type){
  const login=document.getElementById('loginPanel');
  const signup=document.getElementById('signupPanel');

  if(login && signup){
    if(type==='signup'){
      login.style.display='none';
      signup.style.display='block';
    }else{
      login.style.display='block';
      signup.style.display='none';
    }
  }
};

window.openAuth=function(type){
  const modal=findModal();

  if(!modal){
    console.error('Auth modal not found');
    return false;
  }

  modal.style.display='flex';
  modal.classList.add('open');

  document.body.style.overflow='hidden';

  switchAuth(type || 'login');

  return false;
};

window.closeAuth=function(){
  const modal=findModal();
  if(!modal) return;

  modal.style.display='none';
  modal.classList.remove('open');

  document.body.style.overflow='';
};

document.addEventListener('DOMContentLoaded', function(){

  /* hide auth section initially */
  const modal=findModal();
  if(modal){
    modal.style.display='none';
  }

  /* wire ALL login buttons */
  document.querySelectorAll('a,button').forEach(el=>{
    const t=(el.textContent||'').trim().toLowerCase();
    const href=(el.getAttribute('href')||'').toLowerCase();

    if(
      t==='log in' ||
      t==='sign in' ||
      href.includes('login')
    ){
      el.addEventListener('click', function(e){
        e.preventDefault();
        openAuth('login');
      });
    }

    if(
      t==='sign up free' ||
      t==='sign up' ||
      t==='create free account' ||
      href.includes('signup')
    ){
      el.addEventListener('click', function(e){
        e.preventDefault();
        openAuth('signup');
      });
    }

  });

  /* click outside closes */
  document.addEventListener('click', function(e){
    const modal=findModal();
    if(modal && e.target===modal){
      closeAuth();
    }
  });

  /* esc closes */
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){
      closeAuth();
    }
  });

});

})();
