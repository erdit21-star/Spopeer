(function () {
  'use strict';

  var cleanupFns = [];

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; });
  }

  function asText(v, fallback) {
    var value = String(v || '').trim();
    return value || fallback;
  }

  function initialsFrom(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    return (parts[0][0] || 'U').toUpperCase() + ((parts[1] && parts[1][0]) ? parts[1][0].toUpperCase() : '');
  }

  function clearCleanup() {
    while (cleanupFns.length) {
      var fn = cleanupFns.pop();
      try { fn(); } catch (_err) {}
    }
  }

  async function loadStats(userId) {
    if (!userId || !window.SpopeerAPI || typeof window.SpopeerAPI.getProfileStats !== 'function') {
      return { followersCount: 0, followingCount: 0, postsCount: 0 };
    }
    try {
      var result = await window.SpopeerAPI.getProfileStats(userId);
      var data = (result && result.data) || result || {};
      return {
        followersCount: Number(data.followersCount || data.followers || 0),
        followingCount: Number(data.followingCount || data.following || 0),
        postsCount: Number(data.postsCount || data.posts || 0)
      };
    } catch (_err) {
      return { followersCount: 0, followingCount: 0, postsCount: 0 };
    }
  }

  async function mount(outlet) {
    outlet.innerHTML = '<div class="post-card"><div class="post-body">Loading profile...</div></div>';
    try {
      var result = await window.SpopeerAPI.request('/api/profile');
      var u = (result && result.data) || result || {};
      var name = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Spopeer member';

      var stats = await loadStats(u.id || u.userId);
      var handle = asText(u.username || u.handle, '@member');
      if (handle.charAt(0) !== '@') handle = '@' + handle;
      var sport = asText(u.primarySport || u.sport, 'Sport not set');
      var role = asText(u.role, 'Member');
      var bio = asText(u.bio || u.headline, 'Add your story, achievements, and goals to strengthen your profile.');
      var location = asText(u.location || u.city || u.country, 'Location not set');
      var team = asText(u.team || u.club || u.organization, 'Team not set');
      var avatarUrl = asText(u.avatarUrl || u.avatar, '');
      var avatarMarkup = avatarUrl
        ? '<img src="' + esc(avatarUrl) + '" alt="' + esc(name) + '" style="width:100%;height:100%;object-fit:cover;">'
        : esc(initialsFrom(name));

      outlet.innerHTML =
        '<section class="post-card">' +
          '<div class="post-body" style="padding:0;">' +
            '<div style="height:96px;background:linear-gradient(135deg,#001f3f,#1a6bff);"></div>' +
            '<div style="padding:0 18px 18px;">' +
              '<div style="margin-top:-34px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">' +
                '<div style="width:72px;height:72px;border-radius:50%;border:4px solid #fff;overflow:hidden;background:#001f3f;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;">' + avatarMarkup + '</div>' +
                '<div style="display:flex;gap:8px;">' +
                  '<button type="button" id="spaProfileEditBtn" class="post-action-btn"><i class="fa-regular fa-pen-to-square"></i> Edit</button>' +
                  '<button type="button" id="spaProfileNotifBtn" class="post-action-btn"><i class="fa-regular fa-bell"></i> Notifications</button>' +
                '</div>' +
              '</div>' +
              '<h2 style="margin:10px 0 2px;font-size:24px;">' + esc(name) + '</h2>' +
              '<div style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:13px;">' +
                '<span>' + esc(handle) + '</span>' +
                '<span>•</span>' +
                '<span>' + esc(role) + '</span>' +
                '<span>•</span>' +
                '<span>' + esc(sport) + '</span>' +
              '</div>' +
              '<p style="margin:12px 0 10px;line-height:1.6;color:var(--ink-2);">' + esc(bio) + '</p>' +
              '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;color:var(--muted);font-size:13px;">' +
                '<span><i class="fa-solid fa-location-dot"></i> ' + esc(location) + '</span>' +
                '<span><i class="fa-solid fa-shield-halved"></i> ' + esc(team) + '</span>' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--border);border-radius:12px;overflow:hidden;">' +
                '<div style="padding:10px 8px;text-align:center;"><div style="font-size:18px;font-weight:800;">' + stats.followersCount + '</div><div style="font-size:11px;color:var(--muted);">Followers</div></div>' +
                '<div style="padding:10px 8px;text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border);"><div style="font-size:18px;font-weight:800;">' + stats.followingCount + '</div><div style="font-size:11px;color:var(--muted);">Following</div></div>' +
                '<div style="padding:10px 8px;text-align:center;"><div style="font-size:18px;font-weight:800;">' + stats.postsCount + '</div><div style="font-size:11px;color:var(--muted);">Posts</div></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>';

      var editBtn = outlet.querySelector('#spaProfileEditBtn');
      var notifBtn = outlet.querySelector('#spaProfileNotifBtn');

      if (editBtn) {
        var onEdit = function () { window.SpaRouter.navigate('settings'); };
        editBtn.addEventListener('click', onEdit);
        cleanupFns.push(function () { editBtn.removeEventListener('click', onEdit); });
      }
      if (notifBtn) {
        var onNotif = function () { window.SpaRouter.navigate('notifications'); };
        notifBtn.addEventListener('click', onNotif);
        cleanupFns.push(function () { notifBtn.removeEventListener('click', onNotif); });
      }
    } catch (_err) {
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Could not load profile.</p></div>';
    }

    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);
  }

  function unmount() {
    clearCleanup();
  }

  if (window.SpaRouter) {
    window.SpaRouter.register('profile', { mount: mount, unmount: unmount });
  }
})();
