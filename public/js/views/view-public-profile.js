(function () {
  'use strict';

  var cleanupFns = [];

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; });
  }

  function clearCleanup() {
    while (cleanupFns.length) {
      var fn = cleanupFns.pop();
      try { fn(); } catch (_err) {}
    }
  }

  function initialsFrom(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    return (parts[0][0] || 'U').toUpperCase() + ((parts[1] && parts[1][0]) ? parts[1][0].toUpperCase() : '');
  }

  async function loadStats(userId) {
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.getProfileStats !== 'function') return {};
    try {
      var result = await window.SpopeerAPI.getProfileStats(userId);
      return (result && result.data) || result || {};
    } catch (_err) {
      return {};
    }
  }

  async function loadFollowStatus(userId) {
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.getFollowStatus !== 'function') {
      return { isFollowing: false };
    }
    try {
      var result = await window.SpopeerAPI.getFollowStatus(userId);
      var data = (result && result.data) || result || {};
      return { isFollowing: !!(data.isFollowing || data.following) };
    } catch (_err) {
      return { isFollowing: false };
    }
  }

  async function ensureConversation(userId) {
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.createConversation !== 'function') return;
    try {
      await window.SpopeerAPI.createConversation(String(userId));
    } catch (_err) {
      // Non-blocking: still route to messages.
    }
  }

  async function mount(outlet, params) {
    clearCleanup();

    var userId = params && params.userId;
    if (!userId) {
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>No user specified.</p></div>';
      return;
    }

    outlet.innerHTML = '<div class="post-card"><div class="post-body">Loading profile...</div></div>';

    try {
      var result = await window.SpopeerAPI.request('/api/users/' + encodeURIComponent(userId));
      var u = (result && result.data) || result || {};
      var stats = await loadStats(userId);
      var followState = await loadFollowStatus(userId);

      var name = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Spopeer member';
      var sport = u.sport || u.primarySport || 'Sport not set';
      var role = u.role || 'Member';
      var bio = u.bio || u.headline || 'No bio yet.';
      var location = u.location || u.city || u.country || 'Location not set';
      var avatar = u.avatarUrl || u.avatar;
      var avatarMarkup = avatar
        ? '<img src="' + esc(avatar) + '" alt="' + esc(name) + '" style="width:100%;height:100%;object-fit:cover;">'
        : esc(initialsFrom(name));

      outlet.innerHTML =
        '<section class="post-card">' +
          '<div class="post-body" style="padding:0;">' +
            '<div style="height:96px;background:linear-gradient(135deg,#0b2545,#1a6bff);"></div>' +
            '<div style="padding:0 18px 18px;">' +
              '<div style="margin-top:-34px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">' +
                '<div style="width:72px;height:72px;border-radius:50%;border:4px solid #fff;overflow:hidden;background:#0b2545;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;">' + avatarMarkup + '</div>' +
                '<div style="display:flex;gap:8px;">' +
                  '<button type="button" id="spaPublicFollowBtn" class="post-action-btn">' + (followState.isFollowing ? '<i class="fa-solid fa-user-check"></i> Following' : '<i class="fa-solid fa-user-plus"></i> Follow') + '</button>' +
                  '<button type="button" id="spaPublicMessageBtn" class="post-action-btn"><i class="fa-regular fa-comment-dots"></i> Message</button>' +
                '</div>' +
              '</div>' +
              '<h2 style="margin:10px 0 2px;font-size:24px;">' + esc(name) + '</h2>' +
              '<div style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:13px;">' +
                '<span>' + esc(role) + '</span><span>•</span><span>' + esc(sport) + '</span><span>•</span><span>' + esc(location) + '</span>' +
              '</div>' +
              '<p style="margin:12px 0 10px;line-height:1.6;color:var(--ink-2);">' + esc(bio) + '</p>' +
              '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--border);border-radius:12px;overflow:hidden;">' +
                '<div style="padding:10px 8px;text-align:center;"><div style="font-size:18px;font-weight:800;">' + Number(stats.followersCount || stats.followers || 0) + '</div><div style="font-size:11px;color:var(--muted);">Followers</div></div>' +
                '<div style="padding:10px 8px;text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border);"><div style="font-size:18px;font-weight:800;">' + Number(stats.followingCount || stats.following || 0) + '</div><div style="font-size:11px;color:var(--muted);">Following</div></div>' +
                '<div style="padding:10px 8px;text-align:center;"><div style="font-size:18px;font-weight:800;">' + Number(stats.postsCount || stats.posts || 0) + '</div><div style="font-size:11px;color:var(--muted);">Posts</div></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>';

      var followBtn = outlet.querySelector('#spaPublicFollowBtn');
      var messageBtn = outlet.querySelector('#spaPublicMessageBtn');

      if (followBtn) {
        var following = !!followState.isFollowing;
        var onFollow = async function () {
          followBtn.disabled = true;
          try {
            if (following) {
              await window.SpopeerAPI.unfollowUser(userId);
              following = false;
              followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Follow';
            } else {
              await window.SpopeerAPI.followUser(userId);
              following = true;
              followBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Following';
            }
          } catch (_err) {
            // Keep button state as-is if API fails.
          } finally {
            followBtn.disabled = false;
          }
        };
        followBtn.addEventListener('click', onFollow);
        cleanupFns.push(function () { followBtn.removeEventListener('click', onFollow); });
      }

      if (messageBtn) {
        var onMessage = async function () {
          await ensureConversation(userId);
          window.SpaRouter.navigate('messages', { userId: String(userId) });
        };
        messageBtn.addEventListener('click', function () { onMessage().catch(function () {}); });
      }
    } catch (_err) {
      outlet.innerHTML = '<div class="spa-error"><i class="fa-regular fa-circle-xmark"></i><p>Could not load this profile.</p></div>';
    }

    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);
  }

  function unmount() {
    clearCleanup();
  }

  if (window.SpaRouter) {
    window.SpaRouter.register('public-profile', { mount: mount, unmount: unmount });
  }
})();
