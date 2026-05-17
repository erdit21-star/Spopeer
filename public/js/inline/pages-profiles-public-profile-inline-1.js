/* Fallback: runs only if public-profile.js failed to load */
if (!window._spopeerProfilePageLoaded) {
function bumpNumericStat(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(String(el.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0;
  el.textContent = Math.max(0, current + delta);
}

document.querySelectorAll('.follow-btn').forEach(btn => {
  btn.addEventListener('click', async function () {
    const targetId = btn.closest('.follow-item')?.dataset?.id || '';
    const isFollowing = this.textContent === 'Following';
    this.disabled = true;
    this.textContent = 'Loading...';

    try {
      if (typeof followManager !== 'undefined' && targetId) {
        if (!isFollowing) {
          const success = await followManager.follow(targetId);
          if (success) {
            this.textContent = 'Following';
            this.style.background = 'var(--accent)';
            this.style.color = 'var(--accent-light)';
          } else {
            this.textContent = 'Follow';
          }
        } else {
          const success = await followManager.unfollow(targetId);
          if (success) {
            this.textContent = 'Follow';
            this.style.background = '';
            this.style.color = '';
          } else {
            this.textContent = 'Following';
            this.style.background = 'var(--accent)';
            this.style.color = 'var(--accent-light)';
          }
        }
      } else {
        // Fallback toggle
        this.textContent = isFollowing ? 'Follow' : 'Following';
      }
    } catch (e) {
      console.error('Follow toggle error:', e);
      this.textContent = isFollowing ? 'Follow' : 'Following';
    } finally {
      this.disabled = false;
    }
  });
});

// Removed duplicate connect handler — use initProfileFollowButton() instead

/* Load profile */
(async function(){
  // Initialize profile sync
  ProfileSyncService.init();
  
  function qs(n){return new URLSearchParams(window.location.search).get(n);}
  const userId=qs('userId')||qs('email')||qs('userEmail')||'';
  if(!userId){console.warn('No userId in URL params');}

  window.addEventListener('followRelationChanged', function(e) {
    const target = e?.detail?.targetUserId;
    const delta = Number(e?.detail?.deltaFollowers || 0);
    if (!target || !delta) return;
    if (String(target).toLowerCase() === String(userId).toLowerCase()) {
      bumpNumericStat('followers', delta);
    }
  });

  // Cache invalidation when owner views their own profile
  var currentUser = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
  var isOwnProfile = false;
  if (window.SpopeerProfileIdentity) {
    isOwnProfile = !!(userId && window.SpopeerProfileIdentity.matchesCurrentUser(userId));
  } else {
    var targetId = String(userId || '');
    var currentId = String(currentUser.id || '');
    var currentEmail = String(currentUser.email || '').toLowerCase();
    isOwnProfile = !!(targetId && (targetId === currentId || targetId.toLowerCase() === currentEmail));
  }
  if (isOwnProfile) {
    localStorage.removeItem('spopeer_profile_cache_' + currentUser.email);
  }

  // Toggle action buttons based on own-profile
  (function updateActionButtons(){
    var connectBtn=document.getElementById('connectBtn');
    var connStatus=document.getElementById('connStatus');
    var messageBtn=document.getElementById('messageBtn');
    var editBtn=document.getElementById('editProfileBtn');
    var shareBtn=document.getElementById('shareProfileBtn');
    if(isOwnProfile){
      if(connectBtn) connectBtn.style.display='none';
      if(connStatus) connStatus.style.display='none';
      if(messageBtn) messageBtn.style.display='none';
      if(editBtn){editBtn.style.display='flex';editBtn.onclick=function(){window.location.href='edit-profile.html';};}
    } else {
      if(connectBtn) connectBtn.style.display='';
      if(connStatus) connStatus.style.display='';
      if(messageBtn) messageBtn.style.display='flex';
      if(editBtn) editBtn.style.display='none';
    }
    // Message button handler
    if(messageBtn && !isOwnProfile){
      messageBtn.addEventListener('click', function(){
        var targetUserId = (payload && payload.id) || (payload && payload.userId) || userId;
        if(!targetUserId){
          alert('User ID not found. Unable to send message.');
          return;
        }
        var targetName = (payload && payload.firstName && payload.lastName) 
          ? payload.firstName + ' ' + payload.lastName
          : (payload && payload.displayName) || 'User';
        var messagesUrl = window.location.origin + '/pages/messaging/inbox.html?userId=' + encodeURIComponent(targetUserId);
        window.location.href = messagesUrl;
      });
    }
    if(shareBtn){
      shareBtn.addEventListener('click',function(){
        var url=window.location.href;
        if(navigator.share){
          navigator.share({title:document.title,url:url}).catch(function(){});
        } else {
          navigator.clipboard.writeText(url).then(function(){
            shareBtn.innerHTML='<i class="fa-solid fa-check" style="font-size:12px"></i> Link Copied!';
            setTimeout(function(){shareBtn.innerHTML='<i class="fa-solid fa-share-nodes" style="font-size:12px"></i> Share Profile';},2000);
          }).catch(function(){});
        }
      });
    }
  })();

  let payload={};
  let profileFound=false;
  let lastAppliedProfileTs = 0;
  
  // Build headers — include auth cookie so server can identify the viewer
  const _headers = {};

  // Try /api/users/:id (handles both numeric id and email)
  if(userId){
    try{
      const r=await fetch(`/api/users/${encodeURIComponent(userId)}`, { headers: _headers, credentials: 'include' });
      if(r.ok){
        const d=await r.json();
        payload=d.data||d.user||d.payload||{};
        profileFound=true;
      } else {
        console.warn('Profile fetch returned', r.status, await r.text().catch(()=>''));
      }
    }catch(e){
      console.log('API users fetch failed:', e.message);
    }
  }

  // Fallback: for own profile, try /api/auth/me
  if(!profileFound && isOwnProfile){
    try{
      const r=await fetch('/api/auth/me', { headers: _headers, credentials: 'include' });
      if(r.ok){
        const d=await r.json();
        payload=(d.data && d.data.user) || d.data || d.user || d.payload || {};
        profileFound=true;
        console.log('Loaded own profile via /api/auth/me');
      }
    }catch(e){
      console.log('/api/auth/me fallback failed:', e.message);
    }
  }

  // Last resort for own profile: use localStorage data
  if(!profileFound && isOwnProfile && currentUser && currentUser.email){
    payload={...currentUser};
    profileFound=true;
    console.log('Loaded own profile from localStorage');
  }

  // No sample fallback in production.
  if(!payload||!Object.keys(payload).length){
    payload={};
    profileFound=false;
  } else {
    payload = getNormalizer().withProfileTimestamp
      ? getNormalizer().withProfileTimestamp(payload, payload._profileUpdatedAt || Date.now())
      : payload;
    payload = normalizeProfile(payload);
    lastAppliedProfileTs = Number(getNormalizer().getProfileTimestamp ? getNormalizer().getProfileTimestamp(payload) : (payload._profileUpdatedAt || Date.now()));
  }
  
  // Visibility helper — respect per-field privacy settings
  function isVisible(profile, fieldName) {
    var vis = profile.visibility || {};
    var privateByDefault = ['contactEmail','contactPhone','contactAddress',
                            'dob','gender','height','weight','feeStructure',
                            'medicalHistory','injuryHistory','currentInjuries',
                            'nutritionDiet','trainingRoutine',
                            'clubEmail','clubPhone','clubAddress','profEmail',
                            'clubBudget','revenueStreams','billingInfo'];
    if (vis[fieldName] !== undefined) {
      return vis[fieldName] === 'public';
    }
    return privateByDefault.indexOf(fieldName) === -1;
  }

  function getNormalizer() {
    return window.ProfileNormalizer || {
      normalizeProfile: function (profile) { return profile || {}; },
      withProfileTimestamp: function (profile) { return profile || {}; },
      getProfileTimestamp: function (profile) { return Number((profile && profile._profileUpdatedAt) || 0) || 0; },
      isIncomingNewer: function (incoming, current) { return Number(incoming || 0) >= Number(current || 0); },
      matchesIdentifier: function (profile, target) {
        var id = String(target || '').toLowerCase();
        if (!id) return false;
        var ids = [profile && profile.id, profile && profile.userId, profile && profile.email, profile && profile.userEmail]
          .filter(function (v) { return v !== undefined && v !== null && String(v).trim() !== ''; })
          .map(function (v) { return String(v).toLowerCase(); });
        return ids.indexOf(id) !== -1;
      }
    };
  }

  function normalizeProfile(profile) {
    return getNormalizer().normalizeProfile(profile || {});
  }

  function formatExperience(profile) {
    var raw = profile.experience || profile.sportsYears || profile.profExperience || profile.yearsOfExperience || profile.yearsOfCoaching;
    if (!raw && raw !== 0) return '';
    var num = Number(raw);
    if (!Number.isNaN(num) && num > 0) return String(num) + ' years';
    if (!Number.isNaN(num) && num === 0) return '0 years';
    return String(raw);
  }

  function normalizeLocation(profile) {
    if (profile.location) return profile.location;
    var fallback = [profile.city, profile.country].filter(Boolean).join(', ');
    return fallback || '';
  }

  function getCoreSportCardData(profile) {
    var data = normalizeProfile(profile || {});
    var fullName = data.displayName || (String(data.firstName || '') + ' ' + String(data.lastName || '')).trim() || data.name || 'Spopeer User';
    return {
      name: fullName,
      avatarUrl: data.avatarUrl || data.avatar || '',
      sport: data.primarySport || data.sport || '',
      location: normalizeLocation(data),
      position: data.position || '',
      currentTeam: data.currentTeam || '',
      playingLevel: data.playingLevel || data.sportsLevel || '',
      experienceLabel: formatExperience(data),
      followers: String(data.followersCount ?? data.followers ?? 0),
      following: String(data.followingCount ?? data.following ?? 0),
      mediaCount: String(data.postsCount ?? data.mediaCount ?? 0)
    };
  }

  function getRoleEmptyPlaceholder(role, label) {
    var placeholders = {
      athlete: {
        Position: 'Position not set',
        Team: 'Team not set',
        Level: 'Level not set',
        Location: 'Location not set',
        Experience: 'Experience not set'
      },
      coach: {
        Specialty: 'Specialty not set',
        Team: 'Team not set',
        Style: 'Style not set',
        Location: 'Location not set',
        Experience: 'Experience not set'
      },
      club: {
        Founded: 'Year not set',
        Teams: 'Teams not set',
        Type: 'Type not set',
        Location: 'Location not set',
        Years: 'Years not set'
      },
      supportive_professional: {
        Specialty: 'Specialty not set',
        Org: 'Organization not set',
        Title: 'Title not set',
        Location: 'Location not set',
        Experience: 'Experience not set'
      }
    };
    var roleMap = placeholders[role] || placeholders.athlete;
    return roleMap[label] || 'Not set';
  }

  function setMetaRow(rowId, valueId, labelId, labelText, value, visible, iconClass, placeholderText) {
    var rowEl = document.getElementById(rowId);
    var valueEl = document.getElementById(valueId);
    var labelEl = document.getElementById(labelId);
    if (!rowEl || !valueEl || !labelEl) return;
    if (iconClass) {
      var iconEl = rowEl.querySelector('i');
      if (iconEl) iconEl.className = iconClass;
    }
    labelEl.textContent = (labelText || '').trim() + ':';
    if (visible) {
      valueEl.textContent = value || placeholderText || 'Not set';
      valueEl.style.color = value ? '' : 'var(--muted)';
      rowEl.style.display = 'flex';
    } else {
      rowEl.style.display = 'none';
    }
  }

  function getCardStackRoleRows(profile, core) {
    var role = profile.userType || 'athlete';
    var rowsByRole = {
      athlete: [
        { rowId:'metaSportRow', valueId:'sport', labelId:'metaSportLabel', label:'Sport', value:core.sport, visible:true, icon:'fa-solid fa-futbol' },
        { rowId:'metaPositionRow', valueId:'cardPosition', labelId:'metaPositionLabel', label:'Position', value:core.position, visible:isVisible(profile, 'position'), icon:'fa-solid fa-shirt' },
        { rowId:'metaTeamRow', valueId:'cardTeam', labelId:'metaTeamLabel', label:'Team', value:core.currentTeam, visible:isVisible(profile, 'currentTeam'), icon:'fa-solid fa-people-group' },
        { rowId:'metaLevelRow', valueId:'cardLevel', labelId:'metaLevelLabel', label:'Level', value:core.playingLevel, visible:isVisible(profile, 'playingLevel'), icon:'fa-solid fa-signal' },
        { rowId:'metaLocationRow', valueId:'location', labelId:'metaLocationLabel', label:'Location', value:core.location, visible:isVisible(profile, 'location'), icon:'fa-solid fa-location-dot' },
        { rowId:'metaExperienceRow', valueId:'cardExperience', labelId:'metaExperienceLabel', label:'Experience', value:core.experienceLabel, visible:isVisible(profile, 'experience'), icon:'fa-regular fa-clock' }
      ],
      coach: [
        { rowId:'metaSportRow', valueId:'sport', labelId:'metaSportLabel', label:'Sport', value:core.sport, visible:true, icon:'fa-solid fa-futbol' },
        { rowId:'metaPositionRow', valueId:'cardPosition', labelId:'metaPositionLabel', label:'Specialty', value:profile.specialization || core.position, visible:isVisible(profile, 'specialization') || isVisible(profile, 'position'), icon:'fa-solid fa-bullseye' },
        { rowId:'metaTeamRow', valueId:'cardTeam', labelId:'metaTeamLabel', label:'Team', value:core.currentTeam, visible:isVisible(profile, 'currentTeam'), icon:'fa-solid fa-people-group' },
        { rowId:'metaLevelRow', valueId:'cardLevel', labelId:'metaLevelLabel', label:'Style', value:profile.coachingStyle || core.playingLevel, visible:isVisible(profile, 'coachingStyle') || isVisible(profile, 'playingLevel'), icon:'fa-solid fa-chalkboard-user' },
        { rowId:'metaLocationRow', valueId:'location', labelId:'metaLocationLabel', label:'Location', value:core.location, visible:isVisible(profile, 'location'), icon:'fa-solid fa-location-dot' },
        { rowId:'metaExperienceRow', valueId:'cardExperience', labelId:'metaExperienceLabel', label:'Experience', value:core.experienceLabel, visible:isVisible(profile, 'experience'), icon:'fa-regular fa-clock' }
      ],
      club: [
        { rowId:'metaSportRow', valueId:'sport', labelId:'metaSportLabel', label:'Sport', value:core.sport, visible:true, icon:'fa-solid fa-futbol' },
        { rowId:'metaPositionRow', valueId:'cardPosition', labelId:'metaPositionLabel', label:'Founded', value:profile.foundedYear ? String(profile.foundedYear) : '', visible:isVisible(profile, 'foundedYear'), icon:'fa-solid fa-calendar-days' },
        { rowId:'metaTeamRow', valueId:'cardTeam', labelId:'metaTeamLabel', label:'Teams', value:profile.teamsAndDivisions || core.currentTeam, visible:isVisible(profile, 'teamsAndDivisions') || isVisible(profile, 'currentTeam'), icon:'fa-solid fa-shield-halved' },
        { rowId:'metaLevelRow', valueId:'cardLevel', labelId:'metaLevelLabel', label:'Type', value:profile.clubType || profile.facilities || core.playingLevel, visible:isVisible(profile, 'clubType') || isVisible(profile, 'facilities') || isVisible(profile, 'playingLevel'), icon:'fa-solid fa-building' },
        { rowId:'metaLocationRow', valueId:'location', labelId:'metaLocationLabel', label:'Location', value:core.location, visible:isVisible(profile, 'location'), icon:'fa-solid fa-location-dot' },
        { rowId:'metaExperienceRow', valueId:'cardExperience', labelId:'metaExperienceLabel', label:'Years', value:core.experienceLabel, visible:isVisible(profile, 'experience'), icon:'fa-regular fa-clock' }
      ],
      supportive_professional: [
        { rowId:'metaSportRow', valueId:'sport', labelId:'metaSportLabel', label:'Sport', value:core.sport, visible:true, icon:'fa-solid fa-futbol' },
        { rowId:'metaPositionRow', valueId:'cardPosition', labelId:'metaPositionLabel', label:'Specialty', value:profile.specializationField || profile.specialization || core.position, visible:isVisible(profile, 'specializationField') || isVisible(profile, 'specialization') || isVisible(profile, 'position'), icon:'fa-solid fa-star' },
        { rowId:'metaTeamRow', valueId:'cardTeam', labelId:'metaTeamLabel', label:'Org', value:profile.companyName || core.currentTeam, visible:isVisible(profile, 'companyName') || isVisible(profile, 'currentTeam'), icon:'fa-solid fa-briefcase' },
        { rowId:'metaLevelRow', valueId:'cardLevel', labelId:'metaLevelLabel', label:'Title', value:profile.professionalTitle || core.playingLevel, visible:isVisible(profile, 'professionalTitle') || isVisible(profile, 'playingLevel'), icon:'fa-solid fa-id-badge' },
        { rowId:'metaLocationRow', valueId:'location', labelId:'metaLocationLabel', label:'Location', value:core.location, visible:isVisible(profile, 'location'), icon:'fa-solid fa-location-dot' },
        { rowId:'metaExperienceRow', valueId:'cardExperience', labelId:'metaExperienceLabel', label:'Experience', value:core.experienceLabel, visible:isVisible(profile, 'experience'), icon:'fa-regular fa-clock' }
      ]
    };

    return (rowsByRole[role] || rowsByRole.athlete).map(function (row) {
      return Object.assign({}, row, {
        placeholder: getRoleEmptyPlaceholder(role, row.label)
      });
    });
  }

  function getCompactVariantFields(profile, core) {
    return getCardStackRoleRows(profile, core).map(function(row) {
      return {
        label: row.label,
        value: row.value,
        visible: row.visible
      };
    });
  }

  function getCompactPills(fields) {
    return (fields || []).filter(function(field) {
      return field.visible && field.value && field.label !== 'Sport' && field.label !== 'Location' && field.label !== 'Experience' && field.label !== 'Years';
    }).slice(0, 2);
  }

  function matchesViewedProfile(profile) {
    if (!profile) return false;
    if (!userId) return isOwnProfile;
    return getNormalizer().matchesIdentifier(profile, String(userId).toLowerCase());
  }

  // Update UI with profile data
  function updateUI(profile) {
    profile = normalizeProfile(profile);
    // STEP 7: Show "Profile not found" message if no profile data
    if(!profile||!Object.keys(profile).length){
      document.getElementById('avatar').innerHTML='<i class="fa-solid fa-question" style="font-size:32px; color:#999"></i>';
      document.getElementById('name').textContent='Profile Not Found';
      document.getElementById('name').style.color='#999';
      document.getElementById('bio').textContent='This user\\047s profile could not be found or is not available.';
      document.getElementById('followers').textContent='—';
      document.getElementById('following').textContent='—';
      document.getElementById('mediaCount').textContent='—';
      document.getElementById('userType').textContent='Unknown';
      return;
    }
    
    const core = getCoreSportCardData(profile);
    const name = core.name;
    const initials=name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    document.title=`${name} — Spopeer`;
    const avatarEl=document.getElementById('avatar');
    if(core.avatarUrl){
      avatarEl.innerHTML=`<img src="${core.avatarUrl}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      avatarEl.textContent=initials;
    }
    const coverUrl=profile.coverPhotoUrl||profile.coverUrl;
    if(coverUrl){
      const coverEl=document.querySelector('.profile-cover');
      if(coverEl) coverEl.style.background=`url('${coverUrl}') center/cover no-repeat`;
    }
    document.getElementById('name').textContent=name;
    getCardStackRoleRows(profile, core).forEach(function(row) {
      setMetaRow(row.rowId, row.valueId, row.labelId, row.label, row.value, row.visible, row.icon, row.placeholder);
    });

    var bioEl = document.getElementById('bio');
    if (bioEl) {
      bioEl.textContent = '';
      bioEl.style.display = 'none';
    }
    const typeMap={athlete:{label:'Athlete',icon:'fa-person-running'},coach:{label:'Coach',icon:'fa-bullseye'},club:{label:'Club',icon:'fa-shield-halved'},'supportive_professional':{label:'Support Pro',icon:'fa-star'}};
    const t=typeMap[profile.userType]||{label:'User',icon:'fa-user'};
    document.getElementById('userType').innerHTML=`<i class="fa-solid ${t.icon}" style="font-size:10px"></i> ${t.label}`;
    document.getElementById('followers').textContent=core.followers;
    document.getElementById('following').textContent=core.following;
    document.getElementById('mediaCount').textContent=core.mediaCount;
    document.getElementById('joined-date').textContent=profile.createdAt?new Date(profile.createdAt).toLocaleDateString('en',{month:'long',year:'numeric'}):'-';
    document.getElementById('primary-sport').textContent=core.sport||'-';
    document.getElementById('experience').textContent=core.experienceLabel || 'N/A';
    document.getElementById('stat-media').textContent=core.mediaCount;

    /* About extra info — expanded per user type */
    const extras=[];
    const uType=profile.userType||'athlete';
    if(uType==='athlete'){
      if(isVisible(profile,'position')&&profile.position) extras.push(['Position',profile.position]);
      if(isVisible(profile,'currentTeam')&&profile.currentTeam) extras.push(['Current Team',profile.currentTeam]);
      if(isVisible(profile,'playingLevel')&&profile.playingLevel) extras.push(['Playing Level',profile.playingLevel]);
      if(isVisible(profile,'height')&&profile.height) extras.push(['Height',String(profile.height).includes('cm')?profile.height:profile.height+' cm']);
      if(isVisible(profile,'weight')&&profile.weight) extras.push(['Weight',String(profile.weight).includes('kg')?profile.weight:profile.weight+' kg']);
      if(isVisible(profile,'achievements')&&profile.achievements) extras.push(['Achievements',profile.achievements]);
      if(isVisible(profile,'highestLevel')&&(profile.highestLevel||profile.highestLevelAchieved)) extras.push(['Highest Level',profile.highestLevel||profile.highestLevelAchieved]);
      if(isVisible(profile,'availability')&&profile.availability) extras.push(['Availability',profile.availability]);
      if(isVisible(profile,'upcomingEvents')&&profile.upcomingEvents) extras.push(['Upcoming',profile.upcomingEvents]);
    } else if(uType==='coach'){
      if(isVisible(profile,'specialization')&&profile.specialization) extras.push(['Specialization',profile.specialization]);
      if(isVisible(profile,'certifications')&&profile.certifications) extras.push(['Certifications',profile.certifications]);
      if(isVisible(profile,'coachingStyle')&&profile.coachingStyle) extras.push(['Style',profile.coachingStyle]);
      if(isVisible(profile,'philosophy')&&(profile.philosophy||profile.coachingPhilosophy)) extras.push(['Philosophy',profile.philosophy||profile.coachingPhilosophy]);
      if(isVisible(profile,'coachAchievements')&&(profile.achievements||profile.coachAchievements)) extras.push(['Achievements',profile.achievements||profile.coachAchievements]);
    } else if(uType==='club'){
      if(isVisible(profile,'foundedYear')&&profile.foundedYear) extras.push(['Founded',profile.foundedYear]);
      if(isVisible(profile,'teamsAndDivisions')&&profile.teamsAndDivisions) extras.push(['Teams',profile.teamsAndDivisions]);
      if(isVisible(profile,'facilities')&&profile.facilities) extras.push(['Facilities',profile.facilities]);
      if(isVisible(profile,'clubWebsite')&&(profile.clubWebsite||profile.website)) extras.push(['Website',profile.clubWebsite||profile.website]);
      if(isVisible(profile,'youthPrograms')&&profile.youthPrograms) extras.push(['Youth Program',profile.youthPrograms]);
    } else if(uType==='supportive_professional'){
      if(isVisible(profile,'professionalTitle')&&profile.professionalTitle) extras.push(['Title',profile.professionalTitle]);
      if(isVisible(profile,'specializationField')&&profile.specializationField) extras.push(['Specialization',profile.specializationField]);
      if(isVisible(profile,'services')&&profile.services) extras.push(['Services',profile.services]);
      if(isVisible(profile,'credentials')&&profile.credentials) extras.push(['Credentials',profile.credentials]);
      if(isVisible(profile,'availabilityHours')&&profile.availabilityHours) extras.push(['Hours',profile.availabilityHours]);
    }
    if(extras.length){
      const g=document.createElement('div');g.className='about-grid';
      extras.forEach(([l,v])=>{const d=document.createElement('div');d.className='about-item';d.innerHTML=`<div class="about-label">${l}</div><div class="about-value">${v}</div>`;g.appendChild(d);});
      document.getElementById('extra-info').innerHTML='';
      document.getElementById('extra-info').appendChild(g);
    }

    // Lock hints for owner viewing their own profile
    if(isOwnProfile){
      var hiddenFields=[];
      var checkFields=[['bio','Bio'],['location','Location'],['dob','Date of Birth'],['gender','Gender'],
        ['contactEmail','Contact Email'],['contactPhone','Phone'],['contactAddress','Address'],
        ['height','Height'],['weight','Weight'],['feeStructure','Fee Structure'],
        ['trainingRoutine','Training Routine'],['injuryHistory','Injury History'],
        ['currentInjuries','Current Injuries'],['medicalHistory','Medical History'],['nutritionDiet','Nutrition & Diet'],
        ['clubEmail','Club Email'],['clubPhone','Club Phone'],['clubAddress','Club Address'],
        ['clubBudget','Annual Budget'],['revenueStreams','Revenue Streams'],
        ['profEmail','Professional Email'],['billingInfo','Billing Info']];
      checkFields.forEach(function(pair){
        if(!isVisible(profile,pair[0])&&profile[pair[0]]) hiddenFields.push(pair[1]);
      });
      if(hiddenFields.length){
        var hint=document.createElement('div');
        hint.style.cssText='color:var(--muted);font-size:12px;margin-top:12px;padding:8px 12px;background:var(--surface);border-radius:8px;';
        hint.innerHTML='<i class="fa-solid fa-lock" style="font-size:10px;margin-right:4px"></i> '+hiddenFields.length+' field(s) hidden from visitors: '+hiddenFields.join(', ');
        document.getElementById('extra-info').appendChild(hint);
      }
    }

    /* ===== Comprehensive Section Cards per User Type ===== */
    document.querySelectorAll('.dynamic-section').forEach(function(el){ el.remove(); });
    var aboutTab=document.getElementById('about');

    function esc(s){ var d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; }
    function visVal(key,val){
      if(val==null||val==='') return null;
      if(!isVisible(profile,key)) return null;
      if(Array.isArray(val)) return val.join(', ');
      return String(val);
    }
    function addSection(title,iconClass,items){
      var visible=items.filter(function(it){ return it[2]!=null&&it[2]!==''; });
      if(!visible.length) return;
      var card=document.createElement('div');
      card.className='content-card dynamic-section';
      var html='<div class="content-card-title"><i class="'+iconClass+'"></i> '+esc(title)+'</div>';
      html+='<div class="about-grid">';
      visible.forEach(function(it){
        html+='<div class="about-item"><div class="about-label">'+esc(it[1])+'</div><div class="about-value">'+esc(it[2])+'</div></div>';
      });
      html+='</div>';
      card.innerHTML=html;
      aboutTab.appendChild(card);
    }

    if(uType==='athlete'){
      /* Training & Goals (availability already in basic extras) */
      addSection('Training & Goals','fa-solid fa-dumbbell',[
        ['trainingDays','Training Days / Week',visVal('trainingDays',profile.trainingDays)],
        ['trainingHours','Hours / Day',visVal('trainingHours',profile.trainingHours)],
        ['trainingLocation','Training Location',visVal('trainingLocation',profile.trainingLocation)],
        ['trainingRoutine','Training Routine',visVal('trainingRoutine',profile.trainingRoutine)],
        ['trainingFocus','Training Focus',visVal('trainingFocus',profile.trainingFocus)],
        ['coaches','Coaches & Trainers',visVal('coaches',profile.coachesTrainers||profile.coaches)],
        ['goals','Goals',visVal('goals',profile.goals)]
      ]);
      /* Physical (height/weight already in basic extras) */
      addSection('Physical Information','fa-solid fa-ruler-vertical',[
        ['chest','Chest',visVal('chest',profile.chest)],
        ['waist','Waist',visVal('waist',profile.waist)],
        ['hips','Hips',visVal('hips',profile.hips)],
        ['eyeColor','Eye Color',visVal('eyeColor',profile.eyeColor)],
        ['hairColor','Hair Color',visVal('hairColor',profile.hairColor)]
      ]);
      /* Competition (upcomingEvents already in basic extras) */
      addSection('Competition','fa-solid fa-flag-checkered',[
        ['competitionHistory','Competition History',visVal('competitionHistory',profile.competitionHistory)],
        ['teamInfo','Team Information',visVal('teamInfo',profile.teamInfo)]
      ]);
      /* Health & Wellness */
      addSection('Health & Wellness','fa-solid fa-heart-pulse',[
        ['injuryHistory','Injury History',visVal('injuryHistory',profile.injuryHistory)],
        ['currentInjuries','Current Injuries',visVal('currentInjuries',profile.currentInjuries)],
        ['medicalHistory','Medical History',visVal('medicalHistory',profile.medicalHistory)],
        ['nutritionDiet','Nutrition & Diet',visVal('nutritionDiet',profile.nutritionDiet)]
      ]);
      /* Performance Stats */
      if(profile.stats){
        addSection('Performance Stats','fa-solid fa-chart-line',[
          ['stats','Goals / Points',profile.stats.goalsOrPoints?String(profile.stats.goalsOrPoints):null],
          ['stats','Assists',profile.stats.assists?String(profile.stats.assists):null],
          ['stats','Appearances',profile.stats.appearances?String(profile.stats.appearances):null]
        ]);
      }
    } else if(uType==='coach'){
      /* Coaching Background (specialization/certifications/style/philosophy/achievements in extras) */
      addSection('Coaching Background','fa-solid fa-clipboard',[
        ['coachExperience','Years of Experience',visVal('coachExperience',profile.experience)],
        ['coachTeam','Current Team',visVal('coachTeam',profile.currentTeam)],
        ['education','Education & Qualifications',visVal('education',profile.coachEducation||profile.education)],
        ['teamsCoached','Teams Coached',visVal('teamsCoached',profile.teamsCoached)]
      ]);
      /* Training & Development */
      addSection('Training & Development','fa-solid fa-chalkboard-user',[
        ['trainingPlans','Training Plans & Strategies',visVal('trainingPlans',profile.trainingPlans)],
        ['playerDevelopment','Player Development',visVal('playerDevelopment',profile.playerDevelopment)],
        ['techniques','Techniques & Methods',visVal('techniques',profile.techniquesMethods||profile.techniques)]
      ]);
      /* Management */
      addSection('Management','fa-solid fa-users-gear',[
        ['teamManagement','Team Management',visVal('teamManagement',profile.teamManagement)],
        ['rosterManagement','Roster Management',visVal('rosterManagement',profile.rosterManagement)],
        ['playerSelection','Player Selection Criteria',visVal('playerSelection',profile.playerSelection)]
      ]);
    } else if(uType==='club'){
      /* Contact Information */
      addSection('Contact Information','fa-solid fa-address-card',[
        ['clubEmail','Email',visVal('clubEmail',profile.clubEmail||profile.contactEmail)],
        ['clubPhone','Phone',visVal('clubPhone',profile.clubPhone)],
        ['clubAddress','Address',visVal('clubAddress',profile.clubAddress)]
      ]);
      /* Staff */
      addSection('Coaching & Management Staff','fa-solid fa-users',[
        ['coachingStaff','Coaching Staff',visVal('coachingStaff',profile.coachingStaff)],
        ['managementStaff','Management Staff',visVal('managementStaff',profile.managementStaff)],
        ['clubPhilosophy','Club Philosophy',visVal('clubPhilosophy',profile.clubPhilosophy)]
      ]);
      /* Financial */
      addSection('Financial Information','fa-solid fa-coins',[
        ['clubBudget','Annual Budget',visVal('clubBudget',profile.clubBudget)],
        ['sponsorship','Sponsorship Details',visVal('sponsorship',profile.sponsorship)],
        ['revenueStreams','Revenue Streams',visVal('revenueStreams',profile.revenueStreams)]
      ]);
      /* Youth & Development (youthPrograms already in extras) */
      addSection('Youth & Development','fa-solid fa-seedling',[
        ['talentRecruitment','Talent Recruitment',visVal('talentRecruitment',profile.talentRecruitment)],
        ['scholarships','Scholarships & Grants',visVal('scholarships',profile.scholarships)]
      ]);
      /* Community */
      addSection('Community & Social Responsibility','fa-solid fa-handshake-angle',[
        ['communityOutreach','Community Outreach',visVal('communityOutreach',profile.communityOutreach)],
        ['socialResponsibility','Social Responsibility',visVal('socialResponsibility',profile.socialResponsibility)],
        ['charitablePartnerships','Charitable Partnerships',visVal('charitablePartnerships',profile.charitablePartnerships)]
      ]);
      /* Detailed Facilities (overview already in extras) */
      addSection('Detailed Facilities','fa-solid fa-building',[
        ['trainingFields','Training Fields / Pitches',visVal('trainingFields',profile.trainingFields)],
        ['gymFacilities','Gym & Fitness Centre',visVal('gymFacilities',profile.gymFacilities)],
        ['lockerRooms','Locker Rooms & Amenities',visVal('lockerRooms',profile.lockerRooms)],
        ['otherFacilities','Other Facilities',visVal('otherFacilities',profile.otherFacilities)]
      ]);
      /* Equipment */
      addSection('Equipment Inventory','fa-solid fa-toolbox',[
        ['equipmentList','Equipment List',visVal('equipmentList',profile.equipmentList)],
        ['maintenanceSchedule','Maintenance Schedule',visVal('maintenanceSchedule',profile.maintenanceSchedule)]
      ]);
      /* Legal */
      addSection('Legal & Compliance','fa-solid fa-scale-balanced',[
        ['clubLicensing','Licensing & Registration',visVal('clubLicensing',profile.clubLicensing)],
        ['clubCompliance','Compliance & Policies',visVal('clubCompliance',profile.clubCompliance)]
      ]);
    } else if(uType==='supportive_professional'){
      /* Professional Background (title/specialization/services/credentials in extras) */
      addSection('Professional Background','fa-solid fa-briefcase',[
        ['companyName','Company / Organization',visVal('companyName',profile.companyName)],
        ['profExperience','Work Experience',visVal('profExperience',profile.profExperience||profile.experience)],
        ['profEducation','Education',visVal('profEducation',profile.profEducation||profile.education)],
        ['clientele','Clientele',visVal('clientele',profile.clientele)],
        ['profEmail','Contact Email',visVal('profEmail',profile.profEmail||profile.contactEmail)]
      ]);
      /* Communication (availabilityHours already in extras) */
      addSection('Contact & Communication','fa-solid fa-comments',[
        ['preferredContact','Preferred Contact Method',visVal('preferredContact',profile.preferredContact)],
        ['communicationTools','Communication Tools',visVal('communicationTools',profile.communicationTools)]
      ]);
      /* Testimonials & References */
      addSection('Testimonials & References','fa-solid fa-quote-left',[
        ['clientReviews','Client Reviews',visVal('clientReviews',profile.clientReviews)],
        ['professionalRefs','Professional References',visVal('professionalRefs',profile.professionalRefs)]
      ]);
      /* Payment & Rates */
      addSection('Payment & Rates','fa-solid fa-credit-card',[
        ['feeStructure','Fee Structure',visVal('feeStructure',profile.feeStructure)],
        ['paymentMethods','Payment Methods',visVal('paymentMethods',profile.paymentMethods)],
        ['billingInfo','Billing Information',visVal('billingInfo',profile.billingInfo)]
      ]);
      /* Legal */
      addSection('Legal & Compliance','fa-solid fa-scale-balanced',[
        ['profLicensing','Professional Licensing',visVal('profLicensing',profile.profLicensing)],
        ['profCompliance','Regulatory Compliance',visVal('profCompliance',profile.profCompliance)]
      ]);
    }

    /* Contact Information for athlete & coach */
    if(uType==='athlete'||uType==='coach'){
      addSection('Contact Information','fa-solid fa-address-card',[
        ['contactEmail','Email',visVal('contactEmail',profile.contactEmail)],
        ['contactPhone','Phone',visVal('contactPhone',profile.contactPhone)],
        ['contactAddress','Address',visVal('contactAddress',profile.contactAddress)]
      ]);
    }

    /* Social & Media Links (all types) */
    var socials=[];
    if(profile.mediaLinks){
      if(isVisible(profile,'highlightVideo')&&profile.mediaLinks.highlightVideo) socials.push(['highlightVideo','Highlight Video',profile.mediaLinks.highlightVideo]);
      if(profile.mediaLinks.instagram) socials.push(['instagram','Instagram',profile.mediaLinks.instagram]);
      if(profile.mediaLinks.youtubeChannel) socials.push(['youtube','YouTube',profile.mediaLinks.youtubeChannel]);
      if(profile.mediaLinks.linkedIn) socials.push(['linkedin','LinkedIn',profile.mediaLinks.linkedIn]);
      if(profile.mediaLinks.website) socials.push(['website','Website',profile.mediaLinks.website]);
    } else {
      if(profile.instagram) socials.push(['instagram','Instagram',profile.instagram]);
      if(profile.youtube) socials.push(['youtube','YouTube',profile.youtube]);
      if(profile.linkedin) socials.push(['linkedin','LinkedIn',profile.linkedin]);
      if(profile.website&&uType!=='club') socials.push(['website','Website',profile.website]);
    }
    if(socials.length) addSection('Social & Media Links','fa-solid fa-share-nodes',socials);
  }

  // ── Enforce profile privacy ──
  if (!isOwnProfile) {
    try {
      var targetSettings = {};
      // Check spopeer_settings (the settings page saves here)
      var settingsRaw = localStorage.getItem('spopeer_settings');
      if (settingsRaw) targetSettings = JSON.parse(settingsRaw);
      // Also check profile-level privacy flag
      var profilePrivacy = payload.privacy_public;
      if (targetSettings.profileVisibility === false || profilePrivacy === false) {
        // Show private profile screen
        var wrap = document.querySelector('.page-wrap');
        if (wrap) {
          wrap.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:80px 20px;">' +
            '<div style="width:80px;height:80px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">' +
            '<i class="fa-solid fa-lock" style="font-size:28px;color:var(--muted)"></i></div>' +
            '<h2 style="font-family:var(--fD);font-size:22px;font-weight:800;margin-bottom:8px;">This Profile is Private</h2>' +
            '<p style="color:var(--muted);font-size:14px;max-width:340px;margin:0 auto 20px;">This user has set their profile to private. Connect with them to see their full profile.</p>' +
            '<a href="/feed.html" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:var(--accent);color:#fff;border-radius:var(--pill);text-decoration:none;font-size:14px;font-weight:700;font-family:var(--fB)"><i class="fa-solid fa-arrow-left" style="font-size:12px"></i> Back to Feed</a></div>';
        }
        return; // stop rendering the rest of the profile
      }
    } catch(e) {
      console.warn('Privacy check error:', e);
    }
  }

  updateUI(payload);

  // Apply chosen card style variant
  function applyCardStyle(data) {
    data = normalizeProfile(data || {});
    var core = getCoreSportCardData(data);
    var style = (data && data.profileCardStyle) || 'card-stack';
    var valid = ['card-stack', 'minimal-list', 'sports-card'];
    if (valid.indexOf(style) === -1) style = 'card-stack';

    document.querySelectorAll('.profile-card-variant').forEach(function(el) {
      el.classList.toggle('active', el.dataset.variant === style);
    });

    // Populate minimal-list variant
    if (style === 'minimal-list') {
      var compactFields = getCompactVariantFields(data, core);
      var name = core.name || 'User';
      var initials = name.split(' ').map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2);
      var mlAv = document.getElementById('ml-avatar');
      if (mlAv) {
        if (core.avatarUrl) {
          mlAv.innerHTML = '<img src="' + core.avatarUrl + '" alt="' + name + '">';
        } else {
          mlAv.textContent = initials;
        }
      }
      var mlName = document.getElementById('ml-name');
      if (mlName) mlName.textContent = name;
      var mlSub = document.getElementById('ml-sub');
      if (mlSub) mlSub.textContent = core.sport || data.profession || 'User';
      var mlFollowers = document.getElementById('ml-followers');
      if (mlFollowers) mlFollowers.textContent = core.followers;
      var mlFollowing = document.getElementById('ml-following');
      if (mlFollowing) mlFollowing.textContent = core.following;
      var mlMedia = document.getElementById('ml-media');
      if (mlMedia) mlMedia.textContent = core.mediaCount;

      // Build field rows
      var mlFields = document.getElementById('ml-fields');
      if (mlFields) {
        var rows = '';
        compactFields.forEach(function(field) {
          if (field.visible) {
            rows += '<div class="pc-minimal-row"><span class="pc-minimal-fl">' + field.label + '</span><span class="pc-minimal-fv" style="' + (field.value ? '' : 'color:var(--muted);') + '">' + (field.value || getRoleEmptyPlaceholder(data.userType || 'athlete', field.label)) + '</span></div>';
          }
        });
        mlFields.innerHTML = rows || '<div class="pc-minimal-row"><span class="pc-minimal-fl" style="color:var(--muted)">No public fields</span></div>';

        // completion bar
        var total = compactFields.length;
        var filled = compactFields.filter(function(field){ return field.visible && field.value; }).length;
        var mlBar = document.getElementById('ml-bar');
        if (mlBar) mlBar.style.width = Math.round(filled / total * 100) + '%';
      }
    }

    // Populate sports-card variant
    if (style === 'sports-card') {
      var sportCardFields = getCompactVariantFields(data, core);
      var sName = core.name || 'User';
      var sInitials = sName.split(' ').map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2);
      var scAv = document.getElementById('sc-avatar');
      if (scAv) {
        if (core.avatarUrl) {
          scAv.innerHTML = '<img src="' + core.avatarUrl + '" alt="' + sName + '">';
        } else {
          scAv.textContent = sInitials;
        }
      }
      var scName = document.getElementById('sc-name');
      if (scName) scName.textContent = sName;
      var scSub = document.getElementById('sc-sub');
      if (scSub) scSub.textContent = core.sport || data.profession || 'User';
      var scFollowers = document.getElementById('sc-followers');
      if (scFollowers) scFollowers.textContent = core.followers;
      var scFollowing = document.getElementById('sc-following');
      if (scFollowing) scFollowing.textContent = core.following;
      var scMedia = document.getElementById('sc-media');
      if (scMedia) scMedia.textContent = core.mediaCount;

      // Pills
      var scPills = document.getElementById('sc-pills');
      if (scPills) {
        var pills = '';
        var pillFields = getCompactPills(sportCardFields);
        if (pillFields[0]) pills += '<span class="pc-sports-pill pc-sports-pill--pos">' + pillFields[0].value + '</span>';
        if (pillFields[1]) pills += '<span class="pc-sports-pill pc-sports-pill--lvl">' + pillFields[1].value + '</span>';
        scPills.innerHTML = pills;
      }

      // Tile grid
      var scFields = document.getElementById('sc-fields');
      if (scFields) {
        var tiles = '';
        sportCardFields.forEach(function(field) {
          if (field.visible) {
            var tileVal = field.value || getRoleEmptyPlaceholder(data.userType || 'athlete', field.label);
            tiles += '<div class="pc-sports-tile"><div class="pc-sports-tile-label">' + field.label + '</div><div class="pc-sports-tile-val" style="' + (field.value ? '' : 'color:var(--muted);font-weight:500;') + '">' + tileVal + '</div></div>';
          }
        });
        scFields.innerHTML = tiles || '<div class="pc-sports-tile"><div class="pc-sports-tile-label" style="color:var(--muted)">No public fields</div></div>';
      }
    }
  }

  applyCardStyle(payload);

  // Initialize connect/follow button to use numeric userId and FollowManager
  (function initProfileFollowButton(){
    try {
      const connectBtn = document.getElementById('connectBtn');
      if (!connectBtn) return;
      // use the URL param `userId` which may be numeric
      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('userId') || urlParams.get('id') || '';
      if (!targetId) return;

      if (window.updateFollowButtonStatus) {
        updateFollowButtonStatus(connectBtn, targetId);
      }

      connectBtn.addEventListener('click', async function(e){
        e.preventDefault(); e.stopPropagation();
        if (this.disabled) return;
        this.disabled = true;
        try {
          if (!window.followManager) {
            const connected = this.classList.toggle('connected');
            this.innerHTML = connected?'<i class="fa-solid fa-check" style="font-size:12px"></i> Following':'<i class="fa-solid fa-user-plus" style="font-size:12px"></i> Follow';
            return;
          }

          const status = await followManager.getFollowStatus(targetId);
          if (status === 'accepted') {
            const ok = await followManager.unfollow(targetId);
            if (ok) {
              this.classList.remove('connected');
              this.innerHTML = '<i class="fa-solid fa-user-plus" style="font-size:12px"></i> Follow';
              document.getElementById('connStatus').textContent = 'Not connected';
              document.getElementById('messageBtn').style.display = 'none';
              bumpNumericStat('followers', -1);
            }
          } else if (status === 'pending') {
            this.textContent = 'Requested';
            this.disabled = true;
          } else {
            const ok = await followManager.follow(targetId);
            if (ok) {
              this.classList.add('connected');
              this.innerHTML = '<i class="fa-solid fa-check" style="font-size:12px"></i> Following';
              document.getElementById('connStatus').textContent = 'Following';
              document.getElementById('messageBtn').style.display = 'flex';
              bumpNumericStat('followers', 1);
            }
          }
        } catch (err) {
          console.error('Profile connect error:', err);
        } finally {
          this.disabled = false;
        }
      });
    } catch (e) { console.warn('Init profile follow button failed:', e); }
  })();

  // Listen for profile sync updates
  window.addEventListener('profileSyncUpdated', (event) => {
    const updated = normalizeProfile(event?.detail?.profile || {});
    const incomingTs = Number(event?.detail?.timestamp || getNormalizer().getProfileTimestamp(updated) || Date.now());
    const isCurrentProfile = matchesViewedProfile(updated);

    if (!isCurrentProfile) {
      console.debug('[Spopeer][ProfileSync] Ignored update for different profile', {
        viewedProfileId: userId || '(own profile)',
        incomingIdentifiers: getNormalizer().getIdentifierSet ? getNormalizer().getIdentifierSet(updated) : []
      });
      return;
    }

    if (!getNormalizer().isIncomingNewer(incomingTs, lastAppliedProfileTs)) {
      console.debug('[Spopeer][ProfileSync] Ignored stale profile update', {
        incomingTs: incomingTs,
        currentTs: lastAppliedProfileTs
      });
      return;
    }

    lastAppliedProfileTs = incomingTs;
    payload = updated;
    updateUI(updated);
    applyCardStyle(updated);
  });

  /* Media — show real data or empty state */
  const mc=document.getElementById('media-container');
  if(payload&&payload.media&&payload.media.length){
    payload.media.forEach(function(item){
      const d=document.createElement('div');d.className='media-placeholder';
      if(item.type==='video'){
        d.innerHTML='<video src="'+item.url+'" style="width:100%;height:100%;object-fit:cover"></video><div class="media-badge">Video</div>';
      } else {
        d.innerHTML='<img src="'+item.url+'" alt="" style="width:100%;height:100%;object-fit:cover"><div class="media-badge">Photo</div>';
      }
      mc.appendChild(d);
    });
  } else {
    mc.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:32px 16px;color:var(--muted)"><i class="fa-regular fa-image" style="font-size:28px;margin-bottom:8px;display:block"></i>No media yet</div>';
  }

  /* Achievements — empty state */
  const ag=document.getElementById('achievements-content');
  ag.innerHTML='<div style="text-align:center;padding:24px 16px;color:var(--muted)"><i class="fa-regular fa-trophy" style="font-size:24px;margin-bottom:8px;display:block"></i>No achievements yet</div>';

  /* Testimonials — empty state */
  const tc=document.getElementById('testimonials-content');
  tc.innerHTML='<div style="text-align:center;padding:24px 16px;color:var(--muted)"><i class="fa-regular fa-comment" style="font-size:24px;margin-bottom:8px;display:block"></i>No testimonials yet</div>';

  /* Recommended — empty state */
  const rc=document.getElementById('recommended-content');
  rc.innerHTML='<div style="text-align:center;padding:24px 16px;color:var(--muted)"><i class="fa-regular fa-user" style="font-size:24px;margin-bottom:8px;display:block"></i>No recommendations yet</div>';
})();
} // end fallback guard
