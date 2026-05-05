(function () {
  'use strict';

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; });
  }

  async function mount(outlet) {
    outlet.innerHTML = '<div class="post-card"><div class="post-body">Loading profile...</div></div>';
    try {
      var result = await window.SpopeerAPI.request('/api/profile');
      var u = (result && result.data) || result || {};
      var name = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Spopeer member';
      outlet.innerHTML = '<div class="post-card"><div class="post-body"><h3 style="margin:0 0 8px;">' + esc(name) + '</h3><p style="margin:0;color:var(--muted);">' + esc(u.sport || u.role || 'Profile') + '</p><div style="margin-top:12px;"><button class="post-btn" onclick="window.SpaRouter.navigate(\'settings\')"><i class="fa-regular fa-pen-to-square"></i> Edit Profile</button></div></div></div>';
    } catch (_err) {
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Could not load profile.</p></div>';
    }

    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);
  }

  function unmount() {}

  if (window.SpaRouter) {
    window.SpaRouter.register('profile', { mount: mount, unmount: unmount });
  }
})();
