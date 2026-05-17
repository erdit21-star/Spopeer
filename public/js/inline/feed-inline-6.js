(function () {
  /* ====== initialize profile sync ====== */
  if (typeof ProfileSyncService !== 'undefined') ProfileSyncService.init();

  function getCurrentUserData() {
    if (window.CurrentUserStore) return window.CurrentUserStore.getCurrentUser() || {};
    try { return JSON.parse(localStorage.getItem('spopeer_user') || '{}') || {}; } catch { return {}; }
  }
  window.getCurrentUserData = getCurrentUserData;

  async function refreshCurrentUserFromBackend() {
    try {
      var res = await fetch('/api/profile/me', { credentials: 'include' });
      if (!res.ok) return null;
      var data = await res.json().catch(function () { return {}; });
      var user = (data.data && (data.data.user || data.data.payload)) || data.user || data.payload || null;
      if (!user) return null;

      if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
        window.CurrentUserStore.setCurrentUser(user);
      } else {
        localStorage.setItem('spopeer_user', JSON.stringify(user));
        localStorage.setItem('spopeer_loggedIn', 'true');
      }

      return user;
    } catch (err) {
      console.debug('feed profile refresh failed', err);
      return null;
    }
  }

  function normalizeFeedProfile(user) {
    if (!user) return {};
    if (window.ProfileNormalizer && typeof window.ProfileNormalizer.normalizeProfile === 'function') {
      return window.ProfileNormalizer.normalizeProfile(user);
    }
    return user;
  }

  function formatExperience(user) {
    var raw = user.experience || user.sportsYears || user.profExperience || user.yearsOfExperience || user.yearsOfCoaching;
    if (raw === undefined || raw === null || raw === '') return '';
    var num = Number(raw);
    if (!Number.isNaN(num)) return String(num) + ' years';
    return String(raw);
  }

  function getFeedRoleFields(user) {
    var role = user.userType || user.role || 'athlete';
    var map = {
      athlete: [
        { label: 'Sport', value: user.primarySport || user.sport || '' },
        { label: 'Position', value: user.position || '' },
        { label: 'Team', value: user.currentTeam || '' },
        { label: 'Level', value: user.playingLevel || user.sportsLevel || '' },
        { label: 'Location', value: user.location || [user.city, user.country].filter(Boolean).join(', ') },
        { label: 'Experience', value: formatExperience(user) }
      ],
      coach: [
        { label: 'Sport', value: user.primarySport || user.sport || '' },
        { label: 'Specialty', value: user.specialization || user.position || '' },
        { label: 'Team', value: user.currentTeam || '' },
        { label: 'Style', value: user.coachingStyle || user.playingLevel || user.sportsLevel || '' },
        { label: 'Location', value: user.location || [user.city, user.country].filter(Boolean).join(', ') },
        { label: 'Experience', value: formatExperience(user) }
      ],
      club: [
        { label: 'Sport', value: user.primarySport || user.sport || '' },
        { label: 'Founded', value: user.foundedYear ? String(user.foundedYear) : '' },
        { label: 'Teams', value: user.teamsAndDivisions || user.currentTeam || '' },
        { label: 'Type', value: user.clubType || user.facilities || '' },
        { label: 'Location', value: user.location || [user.city, user.country].filter(Boolean).join(', ') },
        { label: 'Years', value: formatExperience(user) }
      ],
      supportive_professional: [
        { label: 'Sport', value: user.primarySport || user.sport || '' },
        { label: 'Specialty', value: user.specializationField || user.specialization || '' },
        { label: 'Org', value: user.companyName || user.currentTeam || '' },
        { label: 'Title', value: user.professionalTitle || '' },
        { label: 'Location', value: user.location || [user.city, user.country].filter(Boolean).join(', ') },
        { label: 'Experience', value: formatExperience(user) }
      ]
    };
    return map[role] || map.athlete;
  }

  function applyFeedCardStyle(userInput) {
    var user = normalizeFeedProfile(userInput || getCurrentUserData());
    var style = (user && user.profileCardStyle) || 'card-stack';
    var valid = ['card-stack', 'minimal-list', 'sports-card'];
    if (valid.indexOf(style) === -1) style = 'card-stack';

    document.querySelectorAll('.sidebar-left .profile-card-variant').forEach(function(el) {
      el.classList.toggle('active', el.dataset.variant === style);
    });

    var name = user.displayName || ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || 'User';
    var initials = name.split(' ').map(function(n){ return n[0] || ''; }).join('').toUpperCase().slice(0,2) || '?';
    var fields = getFeedRoleFields(user).filter(function(field) { return !!field.value; });

    // Populate minimal-list variant
    if (style === 'minimal-list') {
      var mlAv = document.getElementById('feed-ml-avatar');
      if (mlAv) {
        if (user.avatarUrl || user.avatar) {
          mlAv.innerHTML = '<img src="' + (user.avatarUrl || user.avatar) + '" alt="' + name + '">';
        } else { mlAv.textContent = initials; }
      }
      var mlName = document.getElementById('feed-ml-name'); if (mlName) mlName.textContent = name;
      var mlSub = document.getElementById('feed-ml-sub'); if (mlSub) mlSub.textContent = user.sport || user.primarySport || user.profession || 'User';
      var mlF = document.getElementById('feed-ml-followers'); if (mlF) mlF.textContent = String(user.followersCount || user.followers || 0);
      var mlFg = document.getElementById('feed-ml-following'); if (mlFg) mlFg.textContent = String(user.followingCount || user.following || 0);
      var mlP = document.getElementById('feed-ml-posts'); if (mlP) mlP.textContent = String(user.postsCount || 0);
      var mlFields = document.getElementById('feed-ml-fields');
      if (mlFields) {
        var rows = '';
        fields.forEach(function(field) {
          rows += '<div class="feed-pc-minimal-row"><span class="feed-pc-minimal-fl">' + field.label + '</span><span class="feed-pc-minimal-fv">' + field.value + '</span></div>';
        });
        if (!rows) rows = '<div class="feed-pc-minimal-row"><span class="feed-pc-minimal-fl">No profile fields yet</span></div>';
        mlFields.innerHTML = rows;
      }
    }

    // Populate sports-card variant
    if (style === 'sports-card') {
      var scAv = document.getElementById('feed-sc-avatar');
      if (scAv) {
        if (user.avatarUrl || user.avatar) {
          scAv.innerHTML = '<img src="' + (user.avatarUrl || user.avatar) + '" alt="' + name + '">';
        } else { scAv.textContent = initials; }
      }
      var scName = document.getElementById('feed-sc-name'); if (scName) scName.textContent = name;
      var scSub = document.getElementById('feed-sc-sub'); if (scSub) scSub.textContent = user.sport || user.primarySport || user.profession || 'User';
      var scF = document.getElementById('feed-sc-followers'); if (scF) scF.textContent = String(user.followersCount || user.followers || 0);
      var scFg = document.getElementById('feed-sc-following'); if (scFg) scFg.textContent = String(user.followingCount || user.following || 0);
      var scP = document.getElementById('feed-sc-posts'); if (scP) scP.textContent = String(user.postsCount || 0);
      var scPills = document.getElementById('feed-sc-pills');
      if (scPills) {
        var pills = '';
        if (fields[1]) pills += '<span class="feed-pc-sports-pill feed-pc-sports-pill--pos">' + fields[1].value + '</span>';
        if (fields[3]) pills += '<span class="feed-pc-sports-pill feed-pc-sports-pill--lvl">' + fields[3].value + '</span>';
        scPills.innerHTML = pills;
      }
      var scFields = document.getElementById('feed-sc-fields');
      if (scFields) {
        var tiles = '';
        fields.forEach(function(field) {
          tiles += '<div class="feed-pc-sports-tile"><div class="feed-pc-sports-tile-label">' + field.label + '</div><div class="feed-pc-sports-tile-val">' + field.value + '</div></div>';
        });
        if (!tiles) tiles = '<div class="feed-pc-sports-tile"><div class="feed-pc-sports-tile-label">No profile fields yet</div></div>';
        scFields.innerHTML = tiles;
      }
    }
  }

  // Wire store updates to hydrate sidebar and bind chips
  if (window.CurrentUserStore) {
    window.CurrentUserStore.subscribe(user => {
      hydrateSidebarProfile(user);
      applyFeedCardStyle(user);
      if (window.UserUI) window.UserUI.bindAllChips();
    });
    // initial run
    var initialUser = window.CurrentUserStore.getCurrentUser();
    hydrateSidebarProfile(initialUser);
    applyFeedCardStyle(initialUser);
    if (window.UserUI) window.UserUI.bindAllChips();
  } else {
    applyFeedCardStyle(getCurrentUserData());
  }
  
  // Hydration of avatars/names is handled centrally by CurrentUserStore and UserUI

  // Sidebar profile card population
  function updateSidebarFromProfile(profile) {
    if (!profile) return;
    
    // Get name from displayName or firstName+lastName
    const fullName = profile.displayName
      || [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      || 'User';
    
    // Get initials
    const firstInitial = (profile.firstName || fullName.split(' ')[0] || '')[0] || '';
    // All sidebar/profile UI is now hydrated by UserUI/CurrentUserStore via data-user-* attributes.

    // Update followers/following counts from profile data
    const followersCountEl = document.getElementById('followersCount');
    const followingCountEl = document.getElementById('followingCount');
    const postsCountEl = document.getElementById('postsCount');
    const followersValue = profile.followersCount ?? profile.followers;
    const followingValue = profile.followingCount ?? profile.following;
    const postsValue = profile.postsCount ?? profile.mediaCount;
    if (followersCountEl && followersValue !== undefined) {
      followersCountEl.textContent = formatCount(followersValue);
    }
    if (followingCountEl && followingValue !== undefined) {
      followingCountEl.textContent = formatCount(followingValue);
    }
    if (postsCountEl && postsValue !== undefined) {
      postsCountEl.textContent = formatCount(postsValue);
    }

    // Update followers/following popover breakdowns if available
    if (profile.followerBreakdown) {
      updatePopoverBreakdown('followersPopover', profile.followerBreakdown);
    }
    if (profile.followingBreakdown) {
      updatePopoverBreakdown('followingPopover', profile.followingBreakdown);
    }

    // Call sidebar hydration for user type-specific styling
    hydrateSidebarProfile(profile);
    applyFeedCardStyle(profile);
  }

  // Format count for display (e.g. 1200 ? "1.2K")
  function formatCount(num) {
    if (typeof num !== 'number') num = parseInt(num) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  }

  // Update popover breakdown items
  function updatePopoverBreakdown(popoverId, breakdown) {
    const popover = document.getElementById(popoverId);
    if (!popover || !breakdown) return;
    const items = popover.querySelectorAll('.sp-stat-popover-item');
    const types = ['Athletes', 'Coaches', 'Clubs', 'Pros'];
    const keys = ['athletes', 'coaches', 'clubs', 'pros'];
    items.forEach((item, i) => {
      if (keys[i] && breakdown[keys[i]] !== undefined) {
        const countEl = item.querySelector('.sp-stat-popover-count');
        if (countEl) countEl.textContent = breakdown[keys[i]];
      }
    });
  }

  var sidebarAvatarUploadBound = false;
  function initSidebarAvatarUpload() {
    if (sidebarAvatarUploadBound) return;
    var avatarWrap = document.querySelector('.sp2-avatar-wrap');
    var avatarInput = document.getElementById('spAvatarInput');
    var avatarEl = document.getElementById('sidebarAvatar');
    if (!avatarWrap || !avatarInput || !avatarEl) return;

    sidebarAvatarUploadBound = true;

    avatarWrap.addEventListener('click', function (event) {
      if (event.target === avatarInput) return;
      avatarInput.click();
    });

    avatarInput.addEventListener('change', async function () {
      var file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      if (!window.SpopeerAPI || typeof window.SpopeerAPI.uploadAvatar !== 'function') return;

      var localPreview = URL.createObjectURL(file);
      avatarEl.innerHTML = '<img src="' + localPreview + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:0">';

      try {
        var uploadResult = await window.SpopeerAPI.uploadAvatar(file);
        var avatarUrl =
          (uploadResult && uploadResult.data && uploadResult.data.avatarUrl) ||
          (uploadResult && uploadResult.payload && uploadResult.payload.avatarUrl) ||
          (uploadResult && uploadResult.avatarUrl) ||
          '';

        if (avatarUrl) {
          var current = getCurrentUserData();
          var merged = Object.assign({}, current, {
            avatarUrl: avatarUrl,
            avatar: avatarUrl,
            _profileUpdatedAt: Date.now()
          });

          if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
            window.CurrentUserStore.setCurrentUser(merged);
          } else {
            localStorage.setItem('spopeer_user', JSON.stringify(merged));
            localStorage.setItem('_profileLastUpdated_', String(merged._profileUpdatedAt));
          }

          window.dispatchEvent(new CustomEvent('profileUpdated', {
            detail: { profile: merged, source: 'feed-sidebar-avatar-upload' }
          }));
        }

        var freshUser = await refreshCurrentUserFromBackend();
        if (freshUser) {
          updateSidebarFromProfile(freshUser);
          hydrateSidebarProfile(freshUser);
        }
      } catch (error) {
        console.error('Sidebar avatar upload failed', error);
      } finally {
        URL.revokeObjectURL(localPreview);
        avatarInput.value = '';
      }
    });
  }
  
  // Initialize sidebar with current profile
  var ud = getCurrentUserData();
  initSidebarAvatarUpload();
  if (ud && (ud.email || ud.id)) {
    updateSidebarFromProfile(ud);
    
    // Hydrate sidebar profile based on user type
    hydrateSidebarProfile(ud);
    
    // STEP 6: Background profile sync from API
    // On page load, show fast cached version from localStorage, then update from server
    // Commented out for HTML-only mode
    /*
    (async () => {
      try {
        const userEmail = ud.email || ud.userEmail;
        
        if (userEmail) {
          // Fetch fresh profile data from API in background
          const response = await fetch(`/api/profiles/${encodeURIComponent(userEmail)}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            const freshProfile = data.payload || {};
            
            // Merge API profile with localStorage
            const mergedProfile = { ...ud, ...freshProfile };
            localStorage.setItem('spopeer_user', JSON.stringify(mergedProfile));
            
            // Update sidebar silently if data changed
            updateSidebarFromProfile(mergedProfile);
            hydrateSidebarProfile(mergedProfile);
            
            // Update feed posts and other elements with fresh profile data
            window.dispatchEvent(new CustomEvent('profileUpdated', { detail: mergedProfile }));
          }
        }
      } catch (error) {
        console.log('Background profile sync failed (using cached version):', error.message);
      }
    })();
    */
    
    refreshCurrentUserFromBackend().then(function (freshUser) {
      if (freshUser) {
        updateSidebarFromProfile(freshUser);
        hydrateSidebarProfile(freshUser);
      }
    });
    
    // Set edit profile button URL based on user type
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
      editBtn.href = getEditProfileUrl();
    }
  }

  // Function to hydrate sidebar profile based on user type
  function hydrateSidebarProfile(profile) {
    if (!profile) return;
    profile = normalizeFeedProfile(profile);

    function firstNonEmpty(values) {
      for (var i = 0; i < values.length; i += 1) {
        var value = values[i];
        if (value === 0) return value;
        if (value === null || value === undefined) continue;
        if (String(value).trim() !== '') return value;
      }
      return '';
    }

    function normalizeRole(value) {
      var raw = String(value || 'athlete').toLowerCase().trim();
      if (raw === 'supportive professional' || raw === 'supportive-professional') {
        return 'supportive_professional';
      }
      return raw.replace(/\s+/g, '_');
    }

    function setText(id, value, fallback) {
      var el = document.getElementById(id);
      if (!el) return;
      var next = value;
      if (next === null || next === undefined || String(next).trim() === '') {
        next = fallback;
      }
      el.textContent = String(next);
    }

    var type = normalizeRole(profile.role || profile.userType || 'athlete');
    if (['athlete', 'coach', 'club', 'supportive_professional'].indexOf(type) === -1) {
      type = 'athlete';
    }

    const profileLink = document.querySelector('.sp-profile-link');
    if (profileLink) profileLink.href = getProfileUrl();
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.href = getEditProfileUrl();

    // Update handle with username
    const handleEl = document.getElementById('sidebarHandle');
    if (handleEl) handleEl.textContent = '@' + (profile.username || (profile.email ? profile.email.split('@')[0] : 'user'));

    // Update display name
    const nameEl = document.getElementById('sidebarName');
    var displayName = profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User';
    if (nameEl) {
      nameEl.textContent = displayName;
    }

    const locationEl = document.getElementById('spLocation');
    var locationText = profile.location || [profile.city, profile.country].filter(Boolean).join(', ') || 'Add your location';
    if (locationEl) {
      locationEl.textContent = locationText;
    }
    const countryCodeEl = document.getElementById('spCountryCode');
    if (countryCodeEl) {
      var country = String(profile.countryCode || profile.country || '').trim();
      var countryCode = country ? country.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() : '--';
      countryCodeEl.textContent = countryCode || '--';
    }
    
    // Update cover background based on user type
    const cover = document.querySelector('.sp-cover');
    if (cover) {
      const coverGradients = {
        athlete: 'linear-gradient(135deg, var(--accent) 0%, #003d7a 50%, var(--blue) 100%)',
        coach: 'linear-gradient(135deg, #1a3a5c 0%, #1a6bff 100%)',
        club: 'linear-gradient(135deg, #064e3b 0%, #16a34a 100%)',
        supportive_professional: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 60%, #c026d3 100%)'
      };
      cover.style.background = coverGradients[type] || coverGradients.athlete;
    }

    // Update avatar � show uploaded photo if available, else role gradient
    const avatar = document.getElementById('sidebarAvatar');
    if (avatar) {
      const avatarGradients = {
        athlete: 'linear-gradient(135deg, var(--accent), var(--blue))',
        coach: 'linear-gradient(135deg, #1a3a5c, var(--blue))',
        club: 'linear-gradient(135deg, #064e3b, #16a34a)',
        supportive_professional: 'linear-gradient(135deg, #3b0764, #7c3aed)'
      };
      if (profile.avatarUrl || profile.avatar) {
        avatar.style.background = '';
        avatar.innerHTML = '<img src="' + (profile.avatarUrl || profile.avatar) + '" style="width:100%;height:100%;object-fit:cover;border-radius:0">';
      } else {
        var initials = (displayName || 'User')
          .split(' ')
          .map(function (chunk) { return chunk[0] || ''; })
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U';
        avatar.textContent = initials;
        avatar.style.background = avatarGradients[type] || avatarGradients.athlete;
      }
    }

    // Update online dot color based on user type (coaches are amber)
    const onlineDot = document.querySelector('.sp-online-dot');
    if (onlineDot && type === 'coach') {
      onlineDot.style.background = '#f59e0b';
    }

    // Update role badge
    const roleBadge = document.getElementById('spRoleBadge');
    if (roleBadge) {
      const roleMap = {
        athlete: { cls: 'athlete', icon: 'fa-person-running', label: 'Athlete' },
        coach: { cls: 'coach', icon: 'fa-bullseye', label: 'Coach' },
        club: { cls: 'club', icon: 'fa-shield-halved', label: 'Club' },
        supportive_professional: { cls: 'pro', icon: 'fa-stethoscope', label: 'Sports Pro' }
      };
      const r = roleMap[type] || roleMap.athlete;
      roleBadge.className = 'sp-role-badge ' + r.cls;
      roleBadge.innerHTML = `<i class="fa-solid ${r.icon}" style="font-size:8px"></i> ${r.label}`;
    }

    // Show verification badge for clubs
    const verified = document.getElementById('spVerified');
    if (verified) {
      if (type === 'club') {
        verified.style.display = 'inline-flex';
        verified.innerHTML = '<i class="fa-solid fa-shield-halved" style="font-size:9px;color:var(--green)"></i> <span style="color:var(--green)">Official Club</span>';
      } else if (profile.verified) {
        verified.style.display = 'inline-flex';
        verified.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size:9px"></i> Verified';
      } else {
        verified.style.display = 'none';
      }
    }

    // Update sport badge icon based on sport
    const sportBadge = document.getElementById('spSportBadge');
    if (sportBadge && (profile.primarySport || profile.sport)) {
      const sport = profile.primarySport || profile.sport;
      const sportIcons = {
        'Football': 'fa-futbol',
        'Basketball': 'fa-basketball',
        'Baseball': 'fa-baseball',
        'Soccer': 'fa-futbol',
        'Tennis': 'fa-table-tennis-paddle-ball',
        'Swimming': 'fa-person-swimming',
        'Running': 'fa-person-running',
        'Marathon': 'fa-person-running',
        'Cycling': 'fa-person-biking',
        'Golf': 'fa-golf-ball-tee',
        'Volleyball': 'fa-volleyball',
        'Hockey': 'fa-hockey-puck'
      };
      const icon = sportIcons[sport] || 'fa-shoe-prints';
      sportBadge.innerHTML = `<i class="fa-solid ${icon}" style="font-size:8px"></i> ${sport}`;
    } else if (sportBadge) {
      sportBadge.innerHTML = '<i class="fa-solid fa-shoe-prints" style="font-size:8px"></i> Add your sport';
    }

    // Update plan pill
    const planPill = document.getElementById('spPlanPill');
    if (planPill && profile.subscriptionPlan) {
      const planMap = {
        free: { cls: 'free', icon: 'fa-circle', label: 'Free' },
        pro: { cls: 'pro', icon: 'fa-bolt', label: 'Pro' },
        elite: { cls: 'elite', icon: 'fa-crown', label: 'Elite' }
      };
      const p = planMap[profile.subscriptionPlan] || planMap.free;
      planPill.className = 'sp-plan-pill ' + p.cls;
      planPill.innerHTML = `<i class="fa-solid ${p.icon}" style="font-size:8px"></i> ${p.label}`;
    }

    // Show/hide bio based on whether it exists
    const bio = document.getElementById('spBio');
    if (bio) {
      bio.textContent = profile.bio || 'Complete your profile';
      bio.style.display = 'block';
    }

    var jerseyRaw = firstNonEmpty([profile.jerseyNumber, profile.shirtNumber, profile.squadNumber, profile.number]);
    var jerseyLabel = jerseyRaw ? '#' + String(jerseyRaw) : '';
    var jerseyEl = document.getElementById('spJerseyBadge');
    if (jerseyEl) {
      jerseyEl.style.display = jerseyLabel ? 'inline-flex' : 'none';
      if (jerseyLabel) jerseyEl.textContent = jerseyLabel;
    }
    setText('spCoverJersey', jerseyRaw || '7', '7');

    var positionValue = firstNonEmpty([
      profile.position,
      profile.specialization,
      profile.professionalTitle,
      type === 'club' ? 'Organization' : ''
    ]);
    var clubValue = firstNonEmpty([
      profile.currentTeam,
      profile.club,
      profile.affiliation,
      profile.companyName,
      profile.organization
    ]);
    setText('spPositionText', positionValue || (type === 'coach' ? 'Coach' : type === 'club' ? 'Club' : 'Position'), type === 'coach' ? 'Coach' : 'Position');
    setText('spClubText', clubValue || (type === 'club' ? 'Organization' : 'Club'), type === 'club' ? 'Organization' : 'Club');

    var availabilityRaw = String(firstNonEmpty([
      profile.availability,
      profile.transferStatus,
      profile.contractStatus,
      profile.availabilityStatus,
      profile.availabilityHours
    ]) || '').toLowerCase();
    var available = !availabilityRaw || (availabilityRaw.indexOf('no') === -1 && availabilityRaw.indexOf('not') === -1 && availabilityRaw.indexOf('unavailable') === -1 && availabilityRaw.indexOf('contract') === -1);

    var availabilityTextByRole = {
      athlete: available ? 'Open to offers' : 'Active contract',
      coach: available ? 'Open to coaching' : 'Not taking roles',
      club: available ? 'Open trials now' : 'Trials closed',
      supportive_professional: available ? 'Open for services' : 'Fully booked'
    };
    setText('spAvailabilityText', firstNonEmpty([profile.availabilityLabel, profile.availabilityText]) || availabilityTextByRole[type] || 'Availability not set', 'Availability not set');

    var availPill = document.getElementById('spAvailabilityPill');
    if (availPill) {
      availPill.className = 'sp2-avail-pill' + (available ? '' : ' no');
      availPill.innerHTML = '<span class="sp2-avail-dot"></span>' + (available ? 'Available' : 'Unavailable');
    }
    setText('spAvailableFrom', firstNonEmpty([
      profile.availableFrom,
      profile.freeFrom,
      profile.contractEnd,
      profile.availabilityDate
    ]) || 'Not set', 'Not set');

    var locationRow = document.getElementById('spInfoRowLocation');
    var availabilityRow = document.getElementById('spInfoRowAvailability');
    var freeFromRow = document.getElementById('spInfoRowFreeFrom');
    var freeFromLabelEl = document.getElementById('spAvailableFromLabel');
    var freeFromIconEl = freeFromRow ? freeFromRow.querySelector('i') : null;

    if (locationRow) locationRow.style.display = '';
    if (availabilityRow) availabilityRow.style.display = '';
    if (freeFromRow) freeFromRow.style.display = '';

    if (type === 'club') {
      if (freeFromLabelEl) freeFromLabelEl.textContent = 'Founded';
      if (freeFromIconEl) freeFromIconEl.className = 'fa-solid fa-building';
      setText('spAvailableFrom', firstNonEmpty([profile.foundedYear, profile.leagueLevel, profile.currentRanking]) || 'Not set', 'Not set');
      setText('spAvailabilityText', firstNonEmpty([profile.availableTrials, profile.openPositions]) || (available ? 'Open trials now' : 'Trials closed'), 'Trials closed');
      if (availPill) {
        var clubOpen = available || !!firstNonEmpty([profile.availableTrials, profile.openPositions]);
        availPill.className = 'sp2-avail-pill' + (clubOpen ? '' : ' no');
        availPill.innerHTML = '<span class="sp2-avail-dot"></span>' + (clubOpen ? 'Open' : 'Closed');
      }
    } else if (type === 'coach') {
      if (freeFromLabelEl) freeFromLabelEl.textContent = 'Experience';
      if (freeFromIconEl) freeFromIconEl.className = 'fa-solid fa-stopwatch';
      setText('spAvailableFrom', firstNonEmpty([profile.yearsOfCoaching, profile.experience, profile.yearsOfExperience]) || 'Not set', 'Not set');
    } else if (type === 'supportive_professional') {
      if (freeFromLabelEl) freeFromLabelEl.textContent = 'Service mode';
      if (freeFromIconEl) freeFromIconEl.className = 'fa-solid fa-briefcase';
      setText('spAvailableFrom', firstNonEmpty([profile.serviceMode, profile.availabilityHours, profile.preferredContact]) || 'Not set', 'Not set');
      setText('spAvailabilityText', firstNonEmpty([profile.services, profile.specializationField, profile.specialization]) || (available ? 'Open for services' : 'Fully booked'), 'Service status');
    } else {
      if (freeFromLabelEl) freeFromLabelEl.textContent = 'Free from';
      if (freeFromIconEl) freeFromIconEl.className = 'fa-solid fa-calendar-days';
    }

    var roleSignalMap = {
      athlete: {
        title: 'Athlete Performance',
        points: [
          { label: 'Recent', value: firstNonEmpty([profile.recentPerformance, profile.lastPerformance, profile.highlight]) || 'No update' },
          { label: 'Trend', value: firstNonEmpty([profile.performanceTrend, profile.trend, profile.form]) || 'Stable' },
          { label: 'Status', value: firstNonEmpty([profile.transferStatus, profile.contractStatus, available ? 'Open to offers' : 'Active contract']) || '-' }
        ]
      },
      coach: {
        title: 'Coach Authority',
        points: [
          { label: 'Experience', value: firstNonEmpty([profile.yearsOfCoaching, profile.experience, profile.yearsOfExperience]) || '-' },
          { label: 'Certs', value: firstNonEmpty([profile.certifications, profile.credentials, profile.coachEducation]) || '-' },
          { label: 'Success', value: firstNonEmpty([profile.winRate, profile.successRate, profile.athletesCoached]) || '-' }
        ]
      },
      club: {
        title: 'Club Scale',
        points: [
          { label: 'Teams', value: firstNonEmpty([profile.teamsCount, profile.teamsAndDivisions]) || '-' },
          { label: 'Members', value: firstNonEmpty([profile.membersCount, profile.communitySize]) || '-' },
          { label: 'Trials', value: firstNonEmpty([profile.availableTrials, profile.openPositions, available ? 'Open' : 'Closed']) || '-' }
        ]
      },
      supportive_professional: {
        title: 'Service Layer',
        points: [
          { label: 'Services', value: firstNonEmpty([profile.services, profile.specializationField, profile.specialization]) || '-' },
          { label: 'Clients', value: firstNonEmpty([profile.clientsServed, profile.clientele]) || '-' },
          { label: 'Mode', value: firstNonEmpty([profile.availabilityHours, profile.serviceMode, profile.preferredContact]) || (available ? 'Open' : 'Booked') }
        ]
      }
    };
    var roleSignal = roleSignalMap[type] || roleSignalMap.athlete;
    setText('spRoleSignalTitle', roleSignal.title, 'Role Signals');
    setText('spRoleSignal1Label', roleSignal.points[0].label, 'Signal 1');
    setText('spRoleSignal1Val', roleSignal.points[0].value, '-');
    setText('spRoleSignal2Label', roleSignal.points[1].label, 'Signal 2');
    setText('spRoleSignal2Val', roleSignal.points[1].value, '-');
    setText('spRoleSignal3Label', roleSignal.points[2].label, 'Signal 3');
    setText('spRoleSignal3Val', roleSignal.points[2].value, '-');

    var followers = profile.followersCount ?? profile.followers ?? 0;
    var following = profile.followingCount ?? profile.following ?? 0;
    setText('followersCount', formatCount(followers), '0');
    setText('followingCount', formatCount(following), '0');

    var sportName = String(profile.primarySport || profile.sport || '').toLowerCase();
    var keyStatLabel = 'Posts';
    var keyStatValue = profile.postsCount ?? profile.mediaCount ?? 0;
    if (type === 'athlete') {
      if (sportName.indexOf('basket') !== -1) {
        keyStatLabel = 'PPG';
        keyStatValue = firstNonEmpty([profile.ppg, profile.pointsPerGame, keyStatValue]);
      } else if (sportName.indexOf('running') !== -1 || sportName.indexOf('marathon') !== -1) {
        keyStatLabel = 'Pace';
        keyStatValue = firstNonEmpty([profile.pace, profile.bestPace, keyStatValue]);
      } else if (sportName.indexOf('gym') !== -1) {
        keyStatLabel = 'PR';
        keyStatValue = firstNonEmpty([profile.personalRecord, profile.pr, keyStatValue]);
      } else {
        keyStatLabel = 'Goals';
        keyStatValue = firstNonEmpty([profile.goals, profile.goalCount, keyStatValue]);
      }
    } else if (type === 'coach') {
      keyStatLabel = 'Athletes';
      keyStatValue = firstNonEmpty([profile.athletesCoached, profile.teamsCoached, profile.clientsServed, keyStatValue]);
    } else if (type === 'club') {
      keyStatLabel = 'Teams';
      keyStatValue = firstNonEmpty([profile.teamsCount, profile.teamsAndDivisions, keyStatValue]);
    } else if (type === 'supportive_professional') {
      keyStatLabel = 'Clients';
      keyStatValue = firstNonEmpty([profile.clientsServed, profile.clientele, keyStatValue]);
    }
    setText('postsLabel', keyStatLabel, 'Posts');
    setText('postsCount', typeof keyStatValue === 'number' ? formatCount(keyStatValue) : keyStatValue, '0');

    var roleMetrics = {
      athlete: [
        { label: 'Goals', value: firstNonEmpty([profile.goals, profile.goalCount, 0]) },
        { label: 'Assists', value: firstNonEmpty([profile.assists, profile.assistCount, 0]) },
        { label: 'Titles', value: firstNonEmpty([profile.titlesWon, profile.achievementsCount, profile.achievements, '-']) }
      ],
      coach: [
        { label: 'Experience', value: firstNonEmpty([profile.yearsOfCoaching, profile.experience, profile.yearsOfExperience, '-']) },
        { label: 'Certs', value: firstNonEmpty([profile.certifications, profile.credentials, '-']) },
        { label: 'Win Rate', value: firstNonEmpty([profile.winRate, profile.successRate, '-']) }
      ],
      club: [
        { label: 'Teams', value: firstNonEmpty([profile.teamsAndDivisions, profile.teamsCount, '-']) },
        { label: 'Members', value: firstNonEmpty([profile.membersCount, profile.communitySize, '-']) },
        { label: 'Titles', value: firstNonEmpty([profile.championshipsWon, profile.achievements, '-']) }
      ],
      supportive_professional: [
        { label: 'Experience', value: firstNonEmpty([profile.profExperience, profile.yearsOfExperience, profile.experience, '-']) },
        { label: 'Clients', value: firstNonEmpty([profile.clientsServed, profile.clientele, '-']) },
        { label: 'Services', value: firstNonEmpty([profile.services, profile.specialization, '-']) }
      ]
    };
    var metrics = roleMetrics[type] || roleMetrics.athlete;
    setText('spAchieve1Label', metrics[0].label, 'Metric 1');
    setText('spAchieve1Val', metrics[0].value, '-');
    setText('spAchieve2Label', metrics[1].label, 'Metric 2');
    setText('spAchieve2Val', metrics[1].value, '-');
    setText('spAchieve3Label', metrics[2].label, 'Metric 3');
    setText('spAchieve3Val', metrics[2].value, '-');

    // Update member since
    const memberSince = document.getElementById('spMemberSince');
    if (memberSince && profile.createdAt) {
      const date = new Date(profile.createdAt);
      memberSince.textContent = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    // Calculate and update profile completion
    const completionFill = document.getElementById('spCompletionFill');
    const completionPct = document.getElementById('spCompletionPct');
    if (completionFill && completionPct) {
      const fields = [
        'displayName', 'firstName', 'lastName', 'bio', 'sport', 'primarySport', 'position',
        'currentTeam', 'location', 'city', 'country', 'avatarUrl', 'coverPhoto', 'availability',
        'achievements', 'services', 'certifications', 'subscriptionPlan'
      ];
      const filled = fields.filter(function (f) { return !!profile[f]; }).length;
      const pct = Math.round((filled / fields.length) * 100);
      completionFill.style.width = pct + '%';
      completionPct.textContent = pct + '%';
    }

    const followersCountEl = document.getElementById('followersCount');
    if (followersCountEl) {
      followersCountEl.textContent = formatCount(profile.followersCount ?? profile.followers ?? 0);
    }
    const followingCountEl = document.getElementById('followingCount');
    if (followingCountEl) {
      followingCountEl.textContent = formatCount(profile.followingCount ?? profile.following ?? 0);
    }
    const postsCountEl = document.getElementById('postsCount');
    if (postsCountEl) {
      postsCountEl.textContent = formatCount(profile.postsCount ?? profile.mediaCount ?? 0);
    }
  }
  
  /* Profile change propagation: handled centrally via CurrentUserStore and the global `currentUserChanged` event. */

  /* ====== logout ====== */
  // Handle all logout triggers: #logoutBtn, [data-action="logout"], .profile-menu-item.logout
  document.addEventListener('click', async function(e) {
    const el = e.target.closest && e.target.closest('#logoutBtn, [data-action="logout"], .profile-menu-item.logout');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();

    if (window.Auth && typeof window.Auth.logout === 'function') {
      await window.Auth.logout();
    }
  });

  /* ====== like toggle + notification hook ====== */
  const randomSender = () => {
    const people = [
      { name: 'Mia', initials: 'MI', profileUrl: 'pages/profiles/athlete-profile.html' },
      { name: 'Sam', initials: 'SA', profileUrl: 'pages/profiles/coach-profile.html' },
      { name: 'Noah', initials: 'NO', profileUrl: 'pages/profiles/club-profile.html' },
      { name: 'Avery', initials: 'AV', profileUrl: 'pages/profiles/supportive_professional-profile.html' }
    ];
    return people[Math.floor(Math.random() * people.length)];
  };

  const createLikeNotification = (postTitle) => {
    const sender = randomSender();
    createNotification({
      type: 'like',
      text: `${sender.name} liked your post �${postTitle}=`,
      href: 'feed.html',
      sender,
      target: { type: 'post', title: postTitle, url: 'feed.html' }
    });
  };

  // NOTE: Like handlers are attached by attachLikeListeners() in the feed runtime section
  // to avoid duplicate listeners and inconsistent persistence paths.

  /* ====== follow toggle with live count sync ====== */
  function normalizeFollowTarget(name) {
    const safe = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    return safe ? `${safe}@spopeer.local` : '';
  }

  function updateCurrentUserFollowCounts(deltaFollowing) {
    try {
      const current = getCurrentUserData() || {};
      const nextFollowing = Math.max(0, Number(current.following || 0) + deltaFollowing);
      const updated = { ...current, following: nextFollowing };
      if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
        window.CurrentUserStore.setCurrentUser(updated);
      } else {
        try { localStorage.setItem('spopeer_user', JSON.stringify(updated)); } catch (e) { /* ignore */ }
      }
      if (typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('currentUserChanged', { detail: { user: updated } }));
      }
    } catch (e) {
      console.warn('Failed to update current follow counts:', e);
    }
  }

  document.querySelectorAll('.follow-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const item = this.closest('.follow-item');
      const targetName = item?.querySelector('.follow-name')?.textContent?.trim() || '';
      const targetId = normalizeFollowTarget(targetName);
      const following = this.textContent.trim() === 'Following';
      this.disabled = true;

      try {
        let success = true;
        // Try real API first
        if (typeof followManager !== 'undefined' && targetId) {
          success = following ? await followManager.unfollow(targetId) : await followManager.follow(targetId);
        } else if (targetId) {
          if (following) {
            await API.unfollow(targetId);
          } else {
            await API.follow(targetId);
          }
        }

        if (!success) return;

        this.textContent = following ? 'Follow' : 'Following';
        this.style.background = following ? '' : 'var(--accent)';
        this.style.color = following ? '' : '#fff';
        updateCurrentUserFollowCounts(following ? -1 : 1);
      } catch (e) {
        console.error('Follow toggle failed:', e);
      } finally {
        this.disabled = false;
      }
    });
  });

  /* ====== feed tabs ====== */
  /* feed tabs: visual toggle + filter handled in feed filtering section below */

  function getEditProfileUrl() {
    return 'pages/profiles/edit-profile.html';
  }

  function getProfileUrl() {
    const userData = getCurrentUserData();
    const identifier = userData?.id || userData?.userId || userData?.email || userData?.userEmail || '';
    return `/pages/profiles/public-profile.html?userId=${encodeURIComponent(identifier)}`;
  }

  // Expose to global scope so inline onclick can reach them
  window.navigateToProfile = function() {
    window.location.href = getProfileUrl();
  };

  window.navigateToEditProfile = function() {
    window.location.href = getEditProfileUrl();
  };

  window.getEditProfileUrl = getEditProfileUrl;
  window.getProfileUrl = getProfileUrl;

  const closeProfileMenu = () => {
    const menu = (window.getProfileMenuElement && typeof window.getProfileMenuElement === 'function') ? window.getProfileMenuElement() : document.getElementById('profileMenu');
    if (!menu) return;
    menu.classList.remove('visible');
    menu.setAttribute('aria-hidden', 'true');
  };

  const openProfileMenu = () => {
    const menu = (window.getProfileMenuElement && typeof window.getProfileMenuElement === 'function') ? window.getProfileMenuElement() : document.getElementById('profileMenu');
    if (!menu) return;
    menu.classList.add('visible');
    menu.setAttribute('aria-hidden', 'false');
  };

  /* ====== sidebar nav ====== */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function (event) {
      if (this.classList.contains('soon')) {
        event.preventDefault();
        return;
      }

      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    });
  });

  /* shared story/composer runtime is attached from js/shared-ui.js */

  /* ====== profile menu ====== */
  const profileMenu = (window.getProfileMenuElement && typeof window.getProfileMenuElement === 'function') ? window.getProfileMenuElement() : document.getElementById('profileMenu');

  /* -- SEARCH BAR -- */
  const navSearchInput = document.getElementById('navSearchInput');
  if (navSearchInput) {
    // Search on Enter key
    navSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = navSearchInput.value.trim();
        if (query) {
          window.location.href = '/pages/search/search.html?term=' + encodeURIComponent(query);
        }
      }
    });
    // Search on clicking the magnifying glass icon
    const searchIcon = navSearchInput.closest('.nav-search')?.querySelector('i');
    if (searchIcon) {
      searchIcon.style.cursor = 'pointer';
      searchIcon.addEventListener('click', () => {
        const query = navSearchInput.value.trim();
        if (query) {
          window.location.href = '/pages/search/search.html?term=' + encodeURIComponent(query);
        } else {
          navSearchInput.focus();
        }
      });
    }
  }
  

  // Profile menu toggle + section collapse + actions are handled by js/shared-ui.js.

  /* ====== notifications popover ====== */
  const notifBtn = document.getElementById('notifBtn');
  const notifPopover = document.getElementById('notifPopover');
  const notifList = document.getElementById('notifList');
  const notifBadge = document.getElementById('notifBadge');
  const clearNotifBtn = document.getElementById('clearNotifBtn');
  const viewAllNotif = document.getElementById('viewAllNotif');

  const NOTIF_KEY = 'spopeer_notifications';
  const NOTIF_LAST_SEEN_KEY = 'spopeer_notifications_lastSeen';

  const getLastSeen = () => {
    const stored = parseInt(localStorage.getItem(NOTIF_LAST_SEEN_KEY), 10);
    return Number.isFinite(stored) ? stored : 0;
  };

  const setLastSeen = ts => {
    localStorage.setItem(NOTIF_LAST_SEEN_KEY, String(ts));
  };

  const getStoredNotifications = () => {
    const stored = localStorage.getItem(NOTIF_KEY);
    if (!stored) return [];
    try { return JSON.parse(stored) || []; } catch { return []; }
  };

  const saveNotifications = notifs => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
  };

  const getUnseenCount = (notifs) => {
    return notifs.filter(n => !(n && (n.read === true || n.isRead === true))).length;
  };

  const updateBadge = (count) => {
    if (!notifBadge) return;
    if (count > 0) {
      notifBadge.style.display = 'block';
      notifBadge.title = `${count} unread notification${count === 1 ? '' : 's'}`;
    } else {
      notifBadge.style.display = 'none';
      notifBadge.title = '';
    }
  };

  const getNotifIcon = type => {
    switch (type) {
      case 'like': return { icon: 'fa-solid fa-heart', cls: 'notif-icon-like' };
      case 'comment': return { icon: 'fa-solid fa-comment', cls: 'notif-icon-comment' };
      case 'follow': return { icon: 'fa-solid fa-user-plus', cls: 'notif-icon-follow' };
      case 'event': return { icon: 'fa-solid fa-calendar-check', cls: 'notif-icon-event' };
      default: return { icon: 'fa-solid fa-bell', cls: 'notif-icon-event' };
    }
  };

  const formatRelativeTime = (iso) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const createNotification = (notif) => {
    const base = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `n_${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notif,
    };
    const items = getStoredNotifications();
    items.unshift(base);
    saveNotifications(items);
    return base;
  };

  const renderNotifications = () => {
    if (!notifList) return;

    const notifs = getStoredNotifications();
    const unseenCount = getUnseenCount(notifs);
    updateBadge(unseenCount);

    notifList.innerHTML = '';
    if (notifs.length === 0) {
      notifList.innerHTML = '<div style="padding: 14px 10px; color: var(--muted); font-size: 13px; text-align: center;">No notifications yet.</div>';
      return;
    }

    notifs.slice(0, 6).forEach(n => {
      const { icon, cls } = getNotifIcon(n.type);
      const when = formatRelativeTime(n.createdAt);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `notif-popover-item${n.read ? '' : ' unread'}`;
      const senderName = n.sender ? (n.sender.name || [n.sender.firstName, n.sender.lastName].filter(Boolean).join(' ')) : '';
      const senderInitials = senderName
        ? senderName.split(' ').map(part => (part && part[0]) || '').join('').slice(0, 2).toUpperCase()
        : '';
      item.innerHTML = `
        <div class="notif-popover-item-icon ${cls}">${senderInitials ? `<span>${senderInitials}</span>` : `<i class="${icon}"></i>`}</div>
        <div class="notif-popover-item-body">
          <div class="notif-popover-item-text">${n.text}</div>
          <div class="notif-popover-item-meta"><span>${when}</span></div>
        </div>`;

      item.addEventListener('click', () => {
        if (!n.read) {
          n.read = true;
          saveNotifications(notifs);
          renderNotifications();
          if (window.SpopeerAPI && typeof window.SpopeerAPI.markNotificationRead === 'function' && n.id) {
            window.SpopeerAPI.markNotificationRead(n.id).catch(function(){});
          }
        }
        if (n.href) {
          window.location.href = n.href;
        }
      });
      notifList.appendChild(item);
    });
  };

  const syncNotificationsFromApi = async () => {
    try {
      if (!window.SpopeerAPI || typeof window.SpopeerAPI.listNotifications !== 'function') return;
      const result = await window.SpopeerAPI.listNotifications({ page: 1, limit: 20 });
      const payload = Array.isArray(result)
        ? result
        : Array.isArray(result && result.data)
          ? result.data
          : Array.isArray(result && result.payload)
            ? result.payload
            : [];
      if (!Array.isArray(payload)) return;

      const mapped = payload.map((n) => ({
        id: String(n.id),
        createdAt: n.createdAt || new Date().toISOString(),
        read: !!n.isRead,
        type: n.type || 'event',
        text: n.text || 'You have a new notification.',
        href: n.href || '/pages/dashboard/notifications.html',
        sender: n.sender ? {
          name: [n.sender.firstName, n.sender.lastName].filter(Boolean).join(' '),
          initials: ((n.sender.firstName || '').charAt(0) + (n.sender.lastName || '').charAt(0)).toUpperCase()
        } : null
      }));

      saveNotifications(mapped);
      const unread = Number(result && result.unreadCount);
      updateBadge(Number.isFinite(unread) ? unread : mapped.filter((x) => !x.read).length);
    } catch (err) {
      console.debug('Notification API sync failed, using local cache:', err && err.message);
    }
  };

  const openNotifPopover = async () => {
    if (!notifPopover) return;
    await syncNotificationsFromApi();
    setLastSeen(Date.now());
    notifPopover.classList.add('visible');
    notifPopover.setAttribute('aria-hidden', 'false');
    renderNotifications();
  };

  const closeNotifPopover = () => {
    if (!notifPopover) return;
    notifPopover.classList.remove('visible');
    notifPopover.setAttribute('aria-hidden', 'true');
  };

  notifBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (!notifPopover) return;
    if (notifPopover.classList.contains('visible')) {
      closeNotifPopover();
    } else {
      closeProfileMenu();
      openNotifPopover();
    }
  });

  document.addEventListener('click', e => {
    if (!notifPopover) return;
    if (!notifPopover.contains(e.target) && !notifBtn?.contains(e.target)) {
      closeNotifPopover();
    }
  });

  clearNotifBtn?.addEventListener('click', () => {
    const notifs = getStoredNotifications().map(n => ({ ...n, read: true }));
    saveNotifications(notifs);
    setLastSeen(Date.now());
    renderNotifications();
    if (window.SpopeerAPI && typeof window.SpopeerAPI.markAllNotificationsRead === 'function') {
      window.SpopeerAPI.markAllNotificationsRead().catch(function(){});
    }
  });

  viewAllNotif?.addEventListener('click', () => {
    setLastSeen(Date.now());
    closeNotifPopover();
    window.location.href = '/pages/dashboard/notifications.html';
  });

  if (!localStorage.getItem(NOTIF_KEY)) {
    saveNotifications([]);
  }

  syncNotificationsFromApi().finally(renderNotifications);

  const scrollToHash = () => {
    const { hash } = window.location;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  scrollToHash();

  /* shared connection runtime is attached from js/shared-ui.js */

  /* -- TRENDING SYSTEM -- */
  function analyzeTrendingData() {
    const postCards = document.querySelectorAll('.post-card');
    const trends = {hashtags: {}, sports: {}, roles: {}, combined: []};
    const commonSports = ['Football','Basketball','Running','Swimming','Tennis','Cycling','Boxing','Volleyball','Athletics','Rugby','Cricket','Golf'];
    
    postCards.forEach(card => {
      const postText = card.querySelector('.post-text')?.textContent || '';
      const authorRole = card.querySelector('.author-role')?.textContent?.trim() || '';
      
      const hashtags = postText.match(/#\w+/g) || [];
      hashtags.forEach(tag => { trends.hashtags[tag] = (trends.hashtags[tag] || 0) + 1; });

      if (authorRole) { trends.roles[authorRole] = (trends.roles[authorRole] || 0) + 1; }

      commonSports.forEach(sport => {
        if (postText.toLowerCase().includes(sport.toLowerCase())) {
          trends.sports[sport] = (trends.sports[sport] || 0) + 1;
        }
      });
    });

    Object.entries(trends.hashtags).forEach(([tag, count]) => {
      trends.combined.push({ type: 'hashtag', name: tag, count, category: 'trending', icon: '#' });
    });
    Object.entries(trends.sports).forEach(([sport, count]) => {
      trends.combined.push({ type: 'sport', name: sport, count, category: 'sports', icon: 'fa-shoe-prints' });
    });
    Object.entries(trends.roles).forEach(([role, count]) => {
      trends.combined.push({ type: 'role', name: role, count, category: 'community', icon: 'fa-user' });
    });

    trends.combined.sort((a, b) => b.count - a.count);
    return trends;
  }

  // formatCount defined earlier in updateSidebarFromProfile section

  /* ====== accept / reject ====== */
  document.querySelectorAll('.conn-accept').forEach(btn => btn.addEventListener('click', () => btn.closest('li').remove()));
  document.querySelectorAll('.conn-reject').forEach(btn => btn.addEventListener('click', () => btn.closest('li').remove()));

  /* -- SIDEBAR STATS INTERACTION -- */
  const followersBtn = document.getElementById('followersBtn');
  const followingBtn = document.getElementById('followingBtn');
  const postsBtn = document.getElementById('postsBtn');

  if (followersBtn) {
    followersBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = '/pages/profiles/followers.html?type=followers';
    });
  }

  if (followingBtn) {
    followingBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = '/pages/profiles/followers.html?type=following';
    });
  }

  if (postsBtn) {
    postsBtn.addEventListener('click', () => {
      // redirect to user's posts - using a dedicated posts page
      window.location.href = '/pages/profiles/user-posts.html';
    });
  }

  // close popovers when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sp-stat')) {
      followersPopover?.classList.remove('active');
      followingPopover?.classList.remove('active');
    }
  });

  /* -- POST CREATION FEATURE -- */
  const createInput = document.querySelector('.create-input');
  const createPostBtn = document.querySelector('.create-post-btn');
  const createTools = document.querySelectorAll('.create-tool');
  const postComposerModal = document.getElementById('postComposerModal');
  const closeComposer = document.getElementById('closeComposer');
  const cancelComposer = document.getElementById('cancelComposer');
  const submitComposer = document.getElementById('submitComposer');
  const postContent = document.getElementById('postContent');
  const photoInput = document.getElementById('photoInput');
  const videoInput = document.getElementById('videoInput');
  const mediaPreview = document.getElementById('mediaPreview');
  const pollCreator = document.getElementById('pollCreator');
  const eventCreator = document.getElementById('eventCreator');
  const composerToolIcons = document.querySelectorAll('.composer-tool-icon');
  const postComposerBackdrop = document.querySelector('.post-composer-backdrop');

  // State management
  let composerState = {
    media: [],
    poll: null,
    event: null,
    type: 'text' // text, photo, video, poll, event
  };

  // Open composer from create input
  createInput?.addEventListener('click', openComposer);
  createInput?.addEventListener('focus', openComposer);

  // Open composer from tools
  createTools.forEach(tool => {
    tool.addEventListener('click', (e) => {
      e.preventDefault();
      openComposer();
      const toolType = tool.dataset.tool;
      if (toolType === 'poll') {
        togglePollCreator();
      } else if (toolType === 'event') {
        toggleEventCreator();
      } else if (toolType === 'photo') {
        photoInput.value = '';
        photoInput.click();
      } else if (toolType === 'video') {
        videoInput.value = '';
        videoInput.click();
      }
    });
  });

  // Composer tool icons
  composerToolIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      const toolType = icon.dataset.tool;
      if (toolType === 'poll') {
        togglePollCreator();
      } else if (toolType === 'event') {
        toggleEventCreator();
      } else if (toolType === 'photo') {
        photoInput.value = '';
        photoInput.click();
      } else if (toolType === 'video') {
        videoInput.value = '';
        videoInput.click();
      }
    });
  });

  // Open composer modal
  function openComposer() {
    postComposerModal.classList.add('visible');
    postContent.focus();
  }

  window.focusFeedComposer = function() {
    openComposer();
  };

  function resetComposerState() {
    if (postContent) postContent.value = '';
    mediaPreview.innerHTML = '';
    photoInput.value = '';
    videoInput.value = '';
    pollCreator.style.display = 'none';
    eventCreator.style.display = 'none';
    composerState = { media: [], poll: null, event: null, type: 'text' };
  }

  // Close composer modal
  function closeComposerModal() {
    postComposerModal.classList.remove('visible');
    resetComposerState();
  }

  closeComposer?.addEventListener('click', closeComposerModal);
  cancelComposer?.addEventListener('click', closeComposerModal);
  postComposerBackdrop?.addEventListener('click', closeComposerModal);

  // Toggle poll creator
  function togglePollCreator() {
    const isVisible = pollCreator.style.display !== 'none';
    pollCreator.style.display = isVisible ? 'none' : 'block';
    eventCreator.style.display = 'none';
    composerState.type = isVisible ? 'text' : 'poll';
    if (!isVisible) {
      // Initialize poll if creating new one
      composerState.poll = {
        question: '',
        options: ['', '']
      };
    }
  }

  // Toggle event creator
  function toggleEventCreator() {
    const isVisible = eventCreator.style.display !== 'none';
    eventCreator.style.display = isVisible ? 'none' : 'block';
    pollCreator.style.display = 'none';
    composerState.type = isVisible ? 'text' : 'event';
    if (!isVisible) {
      // Initialize event if creating new one
      composerState.event = {
        title: '',
        dateTime: '',
        location: '',
        description: ''
      };
    }
  }

  // Add poll option
  let pollOptionsCount = 2;

  function addPollOption() {
    pollOptionsCount += 1;

    const container = document.getElementById("pollOptionsContainer");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "poll-option-input";
    input.placeholder = "Option " + pollOptionsCount;
    input.dataset.pollOption = "true";

    container.appendChild(input);
  }

  function collectPollOptions() {
    const inputs = document.querySelectorAll("[data-poll-option='true']");

    return Array.from(inputs)
      .map((input) => input.value.trim())
      .filter((value) => value.length > 0);
  }

  window.addPollOption = addPollOption;

  // Photo input handler
  photoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      openComposer();
      const reader = new FileReader();
      reader.onload = (event) => {
        addMediaPreview(event.target.result, 'image', file);
      };
      reader.readAsDataURL(file);
      composerState.type = 'photo';
    }
  });

  // Video input handler
  videoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      openComposer();
      const reader = new FileReader();
      reader.onload = (event) => {
        addMediaPreview(event.target.result, 'video', file);
      };
      reader.readAsDataURL(file);
      composerState.type = 'video';
    }
  });

  // Add media preview
  function addMediaPreview(src, type, file) {
    // Composer currently supports one media attachment; replace any stale file.
    mediaPreview.innerHTML = '';
    composerState.media = [];

    const mediaItem = document.createElement('div');
    mediaItem.className = 'media-preview-item';
    
    if (type === 'image') {
      mediaItem.innerHTML = `
        <img src="${src}" alt="preview">
        <button class="media-remove-btn" type="button"><i class="fa-solid fa-xmark"></i></button>
      `;
    } else {
      mediaItem.innerHTML = `
        <video><source src="${src}" type="video/mp4"></video>
        <button class="media-remove-btn" type="button"><i class="fa-solid fa-xmark"></i></button>
      `;
    }

    mediaItem.querySelector('.media-remove-btn').addEventListener('click', (e) => {
      e.preventDefault();
      mediaItem.remove();
      composerState.media = composerState.media.filter(m => m.file !== file);
      if (type === 'image') {
        photoInput.value = '';
      } else if (type === 'video') {
        videoInput.value = '';
      }
      if (composerState.media.length === 0) {
        composerState.type = 'text';
      }
    });

    mediaPreview.appendChild(mediaItem);
    composerState.media.push({ src, type, file });
  }

  async function submitPost() {
    const contentInput = document.getElementById("postContent");
    const content = contentInput ? contentInput.value.trim() : "";
    const user = getCurrentUserData ? getCurrentUserData() : {};
    const sport = (user && (user.primarySport || user.sport)) || "General";
    const mediaFile = composerState.media && composerState.media[0] ? composerState.media[0].file : null;
    const mediaType = composerState.media && composerState.media[0] ? composerState.media[0].type : null;
    const activeType = composerState.type || "text";

    const formData = new FormData();
    let finalContent = content;

    formData.append("sport", sport);

    if (mediaFile) {
      formData.append("image", mediaFile);
      if (mediaType === "video") {
        formData.append("type", "video");
      } else {
        formData.append("type", "photo");
      }
    }

    if (activeType === "poll") {
      const options = collectPollOptions();
      const pollQuestion = (document.getElementById("pollQuestion")?.value || "").trim();

      if (options.length < 2) {
        window.SpopeerAPI.showNotification("Poll needs at least 2 options.", "warning");
        return;
      }

      formData.append("type", "poll");
      formData.append("pollOptions", JSON.stringify(options));
      finalContent = pollQuestion || content || "Poll";
    } else if (activeType === "event") {
      const title = (document.getElementById("eventTitle")?.value || "").trim();
      const dateTime = (document.getElementById("eventDateTime")?.value || "").trim();
      const location = (document.getElementById("eventLocation")?.value || "").trim();
      const description = (document.getElementById("eventDescription")?.value || "").trim();

      const eventParts = [
        title ? "Event: " + title : "",
        dateTime ? "When: " + dateTime : "",
        location ? "Where: " + location : "",
        description ? "Details: " + description : ""
      ].filter(Boolean);

      formData.append("type", "event");
      if (eventParts.length) {
        finalContent = [content, eventParts.join("\n")].filter(Boolean).join("\n\n");
      }
    }

    if (!finalContent && !mediaFile) {
      window.SpopeerAPI.showNotification("Write text or add an image/video.", "warning");
      contentInput?.focus();
      return;
    }

    formData.append("content", finalContent);

    try {
      submitComposer.disabled = true;
      await window.SpopeerFeedEngine.createPost(formData);

      if (typeof window.loadFeed === "function") {
        await window.loadFeed();
      }

      closeComposerModal();
      window.SpopeerAPI.showNotification("Post published.", "success");
    } catch (error) {
      console.error("Post publish failed:", error);
      window.SpopeerAPI.showNotification(error.message || "Failed to publish post.", "error");
    } finally {
      submitComposer.disabled = false;
    }
  }

  submitComposer?.addEventListener('click', submitPost);

  // Helper function to extract hashtags
  function extractHashtags(text) {
    const matches = text.match(/#\w+/g) || [];
    return matches.map(tag => tag.substring(1));
  }

  // Helper function to extract mentions
  function extractMentions(text) {
    const matches = text.match(/@\w+/g) || [];
    return matches.map(mention => mention.substring(1));
  }

  // Function to add new post to feed
  function addPostToFeed(post, userData, postData) {
    const feedCol = document.querySelector('.feed-col');
    const createCard = document.getElementById('sp-inline-composer') || document.querySelector('.game-tape-container');

    const userInitials = (userData.firstName?.[0]?.toUpperCase() || '') + (userData.lastName?.[0]?.toUpperCase() || '') || 'U';
    const userRole = userData.role || 'Athlete';
    const userName = ((userData.firstName || '') + ' ' + (userData.lastName || '')).trim() || userData.username || 'User';
    
    const avatarClass = {
      'Athlete': 'av-orange',
      'Coach': 'av-blue',
      'Club': 'av-green',
      'Pro': 'av-purple'
    }[userRole] || 'av-orange';

    const roleTagClass = userRole === 'Coach' || userRole === 'Pro' ? 'blue' : '';
    const userIdentifier = userData.id || userData.userId || userData.email || userData.userEmail || userData.username || '';
    const userProfileHref = userIdentifier
      ? `/pages/profiles/public-profile.html?userId=${encodeURIComponent(userIdentifier)}`
      : '';
    const avatarUrl = userData.avatarUrl || userData.profileImage || '';
    const userAvatarHtml = avatarUrl
      ? `<img src="${escapeHtml(String(avatarUrl))}" alt="${escapeHtml(userName)} profile picture" loading="lazy">`
      : userInitials;

    // Build media HTML
    let mediaHTML = '';
    if (postData.media && postData.media.length > 0) {
      mediaHTML = '<div class="post-media-gallery">';
      postData.media.forEach(m => {
        if (m.type === 'image') {
          mediaHTML += `<img src="${m.url}" alt="post image" style="max-width: 100%; border-radius: 8px; margin: 14px 0;">`;
        } else if (m.type === 'video') {
          mediaHTML += `<video controls style="max-width: 100%; border-radius: 8px; margin: 14px 0;"><source src="${m.url}" type="video/mp4"></video>`;
        }
      });
      mediaHTML += '</div>';
    }

    // Build poll HTML
    let pollHTML = '';
    if (composerState.poll) {
      pollHTML = `
        <div class="post-poll" style="margin: 14px 0; padding: 14px; background: var(--surface); border-radius: 8px;">
          <div style="font-weight: 600; margin-bottom: 10px;">${escapeHtml(composerState.poll.question)}</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${composerState.poll.options.map((opt, i) => `
              <div style="padding: 8px 12px; background: white; border-radius: 6px; cursor: pointer; border: 1px solid var(--border); transition: 0.2s;" onmouseover="this.style.background='var(--accent-lt)'" onmouseout="this.style.background='white'">
                ${escapeHtml(opt)}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Build event HTML
    let eventHTML = '';
    if (composerState.event) {
      const event = composerState.event;
      eventHTML = `
        <div class="post-event" style="margin: 14px 0; padding: 14px; background: var(--surface); border-radius: 8px; border-left: 4px solid var(--accent);">
          <div style="font-weight: 700; font-size: 14px; color: var(--ink); margin-bottom: 4px;"><i class="fa-regular fa-calendar" style="margin-right: 6px;"></i>${escapeHtml(event.title)}</div>
          <div style="font-size: 12px; color: var(--muted); margin-bottom: 4px;"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${new Date(event.dateTime).toLocaleString()}</div>
          <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;"><i class="fa-regular fa-location-dot" style="margin-right: 4px;"></i>${escapeHtml(event.location)}</div>
          <div style="font-size: 13px; color: var(--ink-2);">${escapeHtml(event.description)}</div>
        </div>
      `;
    }

    const postHTML = `
      <div class="post-card">
        <div class="post-body">
          <div class="post-head">
            <div class="post-author">
              ${userProfileHref
                ? `<a class="author-profile-link" href="${userProfileHref}" aria-label="View ${escapeHtml(userName)} profile">`
                : '<div class="author-profile-link">'}
                <div class="author-av ${avatarClass}">${userAvatarHtml}</div>
                <div class="author-info">
                  <div class="author-name">${escapeHtml(userName)}</div>
                  <div class="author-meta">
                    <span class="role-tag ${roleTagClass}">${escapeHtml(userRole)}</span>
                    @${escapeHtml(userData.username || 'user')} now
                  </div>
                </div>
              ${userProfileHref ? '</a>' : '</div>'}
            </div>
            <button class="post-menu-btn"><i class="fa-solid fa-ellipsis"></i></button>
          </div>
          <p class="post-text">${escapeHtml(post.content || '')}</p>
          ${postData.hashtags && postData.hashtags.length > 0 ? `
            <div class="post-tags">
              ${postData.hashtags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
          ` : ''}
          ${mediaHTML}
          ${pollHTML}
          ${eventHTML}
          <div class="post-stats">
            <span><i class="fa-regular fa-eye"></i> 0 views</span>
            <span><i class="fa-regular fa-heart"></i> 0 likes</span>
            <span><i class="fa-regular fa-message"></i> 0 comments</span>
          </div>
          <div class="post-actions">
            <button class="act-btn like-btn"><i class="fa-regular fa-heart"></i> Like</button>
            <button class="act-btn comment-btn"><i class="fa-regular fa-message"></i> Comment</button>
            <button class="act-btn repost-btn"><i class="fa-solid fa-retweet"></i> Repost</button>
            <button class="act-btn share-post-btn"><i class="fa-regular fa-share-from-square"></i> Share</button>
          </div>
        </div>
      </div>
    `;

    createCard.insertAdjacentHTML('afterend', postHTML);

    const newLikeBtn = feedCol.querySelector('.post-card:nth-of-type(2) .like-btn');
    if (newLikeBtn) {
      newLikeBtn.addEventListener('click', function() {
        this.classList.toggle('liked');
        this.innerHTML = this.classList.contains('liked')
          ? '<i class="fa-solid fa-heart"></i> Liked'
          : '<i class="fa-regular fa-heart"></i> Like';
      });
    }
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Keyboard shortcut to close modal (Escape key)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && postComposerModal.classList.contains('visible')) {
      closeComposerModal();
    }
  });

  /* -- FEED ENGINE TABS -- */

  const feedTabs = document.querySelectorAll(".feed-tab");
  const sportTabWrap = document.getElementById("sportTabWrap");
  const sportsDropdown = document.getElementById("sportsDropdown");
  const sportsDropdownList = document.getElementById("sportsDropdownList");
  const closeSportsDropdown = document.getElementById("closeSportsDropdown");
  const sportIndicator = document.getElementById("sportIndicator");
  const feedMount = document.getElementById("feedPostsMount") || document.querySelector(".feed-col");

  const _feedUser = getCurrentUserData();
  const primarySport = _feedUser.primarySport || _feedUser.sport || "Running";
  const secondarySports = Array.isArray(_feedUser.secondarySports) ? _feedUser.secondarySports : [];

  const savedSettings = JSON.parse(localStorage.getItem("spopeer_settings") || "{}");
  let currentTab = "for-you";
  if (savedSettings.feedDefault === "following") {
    currentTab = "following";
  } else if (savedSettings.feedDefault === "my-sport") {
    currentTab = "sport";
  }

  let selectedSports = [primarySport];
  const FEED_PAGE_SIZE = 12;
  let currentFeedPosts = [];
  let currentFeedVisibleCount = 0;
  let feedInfiniteObserver = null;

  function getFeedInfiniteScrollRoot() {
    if (!window.matchMedia || !window.matchMedia('(min-width: 1025px)').matches) {
      return null;
    }

    return document.querySelector('.feed-col');
  }

  function teardownInfiniteFeedObserver() {
    if (feedInfiniteObserver) {
      feedInfiniteObserver.disconnect();
      feedInfiniteObserver = null;
    }
  }

  function buildFeedChunkHtml(posts, startIndex, endIndex) {
    var parts = [];
    for (var i = startIndex; i < endIndex; i += 1) {
      var post = posts[i];
      parts.push(renderPostCard(post));
      if ((i + 1) % 4 === 0) {
        parts.push('<section class="feed-sponsored-slot" data-sponsored-slot="feed-inline-' + (Math.floor(i / 4) + 1) + '"></section>');
      }
    }
    return parts.join('');
  }

  function appendNextFeedChunk() {
    const container = document.getElementById('generatedFeedContainer');
    if (!container) return false;
    if (currentFeedVisibleCount >= currentFeedPosts.length) return false;

    const startIndex = currentFeedVisibleCount;
    const endIndex = Math.min(startIndex + FEED_PAGE_SIZE, currentFeedPosts.length);
    const sentinel = document.getElementById('feedInfiniteSentinel');
    const chunkHtml = buildFeedChunkHtml(currentFeedPosts, startIndex, endIndex);

    if (sentinel) {
      sentinel.insertAdjacentHTML('beforebegin', chunkHtml);
    } else {
      container.insertAdjacentHTML('beforeend', chunkHtml);
    }

    const newlyVisiblePosts = currentFeedPosts.slice(startIndex, endIndex);
    if (window.SpopeerFeedEngine) {
      newlyVisiblePosts.forEach(function (post) {
        window.SpopeerFeedEngine.markViewed(post.id);
      });
    }

    currentFeedVisibleCount = endIndex;

    if (window.SpopeerAds && typeof window.SpopeerAds.refreshSlots === 'function') {
      window.SpopeerAds.refreshSlots();
    }

    return currentFeedVisibleCount < currentFeedPosts.length;
  }

  function setupInfiniteFeedObserver() {
    teardownInfiniteFeedObserver();

    const sentinel = document.getElementById('feedInfiniteSentinel');
    const observerRoot = getFeedInfiniteScrollRoot();
    if (!sentinel) return;

    if (typeof IntersectionObserver !== 'function') {
      while (appendNextFeedChunk()) {
        // Fallback: render all posts when observer is unavailable.
      }
      return;
    }

    feedInfiniteObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const hasMore = appendNextFeedChunk();
        if (!hasMore) {
          teardownInfiniteFeedObserver();
          const marker = document.getElementById('feedInfiniteSentinel');
          if (marker) marker.remove();
        }
      });
    }, {
      root: observerRoot,
      rootMargin: '600px 0px',
      threshold: 0.01
    });

    feedInfiniteObserver.observe(sentinel);
  }

  function renderPoll(post) {
    if (post.type !== "poll") return "";

    const options = Array.isArray(post.pollOptions) ? post.pollOptions : [];
    const votes = Array.isArray(post.pollVotes) ? post.pollVotes : options.map(() => 0);
    const totalVotes = votes.reduce((sum, vote) => sum + Number(vote || 0), 0);

    return `
      <div class="poll-box" data-poll-box="${post.id}">
        ${options.map((option, index) => {
          const count = Number(votes[index] || 0);
          const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;

          return `
            <button class="poll-option" onclick="votePoll(${post.id}, ${index})">
              <span>${escapeHtml(option)}</span>
              <strong>${percent}%</strong>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function parseEventContent(text) {
    const lines = (text || '').split('\n');
    const result = { title: '', when: '', where: '', details: '', extra: [] };
    lines.forEach(function(line) {
      if (/^Event:\s*/i.test(line))   result.title   = line.replace(/^Event:\s*/i, '').trim();
      else if (/^When:\s*/i.test(line))    result.when    = line.replace(/^When:\s*/i, '').trim();
      else if (/^Where:\s*/i.test(line))   result.where   = line.replace(/^Where:\s*/i, '').trim();
      else if (/^Details:\s*/i.test(line)) result.details = line.replace(/^Details:\s*/i, '').trim();
      else if (line.trim()) result.extra.push(line.trim());
    });
    return result;
  }

  function renderEventCardHtml(text) {
    var ev = parseEventContent(text || '');
    var rows = '';
    if (ev.when)    rows += '<div class="post-event-row"><i class="fa-regular fa-clock"></i><span>' + escapeHtml(ev.when) + '</span></div>';
    if (ev.where)   rows += '<div class="post-event-row"><i class="fa-solid fa-location-dot"></i><span>' + escapeHtml(ev.where) + '</span></div>';
    if (ev.details) rows += '<div class="post-event-row"><i class="fa-regular fa-file-lines"></i><span>' + escapeHtml(ev.details) + '</span></div>';
    ev.extra.forEach(function(l) { rows += '<div class="post-event-row"><i class="fa-solid fa-circle-dot"></i><span>' + escapeHtml(l) + '</span></div>'; });
    return '<div class="post-event-card">'
      + '<div class="post-event-header">'
      +   '<div class="post-event-icon"><i class="fa-solid fa-calendar-days"></i></div>'
      +   '<span class="post-event-badge">Event</span>'
      +   (ev.title ? '<h3 class="post-event-title">' + escapeHtml(ev.title) + '</h3>' : '')
      + '</div>'
      + (rows ? '<div class="post-event-details">' + rows + '</div>' : '')
      + '</div>';
  }

  function renderPostCard(post) {
    var imageUrl = post.image || null;
    var videoUrl = post.video || null;
    if (!videoUrl && imageUrl && (post.type === 'video' || /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(String(imageUrl)))) {
      videoUrl = imageUrl;
      imageUrl = null;
    }
    var mediaHtml = '';
    if (post.type === 'event') {
      mediaHtml += renderEventCardHtml(post.text || '');
    } else {
      if (imageUrl) {
        mediaHtml += '<div class="post-media"><img src="' + escapeHtml(imageUrl) + '" alt="Post image" loading="lazy"></div>';
      }
      if (videoUrl) {
        mediaHtml += '<div class="post-media"><video controls><source src="' + escapeHtml(videoUrl) + '"></video></div>';
      }
    }

    var authorName = post.authorName || 'Unknown user';
    var authorIdentifier = post.authorId || post.userId || post.authorEmail || post.userEmail || post.authorUsername || '';
    var authorProfileHref = authorIdentifier
      ? '/pages/profiles/public-profile.html?userId=' + encodeURIComponent(authorIdentifier)
      : '';
    var authorInitials = (post.authorInitials || authorName.split(' ').map(function (n) { return n[0] || ''; }).join('').slice(0, 2)).toUpperCase() || 'U';
    var authorAvatarUrl = post.authorAvatarUrl || post.avatarUrl || '';
    var authorAvatarHtml = authorAvatarUrl
      ? '<img src="' + escapeHtml(String(authorAvatarUrl)) + '" alt="' + escapeHtml(authorName) + ' profile picture" loading="lazy">'
      : authorInitials;

    return `
      <article class="post-card" data-post-id="${post.id}">
        <div class="post-body">
          <div class="post-head">
            <div class="post-author">
              ${authorProfileHref
                ? `<a class="author-profile-link" href="${authorProfileHref}" aria-label="View ${escapeHtml(authorName)} profile">`
                : '<div class="author-profile-link">'}
                <div class="author-av av-orange">${authorAvatarHtml}</div>
                <div class="author-info">
                  <div class="author-name">${escapeHtml(authorName)}</div>
                  <div class="author-meta">
                    <span class="role-tag">${escapeHtml(post.role || "athlete")}</span>
                    <span>${escapeHtml(post.sport || "")}</span>
                  </div>
                </div>
              ${authorProfileHref ? '</a>' : '</div>'}
            </div>
          </div>
          <div class="post-meta">
            ${post.sport || "General"} � ${new Date(post.createdAt).toLocaleString()}
          </div>
          <div class="post-text">${escapeHtml(post.text || "")}</div>
          ${mediaHtml}
          ${renderPoll(post)}
          <div class="post-actions">
            <button
              type="button"
              class="post-action-btn ${post.liked ? 'active' : ''}"
              data-like-button="${post.id}"
              data-count="${post.likesCount || 0}"
              onclick="likePost(${post.id})">
              <i class="fa-${post.liked ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i>
              <span class="action-label">Like</span>
              <span class="action-count">${post.likesCount || 0}</span>
            </button>
            <button
              type="button"
              class="post-action-btn"
              data-comment-button="${post.id}"
              data-count="${post.commentsCount || 0}"
              onclick="toggleComments(${post.id})">
              <i class="fa-regular fa-comment-dots" aria-hidden="true"></i>
              <span class="action-label">Comment</span>
              <span class="action-count">${post.commentsCount || 0}</span>
            </button>
            <button
              type="button"
              class="post-action-btn"
              data-repost-button="${post.id}"
              data-count="${post.repostsCount || 0}"
              onclick="repostPost(${post.id})">
              <i class="fa-solid fa-retweet" aria-hidden="true"></i>
              <span class="action-label">Repost</span>
              <span class="action-count">${post.repostsCount || 0}</span>
            </button>
            <button
              type="button"
              class="post-action-btn"
              data-save-button="${post.id}"
              onclick="savePost(${post.id})">
              <i class="fa-regular fa-bookmark" aria-hidden="true"></i>
              <span class="action-label">Save</span>
            </button>
          </div>
          <div class="comments-panel" data-comments-panel="${post.id}">
            <div class="comments-list" data-comments-list="${post.id}"></div>
            <div class="comment-form">
              <input type="text" data-comment-input="${post.id}" placeholder="Write a comment..." />
              <button type="button" data-comment-submit="${post.id}" onclick="submitComment(${post.id})">Send</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderFeed(posts) {
    teardownInfiniteFeedObserver();

    const oldContainer = document.getElementById("generatedFeedContainer");
    if (oldContainer) oldContainer.remove();

    const container = document.createElement("div");
    container.id = "generatedFeedContainer";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "14px";

    currentFeedPosts = Array.isArray(posts) ? posts.slice() : [];
    currentFeedVisibleCount = 0;

    if (!currentFeedPosts.length) {
      container.innerHTML = `
        <div class="feed-empty-state">
          <div class="feed-empty-icon"><i class="fa-regular fa-compass"></i></div>
          <h3>Nothing here yet</h3>
          <p>No posts for this tab yet. Try a different tab or follow more people to fill your feed.</p>
          <div class="feed-empty-actions">
            <a href="/pages/search/search.html" class="feed-empty-btn-primary"><i class="fa-solid fa-magnifying-glass"></i> Discover people</a>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '<div class="feed-infinite-sentinel" id="feedInfiniteSentinel" aria-hidden="true"></div>';
    }

    const insertAfter = document.getElementById("sp-inline-composer") || document.querySelector(".game-tape-container");
    if (insertAfter && insertAfter.parentNode) {
      insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
    } else if (feedMount) {
      feedMount.appendChild(container);
    }

    if (currentFeedPosts.length) {
      appendNextFeedChunk();
      setupInfiniteFeedObserver();
    }
  }

  function updateSportIndicator() {
    if (!sportIndicator) return;
    if (selectedSports.length === 1) {
      sportIndicator.textContent = selectedSports[0].slice(0, 3).toUpperCase();
    } else {
      sportIndicator.textContent = String(selectedSports.length);
    }
  }

  function normalizeFeedPost(post) {
    if (!post || typeof post !== 'object') {
      return {
        id: '',
        authorName: 'Unknown user',
        role: 'athlete',
        sport: '',
        text: '',
        image: null,
        video: null,
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      };
    }

    var author = post.author && typeof post.author === 'object' ? post.author : null;
    var authorName =
      (post.authorName) ||
      (author && ((author.displayName || '').trim())) ||
      (author && (((author.firstName || '') + ' ' + (author.lastName || '')).trim())) ||
      'Unknown user';
    var initials = authorName.split(' ').map(function (n) { return n[0] || ''; }).join('').slice(0, 2).toUpperCase() || 'U';

    var mediaArray = Array.isArray(post.media) ? post.media : [];
    var imageFromArray = mediaArray.find(function (m) { return m && (m.type === 'image' || /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(String(m.url || m.src || ''))); });
    var videoFromArray = mediaArray.find(function (m) { return m && (m.type === 'video' || /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(String(m.url || m.src || ''))); });

    return {
      id: post.id,
      authorName: authorName,
      authorId: post.authorId || post.userId || (author && (author.id || author.userId)) || '',
      authorEmail: post.authorEmail || post.userEmail || (author && (author.email || author.userEmail)) || '',
      authorUsername: post.authorUsername || post.username || (author && author.username) || '',
      authorAvatarUrl: post.authorAvatarUrl || post.avatarUrl || post.profilePicture || (author && (author.avatarUrl || author.profilePicture || author.profileImage)) || '',
      role: post.role || post.userType || (author && author.role) || 'athlete',
      sport: post.sport || (author && author.sport) || '',
      createdAt: post.createdAt || new Date().toISOString(),
      text: post.text || post.content || '',
      image: post.image || (imageFromArray && (imageFromArray.url || imageFromArray.src)) || null,
      video: post.video || (videoFromArray && (videoFromArray.url || videoFromArray.src)) || null,
      likesCount: Number(post.likesCount ?? post.likes ?? 0),
      commentsCount: Number(post.commentsCount ?? post.comments ?? 0),
      repostsCount: Number(post.repostsCount ?? post.shares ?? 0),
      type: post.type || 'post',
      pollOptions: Array.isArray(post.pollOptions) ? post.pollOptions : [],
      pollVotes: Array.isArray(post.pollVotes) ? post.pollVotes : [],
      views: Number(post.views ?? post.viewCount ?? post.viewsCount ?? 0),
      authorInitials: initials
    };
  }

  function populateSportsDropdown() {
    if (!sportsDropdownList) return;

    const allSports = [primarySport, ...secondarySports].filter(Boolean);
    sportsDropdownList.innerHTML = "";

    allSports.forEach((sport, index) => {
      const btn = document.createElement("button");
      btn.className = "sports-dropdown-item" + (selectedSports.includes(sport) ? " active" : "");
      if (index === 0) btn.classList.add("primary-sport");

      btn.innerHTML = `
        <span class="sports-dropdown-item-icon">
          ${selectedSports.includes(sport) ? '<i class="fa-solid fa-check"></i>' : ""}
        </span>
        ${sport}
      `;

      btn.addEventListener("click", () => {
        selectedSports = [sport];
        updateSportIndicator();
        populateSportsDropdown();
        renderCurrentTab();
        if (sportsDropdown) sportsDropdown.style.display = "none";
      });

      sportsDropdownList.appendChild(btn);
    });

    if (allSports.length > 1) {
      const divider = document.createElement("div");
      divider.className = "sports-dropdown-divider";
      sportsDropdownList.appendChild(divider);

      const allBtn = document.createElement("button");
      allBtn.className = "sports-dropdown-item";
      allBtn.innerHTML = `
        <span class="sports-dropdown-item-icon"><i class="fa-solid fa-globe"></i></span>
        All My Sports
      `;
      allBtn.addEventListener("click", () => {
        selectedSports = [...allSports];
        updateSportIndicator();
        populateSportsDropdown();
        renderCurrentTab();
        if (sportsDropdown) sportsDropdown.style.display = "none";
      });
      sportsDropdownList.appendChild(allBtn);
    }
  }

  async function renderCurrentTab() {
    if (!window.SpopeerFeedEngine) return;

    let posts = [];
    if (currentTab === "for-you") {
      posts = await window.SpopeerFeedEngine.getForYouFeed();
    } else if (currentTab === "following") {
      posts = await window.SpopeerFeedEngine.getFollowingFeed();
    } else if (currentTab === "sport") {
      posts = await window.SpopeerFeedEngine.getSportFeed(selectedSports);
    } else if (currentTab === "trending") {
      posts = await window.SpopeerFeedEngine.getTrendingFeed();
    }

    var normalizedPosts = (Array.isArray(posts) ? posts : []).map(normalizeFeedPost);
    renderFeed(normalizedPosts);
  }

  function renderPosts(posts) {
    var normalizedPosts = (Array.isArray(posts) ? posts : []).map(normalizeFeedPost);
    renderFeed(normalizedPosts);
  }

  async function loadFeed() {
    await renderCurrentTab();
  }

  window.loadFeed = loadFeed;
  window.renderFeed = renderFeed;
  window.renderCurrentTab = renderCurrentTab;

  async function votePoll(postId, optionIndex) {
    await window.SpopeerAPI.votePoll(postId, optionIndex);

    if (typeof window.loadFeed === "function") {
      await window.loadFeed();
    }
  }

  async function likePost(postId) {
    await window.SpopeerAPI.toggleLike(postId);
    await loadFeed();
  }

  async function repostPost(postId) {
    await window.SpopeerAPI.repost(postId);
    await loadFeed();
  }

  async function savePost(postId) {
    await window.SpopeerAPI.savePost(postId);
    alert("Saved.");
  }

  async function openComments(postId) {
    const result = await window.SpopeerAPI.getComments(postId);
    const comments = Array.isArray(result) ? result : (result && Array.isArray(result.comments) ? result.comments : []);
    alert("Comments: " + comments.length);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const posts = await window.SpopeerFeedEngine.getForYouFeed();

    console.log("[Spopeer Feed] posts to render:", posts);

    if (typeof renderPosts === "function") {
      renderPosts(posts);
    }
  });

  // Activate initial tab visually based on saved setting
  feedTabs.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === currentTab);
  });

  feedTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      feedTabs.forEach(btn => btn.classList.remove("active"));
      tab.classList.add("active");

      currentTab = tab.dataset.tab;

      if (currentTab === "sport" && sportsDropdown) {
        sportsDropdown.style.display =
          sportsDropdown.style.display === "block" ? "none" : "block";
      } else if (sportsDropdown) {
        sportsDropdown.style.display = "none";
      }

      renderCurrentTab();
    });
  });

  closeSportsDropdown?.addEventListener("click", () => {
    if (sportsDropdown) sportsDropdown.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (!sportsDropdown || !sportTabWrap) return;
    if (!sportTabWrap.contains(e.target)) {
      sportsDropdown.style.display = "none";
    }
  });

  // Functions previously exposed for legacy onclick handlers are now handled via delegated listeners
  // Removed deprecated window function assignments: closeStories, nextStory, prevStory, viewStory, likePost, votePoll, repostPost, savePost, openComments

  updateSportIndicator();
  populateSportsDropdown();
  renderCurrentTab();

})();

/* -- SHARE PROFILE MODAL -- */
function openShareModal() {
  try {
    const ud = getCurrentUserData();
    if (ud) {
      const _dn = ud.displayName || [ud.firstName, ud.lastName].filter(Boolean).join(' ') || 'User';
      const init = _dn.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U';
      const handle = ud.email?.split('@')[0] || 'user';
      const canonicalUrl = `${window.location.origin}/pages/profiles/public-profile.html?userId=${encodeURIComponent(ud?.id || ud?.userId || ud?.email || ud?.userEmail || handle)}`;
      const roleMap = { athlete:'Athlete', coach:'Coach', club:'Club', supportive_professional:'Pro' };
      document.getElementById('shareModalAv').textContent   = init;
      document.getElementById('shareModalName').textContent = _dn;
      document.getElementById('shareModalRole').textContent = roleMap[ud.role || ud.userType] || 'Athlete';
      document.getElementById('shareModalSport').textContent = ud.sport || '';
      document.getElementById('shareModalUrl').textContent  = canonicalUrl;
    }
    const overlay = document.getElementById('shareModalOverlay');
    if (overlay) {
      overlay.classList.add('visible');
    }
  } catch (error) {
    console.error('Error in openShareModal:', error);
  }
}

function closeShareModal() {
  const overlay = document.getElementById('shareModalOverlay');
  if (overlay) {
    overlay.classList.remove('visible');
  }
}

function copyShareLink() {
  const ud = getCurrentUserData();
  const handle = ud?.email?.split('@')[0] || 'user';
  const url = `${window.location.origin}/pages/profiles/public-profile.html?userId=${encodeURIComponent(ud?.id || ud?.userId || ud?.email || ud?.userEmail || handle)}`;
  navigator.clipboard?.writeText(url).catch(() => {});
  const btn = document.getElementById('shareCopyBtn');
  btn.classList.add('copied');
  btn.innerHTML = '<i class="fa-solid fa-check" style="font-size:11px"></i> Copied!';
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.innerHTML = '<i class="fa-regular fa-copy" style="font-size:11px"></i> Copy';
  }, 2000);
}

function shareVia(platform) {
  const ud = getCurrentUserData();
  const handle = ud?.email?.split('@')[0] || 'user';
  const canonical = `${window.location.origin}/pages/profiles/public-profile.html?userId=${encodeURIComponent(ud?.id || ud?.userId || ud?.email || ud?.userEmail || handle)}`;
  const url  = encodeURIComponent(canonical);
  const text = encodeURIComponent(`Check out ${ud?.displayName || ud?.name || 'my'} profile on Spopeer!`);
  const targets = {
    x:         `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    whatsapp:  `https://wa.me/?text=${text}%20${url}`,
    linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    instagram: null,
  };
  if (targets[platform]) window.open(targets[platform], '_blank');
  else { copyShareLink(); if (window.SpopeerToast) window.SpopeerToast.success('Link copied! Paste it into your Instagram story or bio.'); }
}

// Wire share modal once DOM is ready (overlay element is after this script block)
document.addEventListener('DOMContentLoaded', function() {
  // close on overlay click
  var overlay = document.getElementById('shareModalOverlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) { if (e.target === e.currentTarget) closeShareModal(); });
  }

  // wire the share button
  var shareBtn = document.getElementById('shareProfileBtn');
  if (shareBtn) {
    shareBtn.onclick = function(e) {
      e.preventDefault();
      openShareModal();
    };
  }
});

// close on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeShareModal();
});
