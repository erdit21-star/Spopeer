(function () {
  'use strict';

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; });
  }

  async function mount(outlet, params) {
    var userId = params && params.userId;
    if (!userId) {
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>No user specified.</p></div>';
      return;
    }

    outlet.innerHTML = '<div class="post-card"><div class="post-body">Loading profile...</div></div>';

    try {
      var result = await window.SpopeerAPI.request('/api/users/' + encodeURIComponent(userId));
      var u = (result && result.data) || result || {};
      var name = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Spopeer member';
      outlet.innerHTML = '<div class="post-card"><div class="post-body"><h3 style="margin:0 0 8px;">' + esc(name) + '</h3><p style="margin:0;color:var(--muted);">' + esc(u.sport || u.role || 'Profile') + '</p><div style="display:flex;gap:8px;margin-top:12px;"><button class="post-btn" onclick="window.SpaRouter.navigate(\'messages\')"><i class="fa-regular fa-comment-dots"></i> Message</button><button class="post-btn" onclick="window.location.href=\'/pages/profiles/public-profile.html?userId=' + encodeURIComponent(String(userId)) + '\'"><i class="fa-regular fa-id-card"></i> Open full page</button></div></div></div>';
    } catch (_err) {
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Could not load this profile.</p></div>';
    }

    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);
  }

  function unmount() {}

  if (window.SpaRouter) {
    window.SpaRouter.register('public-profile', { mount: mount, unmount: unmount });
  }
})();
