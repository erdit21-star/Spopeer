(function () {
  'use strict';

  /* ── Data ── */
  var user = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
  var followersData = [];
  var followingData = [];
  var pendingRequestsData = [];
  var outgoingRequestsData = [];
  var followingKeys = new Set();

  var avatarColors = [
    '#001f3f','#003366','#1a6bff','#16a34a','#7c3aed','#ea580c','#0891b2','#b91c1c'
  ];
  function colorFor(email) {
    var idx = 0;
    for (var i = 0; i < email.length; i++) idx = (idx + email.charCodeAt(i)) % avatarColors.length;
    return avatarColors[idx];
  }

  function normalizeUserType(role) {
    if (role === 'supportive_professional') return 'pro';
    return role || 'athlete';
  }

  function normalizeConnection(entry) {
    var idValue = entry.id || entry.userId || entry._id || '';
    var emailValue = entry.email || '';
    return {
      id: idValue,
      name: entry.displayName || [entry.firstName, entry.lastName].filter(Boolean).join(' ') || entry.email || 'User',
      email: emailValue,
      userType: normalizeUserType(entry.role || entry.userType),
      sport: entry.primarySport || entry.sport || '',
      mutual: 0,
      verified: false
    };
  }

  function unwrapUserList(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.users)) return result.users;
    if (Array.isArray(result.results)) return result.results;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.users)) return result.data.users;
    if (result.data && Array.isArray(result.data.results)) return result.data.results;
    return [];
  }

  function unwrapRequestList(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.requests)) return result.requests;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.requests)) return result.data.requests;
    return [];
  }

  function personKey(entry) {
    return String(entry.id || entry.userId || entry.email || '').toLowerCase();
  }

  function resolveNumericUserId() {
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      var num = Number(value);
      if (Number.isInteger(num) && num > 0) return String(num);
      if (typeof value === 'string' && /^\d+$/.test(value)) return value;
    }
    return '';
  }

  /* ── Helpers ── */
  function initials(name) {
    return name.split(' ').map(function (x) { return x[0] || ''; }).join('').toUpperCase().slice(0, 2) || '??';
  }
  function typeLabel(t) {
    return { athlete:'Athlete', coach:'Coach', club:'Club', pro:'Professional' }[t] || 'User';
  }
  function typeBadgeClass(t) {
    return { athlete:'badge-athlete', coach:'badge-coach', club:'badge-club', pro:'badge-pro' }[t] || 'badge-athlete';
  }
  function typeDotClass(t) {
    return { athlete:'athlete', coach:'coach', club:'club', pro:'pro' }[t] || 'athlete';
  }
  function typeIcon(t) {
    return { athlete:'fa-person-running', coach:'fa-bullseye', club:'fa-shield-halved', pro:'fa-star' }[t] || 'fa-user';
  }
  function showToast(msg, icon) {
    var t = document.getElementById('toast');
    t.innerHTML = (icon ? '<i class="fa-solid ' + icon + '"></i> ' : '') + msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2500);
  }

  async function loadConnections() {
    if (!window.SpopeerAPI || !window.SpopeerAPI.getFollowers || !window.SpopeerAPI.getFollowing) {
      return;
    }

    const userId = user.id || user._id || user.email;
    if (!userId) {
      return;
    }

    try {
      const results = await Promise.all([
        window.SpopeerAPI.getFollowers(userId),
        window.SpopeerAPI.getFollowing(userId)
      ]);

      followersData = unwrapUserList(results[0]).map(normalizeConnection);
      followingData = unwrapUserList(results[1]).map(normalizeConnection);
      followingKeys = new Set(followingData.map(personKey));

      if (window.SpopeerAPI) {
        if (typeof window.SpopeerAPI.listIncomingFollowRequests === 'function') {
          var requestResult = await window.SpopeerAPI.listIncomingFollowRequests();
          pendingRequestsData = unwrapRequestList(requestResult).map(function (request) {
            var userPayload = request.user || request.follower || request.sender || {};
            var normalized = normalizeConnection(userPayload);
            normalized.requestId = request.id || request.connectionId || '';
            return normalized;
          }).filter(function (entry) { return !!entry.requestId; });
        } else {
          pendingRequestsData = [];
        }

        if (typeof window.SpopeerAPI.listOutgoingFollowRequests === 'function') {
          var outgoingResult = await window.SpopeerAPI.listOutgoingFollowRequests();
          outgoingRequestsData = unwrapRequestList(outgoingResult).map(function (request) {
            var userPayload = request.user || request.followedUser || request.following || {};
            var normalized = normalizeConnection(userPayload);
            normalized.requestId = request.id || request.connectionId || '';
            return normalized;
          }).filter(function (entry) { return !!entry.requestId; });
        } else {
          outgoingRequestsData = [];
        }
      }

      document.getElementById('statFollowers').textContent = followersData.length;
      document.getElementById('statFollowing').textContent = followingData.length;
      document.getElementById('badgeFollowers').textContent = followersData.length;
      document.getElementById('badgeFollowing').textContent = followingData.length;
      document.getElementById('badgeRequests').textContent = pendingRequestsData.length + outgoingRequestsData.length;
      document.getElementById('pageCountPill').textContent = activeTab === 'followers'
        ? followersData.length
        : (activeTab === 'requests' ? (pendingRequestsData.length + outgoingRequestsData.length) : followingData.length);
      renderSuggestions();
      switchTab(activeTab);
    } catch (err) {
      console.error('Failed to load real follow data:', err);
      showToast(err.message || 'Failed to load follow data', 'triangle-exclamation');
    }
  }

  function renderSuggestions() {
    var suggList = document.getElementById('suggestionsList');
    if (!suggList) return;
    suggList.innerHTML = '<div class="sugg-item" style="justify-content:flex-start;"><div class="sugg-info"><div class="sugg-name">No suggestions yet</div><div class="sugg-meta">Suggestions will appear as real network activity grows.</div></div></div>';
  }

  /* ── Hydrate sidebar ── */
  var nameStr = (user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'You');
  var ini = initials(nameStr);
  document.getElementById('sidebarAv').textContent = ini;
  document.getElementById('sidebarName').textContent = nameStr.trim();
  document.getElementById('sidebarType').textContent = typeLabel(normalizeUserType(user.role || user.userType));
  renderSuggestions();

  /* ── Render user list ── */
  var activeFilter = null;
  var searchQuery  = '';
  var tabParam = new URLSearchParams(window.location.search).get('type');
  var activeTab = (tabParam === 'following' || tabParam === 'requests') ? tabParam : 'followers';

  function renderCard(u, idx) {
    var isSelf = !!u.email && !!user.email && u.email === user.email;
    var userKey = personKey(u);
    var isFollowed = followingKeys.has(userKey);
    var card = document.createElement('div');
    card.className = 'user-card';
    card.style.animationDelay = (idx * 40) + 'ms';
    var mutualHtml = '';
    if (u.mutual > 0) {
      mutualHtml = '<div class="mutual-badge"><div class="mutual-avatars">' +
        '<div class="mutual-av">M</div><div class="mutual-av">+</div>' +
        '</div>' + u.mutual + ' mutual connection' + (u.mutual > 1 ? 's' : '') + '</div>';
    }
    card.innerHTML =
      '<div class="user-av-wrap">' +
        '<div class="user-av" style="background:' + colorFor(u.email) + ';">' + initials(u.name) + '</div>' +
        '<div class="type-dot ' + typeDotClass(u.userType) + '"><i class="fa-solid ' + typeIcon(u.userType) + '" style="font-size:7px;"></i></div>' +
      '</div>' +
      '<div class="user-info">' +
        '<div class="user-name-row">' +
          '<span class="user-name">' + u.name + '</span>' +
          (u.verified ? '<i class="fa-solid fa-circle-check verified-ic"></i>' : '') +
        '</div>' +
        '<div class="user-meta">' +
          '<span class="user-type-badge ' + typeBadgeClass(u.userType) + '">' + typeLabel(u.userType) + '</span>' +
          (u.sport ? '<span class="meta-dot">·</span><span>' + u.sport + '</span>' : '') +
        '</div>' +
        (mutualHtml ? '<div style="margin-top:5px;">' + mutualHtml + '</div>' : '') +
      '</div>' +
      '<div class="user-actions">' +
        '<button class="btn-message-sm" title="Message"><i class="fa-regular fa-paper-plane"></i></button>' +
        (isSelf ? '' : '<button class="btn-follow' + (isFollowed ? ' following' : '') + '" data-user-key="' + userKey + '" data-user-id="' + (u.id || '') + '">' +
          (isFollowed
            ? '<span class="follow-label"><i class="fa-solid fa-check" style="font-size:10px;"></i> Following</span><span class="unfollow-label"><i class="fa-solid fa-times" style="font-size:10px;"></i> Unfollow</span>'
            : '<i class="fa-solid fa-plus" style="font-size:10px;"></i> Follow') +
        '</button>') +
      '</div>';

    /* Follow toggle */
    var followButton = card.querySelector('.btn-follow');
    if (followButton) {
      followButton.addEventListener('click', async function (e) {
      e.stopPropagation();
      var targetId = this.dataset.userId;
      var key = this.dataset.userKey;
      var followTargetId = resolveNumericUserId(targetId, u.id, key);
      this.disabled = true;
      try {
        if (!followTargetId) {
          throw new Error('This profile cannot be followed right now.');
        }
        if (followingKeys.has(key)) {
          await window.SpopeerAPI.unfollowUser(followTargetId);
          showToast('Unfollowed ' + u.name, 'user-minus');
        } else {
          await window.SpopeerAPI.followUser(followTargetId);
          showToast('Now following ' + u.name, 'check');
        }
        await loadConnections();
      } catch (err) {
        showToast(err.message || 'Unable to update follow status', 'triangle-exclamation');
      } finally {
        this.disabled = false;
      }
      });
    }
    /* Message */
    card.querySelector('.btn-message-sm').addEventListener('click', function (e) {
      e.stopPropagation();
      var chatUserId = resolveNumericUserId(u.id, u.userId);
      if (!chatUserId) {
        showToast('Unable to open chat for this profile', 'triangle-exclamation');
        return;
      }
      window.location.href = '/pages/messaging/inbox.html?userId=' + encodeURIComponent(chatUserId);
    });
    /* Card click → profile */
    card.addEventListener('click', function () {
      window.location.href = 'public-profile.html?userId=' + encodeURIComponent(u.id || u.email);
    });
    return card;
  }

  function renderRequestCard(u, idx) {
    var card = document.createElement('div');
    card.className = 'user-card';
    card.style.animationDelay = (idx * 40) + 'ms';
    card.innerHTML =
      '<div class="user-av-wrap">' +
        '<div class="user-av" style="background:' + colorFor(u.email || String(u.id || '')) + ';">' + initials(u.name) + '</div>' +
        '<div class="type-dot ' + typeDotClass(u.userType) + '"><i class="fa-solid ' + typeIcon(u.userType) + '" style="font-size:7px;"></i></div>' +
      '</div>' +
      '<div class="user-info">' +
        '<div class="user-name-row"><span class="user-name">' + u.name + '</span></div>' +
        '<div class="user-meta"><span class="user-type-badge ' + typeBadgeClass(u.userType) + '">' + typeLabel(u.userType) + '</span>' +
        (u.sport ? '<span class="meta-dot">·</span><span>' + u.sport + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="user-actions">' +
        '<button class="btn-follow" data-action="accept"><i class="fa-solid fa-check" style="font-size:10px;"></i> Accept</button>' +
        '<button class="btn-follow" data-action="reject" style="border-color:#dc2626;color:#dc2626;"><i class="fa-solid fa-xmark" style="font-size:10px;"></i> Reject</button>' +
      '</div>';

    card.querySelector('[data-action="accept"]').addEventListener('click', async function (e) {
      e.stopPropagation();
      this.disabled = true;
      try {
        await window.SpopeerAPI.acceptFollowRequest(u.requestId);
        showToast('Request accepted', 'check');
        await loadConnections();
      } catch (err) {
        showToast(err.message || 'Could not accept request', 'triangle-exclamation');
      } finally {
        this.disabled = false;
      }
    });

    card.querySelector('[data-action="reject"]').addEventListener('click', async function (e) {
      e.stopPropagation();
      this.disabled = true;
      try {
        await window.SpopeerAPI.rejectFollowRequest(u.requestId);
        showToast('Request rejected', 'xmark');
        await loadConnections();
      } catch (err) {
        showToast(err.message || 'Could not reject request', 'triangle-exclamation');
      } finally {
        this.disabled = false;
      }
    });

    card.addEventListener('click', function () {
      window.location.href = 'public-profile.html?userId=' + encodeURIComponent(u.id || u.email);
    });

    return card;
  }

  function renderOutgoingRequestCard(u, idx) {
    var card = document.createElement('div');
    card.className = 'user-card';
    card.style.animationDelay = (idx * 40) + 'ms';
    card.innerHTML =
      '<div class="user-av-wrap">' +
        '<div class="user-av" style="background:' + colorFor(u.email || String(u.id || '')) + ';">' + initials(u.name) + '</div>' +
        '<div class="type-dot ' + typeDotClass(u.userType) + '"><i class="fa-solid ' + typeIcon(u.userType) + '" style="font-size:7px;"></i></div>' +
      '</div>' +
      '<div class="user-info">' +
        '<div class="user-name-row"><span class="user-name">' + u.name + '</span></div>' +
        '<div class="user-meta"><span class="user-type-badge ' + typeBadgeClass(u.userType) + '">' + typeLabel(u.userType) + '</span>' +
        (u.sport ? '<span class="meta-dot">·</span><span>' + u.sport + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="user-actions">' +
        '<button class="btn-follow" data-action="cancel" style="border-color:#d97706;color:#d97706;"><i class="fa-solid fa-ban" style="font-size:10px;"></i> Cancel Request</button>' +
      '</div>';

    card.querySelector('[data-action="cancel"]').addEventListener('click', async function (e) {
      e.stopPropagation();
      this.disabled = true;
      try {
        if (window.SpopeerAPI && typeof window.SpopeerAPI.cancelFollowRequest === 'function') {
          await window.SpopeerAPI.cancelFollowRequest(u.requestId);
        } else {
          await window.SpopeerAPI.rejectFollowRequest(u.requestId);
        }
        showToast('Outgoing request canceled', 'ban');
        await loadConnections();
      } catch (err) {
        showToast(err.message || 'Could not cancel request', 'triangle-exclamation');
      } finally {
        this.disabled = false;
      }
    });

    card.addEventListener('click', function () {
      window.location.href = 'public-profile.html?userId=' + encodeURIComponent(u.id || u.email);
    });

    return card;
  }

  function filterData(data) {
    return data.filter(function (u) {
      var matchesFilter = !activeFilter || u.userType === activeFilter;
      var matchesSearch = !searchQuery || u.name.toLowerCase().includes(searchQuery) || (u.sport || '').toLowerCase().includes(searchQuery);
      return matchesFilter && matchesSearch;
    });
  }

  function renderList(container, data) {
    container.innerHTML = '';
    var filtered = filterData(data);
    if (!filtered.length) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon"><i class="fa-regular fa-users"></i></div>' +
        '<div class="empty-title">No results found</div>' +
        '<div class="empty-desc">Try adjusting your search or filters to find people in the sports community.</div>' +
        '<a href="/feed.html" class="btn-empty"><i class="fa-solid fa-compass"></i> Explore Spopeer</a>' +
        '</div>';
      return;
    }
    filtered.forEach(function (u, i) {
      container.appendChild(renderCard(u, i));
    });
  }

  function renderRequests(container) {
    container.innerHTML = '';
    var incoming = filterData(pendingRequestsData);
    var outgoing = filterData(outgoingRequestsData);
    if (!incoming.length && !outgoing.length) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon"><i class="fa-regular fa-envelope-open"></i></div>' +
        '<div class="empty-title">No request activity</div>' +
        '<div class="empty-desc">Incoming and sent follow requests will appear here.</div>' +
        '</div>';
      return;
    }
    if (incoming.length) {
      var incomingLabel = document.createElement('div');
      incomingLabel.className = 'section-label';
      incomingLabel.textContent = 'Incoming Requests';
      container.appendChild(incomingLabel);
      incoming.forEach(function (u, i) {
        container.appendChild(renderRequestCard(u, i));
      });
    }
    if (outgoing.length) {
      var outgoingLabel = document.createElement('div');
      outgoingLabel.className = 'section-label';
      outgoingLabel.textContent = 'Sent Requests';
      container.appendChild(outgoingLabel);
      outgoing.forEach(function (u, i) {
        container.appendChild(renderOutgoingRequestCard(u, i));
      });
    }
  }

  function switchTab(tab) {
    activeTab = tab;
    var isFollowers = tab === 'followers';
    var isRequests = tab === 'requests';
    document.getElementById('tabFollowers').classList.toggle('active', isFollowers);
    document.getElementById('tabFollowing').classList.toggle('active', tab === 'following');
    document.getElementById('tabRequests').classList.toggle('active', isRequests);
    document.getElementById('listFollowers').style.display = isFollowers ? 'flex' : 'none';
    document.getElementById('listFollowing').style.display = tab === 'following' ? 'flex' : 'none';
    document.getElementById('listRequests').style.display = isRequests ? 'flex' : 'none';
    document.getElementById('pageTitle').textContent = isFollowers ? 'Followers' : (isRequests ? 'Follow Requests' : 'Following');
    document.getElementById('breadcrumbCurrent').textContent = isFollowers ? 'Followers' : (isRequests ? 'Requests' : 'Following');
    document.getElementById('pageCountPill').textContent = isFollowers ? followersData.length : (isRequests ? (pendingRequestsData.length + outgoingRequestsData.length) : followingData.length);
    document.getElementById('listSearchInput').placeholder = isFollowers ? 'Search followers…' : (isRequests ? 'Search requests…' : 'Search following…');
    var url = new URL(window.location);
    url.searchParams.set('type', tab);
    history.replaceState(null, '', url);
    renderList(document.getElementById('listFollowers'), followersData);
    renderList(document.getElementById('listFollowing'), followingData);
    renderRequests(document.getElementById('listRequests'));
  }

  /* ── Tabs ── */
  document.getElementById('tabFollowers').addEventListener('click', function () { switchTab('followers'); });
  document.getElementById('tabFollowing').addEventListener('click', function () { switchTab('following'); });
  document.getElementById('tabRequests').addEventListener('click', function () { switchTab('requests'); });

  /* ── Search ── */
  document.getElementById('listSearchInput').addEventListener('input', function () {
    searchQuery = this.value.trim().toLowerCase();
    renderList(document.getElementById('listFollowers'), followersData);
    renderList(document.getElementById('listFollowing'), followingData);
    renderRequests(document.getElementById('listRequests'));
  });

  /* ── Filter toggle ── */
  document.getElementById('filterBtn').addEventListener('click', function () {
    var fc = document.getElementById('filterChips');
    fc.style.display = fc.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('filterChips').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-filter]');
    if (btn) {
      activeFilter = activeFilter === btn.dataset.filter ? null : btn.dataset.filter;
      this.querySelectorAll('[data-filter]').forEach(function (b) {
        b.style.borderColor = 'transparent';
        b.style.outline = '';
      });
      if (activeFilter) {
        btn.style.borderColor = 'var(--accent)';
      }
      renderList(document.getElementById('listFollowers'), followersData);
      renderList(document.getElementById('listFollowing'), followingData);
      renderRequests(document.getElementById('listRequests'));
    }
  });
  document.getElementById('clearFilter').addEventListener('click', function () {
    activeFilter = null;
    document.querySelectorAll('#filterChips [data-filter]').forEach(function (b) {
      b.style.borderColor = 'transparent';
    });
    renderList(document.getElementById('listFollowers'), followersData);
    renderList(document.getElementById('listFollowing'), followingData);
    renderRequests(document.getElementById('listRequests'));
  });

  /* ── Badges ── */
  document.getElementById('badgeFollowers').textContent = followersData.length;
  document.getElementById('badgeFollowing').textContent = followingData.length;
  document.getElementById('badgeRequests').textContent = pendingRequestsData.length + outgoingRequestsData.length;

  /* ── Init ── */
  switchTab(activeTab);
  loadConnections();

  /* ── Expose for sidebar stat clicks ── */
  window.switchTab = switchTab;
})();
