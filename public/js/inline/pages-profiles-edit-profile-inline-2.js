(function() {
  'use strict';

  // ── SPORTS LIST ──
  var SPORTS = ['Football','Basketball','Running','Swimming','Tennis','Cycling','Boxing','Volleyball','Athletics','Rugby','Cricket','Golf','Baseball','American Football','Ice Hockey','Gymnastics','Martial Arts','Table Tennis','Badminton','Rowing','Handball','Water Polo','Skiing','Snowboarding','Surfing','Skateboarding','Archery','Fencing','Wrestling','Judo','Karate','Taekwondo','Climbing','Triathlon','Sailing','Equestrian','Shooting','Weightlifting','Powerlifting','CrossFit'];

  var ud = (function() {
    try {
      return JSON.parse(localStorage.getItem('spopeer_user') || '{}');
    } catch (e) {
      console.warn('Invalid profile JSON in storage, using empty profile.', e);
      return {};
    }
  })();

  // ── Read URL params for role/onboarding routing ──
  var _params = new URLSearchParams(window.location.search);
  var _roleParam = _params.get('role');
  var _onboarding = _params.get('onboarding') === '1';
  var userType = _roleParam || ud.userType || 'athlete';

  // Show onboarding banner when arriving from a role page redirect
  if (_onboarding) {
    var banner = document.getElementById('onboardingBanner');
    if (banner) banner.style.display = '';
    var roleLabel = document.getElementById('onboardingRoleLabel');
    var roleLabelMap = { athlete:'athlete', coach:'coach', club:'club', 'supportive_professional':'professional' };
    if (roleLabel) roleLabel.textContent = roleLabelMap[userType] || userType;
    var pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = 'Complete Your Profile';
  }

  // ── Show type sections & nav ──
  var typeMap = {
    athlete: ['athlete-sections','nav-sports'],
    coach: ['coach-sections','nav-coaching'],
    club: ['club-sections','nav-club'],
    'supportive_professional': ['supportive_professional-sections','nav-services']
  };
  (typeMap[userType] || typeMap.athlete).forEach(function(id) {
    var domEl = document.getElementById(id);
    if (domEl) domEl.style.display = '';
  });

  // Hide highlight video for non-athletes
  if (userType !== 'athlete') {
    var hlg = document.getElementById('hl-video-group');
    if (hlg) hlg.style.display = 'none';
  }

  // ── Sidebar hydration (kept for page-specific fields) ──
  var typeLabels = { athlete:'Athlete', coach:'Coach', club:'Club', 'supportive_professional':'Professional' };
  var roleInfo = {
    athlete:  { icon: 'fa-person-running', label: 'Athlete' },
    coach:    { icon: 'fa-bullseye',       label: 'Coach' },
    club:     { icon: 'fa-shield-halved',  label: 'Club' },
    'supportive_professional': { icon: 'fa-star', label: 'Pro' }
  };

  // ── Back link stays as /feed.html (home); View My Profile uses stable id ──
  var viewMyLink = document.getElementById('viewMyProfileLink');
  if (viewMyLink) {
    var stableId = (ud.id || ud.userId || ud.email || '');
    viewMyLink.href = 'public-profile.html?userId=' + encodeURIComponent(stableId);
  }

  // ── Subtitle ──
  el('pageSubtitle', 'Editing your ' + (typeLabels[userType]||'Athlete') + ' profile — changes are saved per section.');

  // ── Populate sport selects ──
  document.querySelectorAll('.sport-select').forEach(function(sel) {
    sel.innerHTML = '<option value="">Select sport</option>';
    SPORTS.forEach(function(s) {
      var o = document.createElement('option');
      o.value = s.toLowerCase().replace(/\s+/g,'-');
      o.textContent = s;
      sel.appendChild(o);
    });
  });

  // ── Pre-fill ──
  function hydrateFormFields(p) {
    if (!p) return;
    setVal('displayNameInput', p.displayName);
    setVal('fullNameInput', p.name || ((p.firstName||'') + ' ' + (p.lastName||'')).trim());
    setVal('usernameInput', p.username || '');
    setVal('dobInput', p.dateOfBirth);
    setSel('genderInput', p.gender);
    setVal('nationalityInput', p.nationality);
    setVal('locationInput', p.location);
    setVal('bioInput', p.bio);
    setVal('contactEmailInput', p.contactEmail);
    setVal('contactPhoneInput', p.contactPhone);
    setVal('contactAddressInput', p.contactAddress);

    // Athlete fields
    setSel('primarySportInput', p.primarySport || p.sport);
    setSel('playingLevelInput', p.playingLevel || p.sportsLevel);
    setVal('positionInput', p.position);
    setVal('currentTeamInput', p.currentTeam);
    setVal('sportsYearsInput', p.sportsYears);
    setVal('achievementsInput', p.achievements);
    setSel('highestLevelInput', p.highestLevelAchieved);
    var stats = p.stats || {};
    setVal('statGoals', stats.goalsOrPoints);
    setVal('statAssists', stats.assists);
    setVal('statApps', stats.appearances);
    setSel('trainingDaysInput', p.trainingDays);
    setVal('trainingHoursInput', p.trainingHours);
    setVal('trainingLocationInput', p.trainingLocation);
    setVal('trainingInput', p.trainingRoutine);
    setSel('availabilityInput', p.availability);
    setVal('coachesTrainersInput', p.coachesTrainers);
    if (p.trainingFocus && Array.isArray(p.trainingFocus)) {
      p.trainingFocus.forEach(function(f) { var c = document.getElementById('focus_' + f); if (c) c.checked = true; });
    }
    if (p.goals && Array.isArray(p.goals)) {
      p.goals.forEach(function(g) { var c = document.getElementById('goal_' + g); if (c) c.checked = true; });
    }
    // Physical
    setVal('heightInput', p.height);
    setVal('weightInput', p.weight);
    setVal('chestInput', p.chest);
    setVal('waistInput', p.waist);
    setVal('hipsInput', p.hips);
    setSel('eyeColorInput', p.eyeColor);
    setSel('hairColorInput', p.hairColor);
    // Competition
    setVal('upcomingEventsInput', p.upcomingEvents);
    setVal('competitionHistoryInput', p.competitionHistory);
    setVal('teamInfoInput', p.teamInfo);
    // Health
    setVal('injuryHistoryInput', p.injuryHistory);
    setVal('currentInjuriesInput', p.currentInjuries);
    setVal('medicalHistoryInput', p.medicalHistory);
    setVal('nutritionDietInput', p.nutritionDiet);

    // Coach fields
    setSel('coachSportInput', p.primarySport || p.sport);
    setVal('specializationInput', p.specialization);
    setVal('experienceInput', p.experience);
    setVal('coachTeamInput', p.currentTeam);
    setVal('coachEducationInput', p.coachEducation);
    setSel('coachingStyleInput', p.coachingStyle);
    setVal('philosophyInput', p.coachingPhilosophy);
    setVal('teamsCoached', p.teamsCoached);
    setVal('coachAchievementsInput', p.coachAchievements);
    setVal('certificationsInput', p.certifications);
    setVal('trainingPlansInput', p.trainingPlans);
    setVal('playerDevelopmentInput', p.playerDevelopment);
    setVal('techniquesMethodsInput', p.techniquesMethods);
    setVal('teamManagementInput', p.teamManagement);
    setVal('rosterManagementInput', p.rosterManagement);
    setVal('playerSelectionInput', p.playerSelection);

    // Club fields
    setVal('clubNameInput', p.clubName || p.name);
    setSel('clubSportInput', p.primarySport || p.sport);
    setVal('foundedYearInput', p.foundedYear);
    setVal('teamsAndDivisionsInput', p.teamsAndDivisions);
    setVal('facilitiesInput', p.facilities);
    setVal('clubEmailInput', p.contactEmail);
    setVal('clubPhoneInput', p.clubPhone);
    setVal('clubAddressInput', p.clubAddress);
    setVal('clubWebsiteInput', p.website);
    setVal('coachingStaffInput', p.coachingStaff);
    setVal('managementStaffInput', p.managementStaff);
    setVal('clubPhilosophyInput', p.clubPhilosophy);
    setVal('clubBudgetInput', p.clubBudget);
    setVal('sponsorshipInput', p.sponsorship);
    setVal('revenueStreamsInput', p.revenueStreams);
    setVal('youthProgramsInput', p.youthPrograms);
    setVal('talentRecruitmentInput', p.talentRecruitment);
    setVal('scholarshipsInput', p.scholarships);
    setVal('communityOutreachInput', p.communityOutreach);
    setVal('socialResponsibilityInput', p.socialResponsibility);
    setVal('charitablePartnershipsInput', p.charitablePartnerships);
    setVal('trainingFieldsInput', p.trainingFields);
    setVal('gymFacilitiesInput', p.gymFacilities);
    setVal('lockerRoomsInput', p.lockerRooms);
    setVal('otherFacilitiesInput', p.otherFacilities);
    setVal('equipmentListInput', p.equipmentList);
    setVal('maintenanceScheduleInput', p.maintenanceSchedule);
    setVal('clubLicensingInput', p.clubLicensing);
    setVal('clubComplianceInput', p.clubCompliance);

    // Supportive fields
    setVal('profTitleInput', p.professionalTitle || p.specialization);
    setVal('companyNameInput', p.companyName);
    setSel('specializationFieldInput', p.specializationField);
    setVal('profExperienceInput', p.profExperience);
    setVal('profEducationInput', p.profEducation);
    setVal('servicesInput', p.services);
    setVal('clienteleInput', p.clientele);
    setVal('credentialsInput', p.credentials || p.certifications);
    setVal('profEmailInput', p.contactEmail);
    setSel('preferredContactInput', p.preferredContact);
    setVal('availabilityHoursInput', p.availabilityHours);
    setVal('communicationToolsInput', p.communicationTools);
    setVal('clientReviewsInput', p.clientReviews);
    setVal('professionalRefsInput', p.professionalRefs);
    setVal('feeStructureInput', p.feeStructure);
    setVal('paymentMethodsInput', p.paymentMethods);
    setVal('billingInfoInput', p.billingInfo);
    setVal('profLicensingInput', p.profLicensing);
    setVal('profComplianceInput', p.profCompliance);

    // Media
    var ml = p.mediaLinks || {};
    setVal('highlightInput', ml.highlightVideo || p.highlightVideo);
    setVal('instagramInput', ml.instagram || p.instagram);
    setVal('youtubeInput', ml.youtubeChannel || p.youtube);
    setVal('linkedinInput', ml.linkedIn || p.linkedin);
    setVal('websiteInput', ml.website || p.website);

    // Privacy
    setSel('profileVisibilityInput', p.profileVisibility);
    var sp = p.sharingPreferences || {};
    if (sp.contact === false) { var sc = document.getElementById('share_contact'); if(sc) sc.checked = false; }
    if (sp.stats === false) { var ss = document.getElementById('share_stats'); if(ss) ss.checked = false; }
    if (sp.media === false) { var sm = document.getElementById('share_media'); if(sm) sm.checked = false; }
    if (sp.searchable === false) { var sx = document.getElementById('share_searchable'); if(sx) sx.checked = false; }
    if (sp.messaging === true) { var sg = document.getElementById('share_messaging'); if(sg) sg.checked = true; }

    // Card style
    var cardSaved = p.profileCardStyle || 'card-stack';
    document.querySelectorAll('.card-style-option').forEach(function(opt) {
      var radio = opt.querySelector('input[type="radio"]');
      if (opt.dataset.value === cardSaved) {
        opt.classList.add('selected');
        if (radio) radio.checked = true;
      } else {
        opt.classList.remove('selected');
      }
    });

    // Avatar preview
    if (p.avatarUrl) {
      var avEl = document.getElementById('avatarPreviewEl');
      if (avEl) avEl.innerHTML = '<img src="'+p.avatarUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    }

    // Cover strip
    if (p.coverPhotoUrl || p.coverUrl) {
      var csEl = document.getElementById('coverStrip');
      var coverSrc = p.coverPhotoUrl || p.coverUrl;
      if (csEl) csEl.style.backgroundImage = 'url('+coverSrc+')';
    }
  }
  // Expose for re-hydration after backend fetch
  window._hydrateEditProfileFormFields = hydrateFormFields;

  hydrateFormFields(ud);

  // Card style picker — visual selection (click interaction)
  document.addEventListener('click', function(e) {
    var opt = e.target.closest('.card-style-option');
    if (!opt) return;
    document.querySelectorAll('.card-style-option').forEach(function(o) {
      o.classList.remove('selected');
      var r = o.querySelector('input[type="radio"]');
      if (r) r.checked = false;
    });
    opt.classList.add('selected');
    var radio = opt.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });

  // ── Bio char counter ──
  var bioInput = document.getElementById('bioInput');
  var bioCounter = document.getElementById('bioCounter');
  if (bioInput && bioCounter) {
    function updateCounter() {
      var len = bioInput.value.length;
      bioCounter.textContent = len + ' / 500';
      bioCounter.className = 'char-counter' + (len > 480 ? (len >= 500 ? ' over' : ' warn') : '');
    }
    bioInput.addEventListener('input', updateCounter);
    updateCounter();
  }

  // ── Completion score ──
  function recalcCompletion() {
    var fresh = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
    var fields = ['name','bio','avatarUrl','location','primarySport','playingLevel','position','currentTeam','achievements'];
    var done = fields.filter(function(f){ return fresh[f] && String(fresh[f]).trim(); }).length;
    var pct = Math.round((done / fields.length) * 100);
    var fill = document.getElementById('completionFill');
    var pctEl = document.getElementById('completionPct');
    var subEl = document.getElementById('completionSub');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (subEl) subEl.textContent = pct < 40 ? 'Just getting started' : pct < 70 ? 'Looking good!' : pct < 100 ? 'Almost there!' : 'Profile complete!';

    // status dots
    var dotMap = {
      'status-photo': ['avatarUrl','displayName'],
      'status-basic': ['name','bio','location'],
      'status-sports': ['primarySport','playingLevel'],
      'status-achievements': ['achievements'],
      'status-training': ['trainingRoutine','availability'],
      'status-physical': ['height','weight'],
      'status-competition': ['upcomingEvents','competitionHistory'],
      'status-health': ['injuryHistory','nutritionDiet'],
      'status-coaching': ['primarySport','specialization'],
      'status-coach-training': ['trainingPlans','playerDevelopment'],
      'status-management': ['teamManagement'],
      'status-club': ['clubName'],
      'status-club-staff': ['coachingStaff'],
      'status-financial': ['clubBudget','sponsorship'],
      'status-youth': ['youthPrograms'],
      'status-community': ['communityOutreach'],
      'status-facilities': ['trainingFields','gymFacilities'],
      'status-equipment': ['equipmentList'],
      'status-club-legal': ['clubLicensing'],
      'status-services': ['professionalTitle'],
      'status-communication': ['preferredContact','availabilityHours'],
      'status-testimonials': ['clientReviews'],
      'status-payment': ['feeStructure'],
      'status-prof-legal': ['profLicensing'],
      'status-media': ['mediaLinks'],
      'status-privacy': ['profileVisibility', 'profileCardStyle']
    };
    Object.keys(dotMap).forEach(function(statusId) {
      var dot = document.getElementById(statusId);
      if (!dot) return;
      var keys = dotMap[statusId];
      var filled = keys.some(function(k){ return fresh[k] && (typeof fresh[k] === 'object' ? Object.values(fresh[k]).some(Boolean) : String(fresh[k]).trim()); });
      dot.className = 'nav-status' + (filled ? '' : ' empty');
    });
  }
  recalcCompletion();

  // ── Photo upload ──
  var uploadBtn = document.getElementById('uploadPhotoBtn');
  var avatarRing = document.getElementById('avatarRing');
  var photoInput = document.getElementById('photoFileInput');
  if (uploadBtn && photoInput) {
    uploadBtn.addEventListener('click', function(){ photoInput.click(); });
  }
  if (avatarRing && photoInput) {
    avatarRing.addEventListener('click', function(){ photoInput.click(); });
  }
  if (photoInput) {
    photoInput.addEventListener('change', async function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
      if (file.size > 10*1024*1024) { showToast('File must be under 10 MB', 'error'); return; }
      var previewUrl = URL.createObjectURL(file);
      var av = document.getElementById('avatarPreviewEl');
      if (av) av.innerHTML = '<img src="'+previewUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
      try {
        if (!window.SpopeerAPI || typeof window.SpopeerAPI.uploadAvatar !== 'function') {
          throw new Error('Avatar upload API unavailable.');
        }
        console.log('Uploading avatar', file.name, file.type, file.size);
        var uploadResult = await window.SpopeerAPI.uploadAvatar(file);
        console.log('Avatar upload response', uploadResult);
        var avatarUrl = (uploadResult.data && uploadResult.data.avatarUrl) || uploadResult.avatarUrl;
        if (!avatarUrl) throw new Error('Avatar upload returned no URL.');

        var savedUser = (window.SpopeerAPI.getUser && window.SpopeerAPI.getUser()) || JSON.parse(localStorage.getItem('spopeer_user') || '{}');
        var mergedUser = Object.assign({}, savedUser, { avatarUrl: avatarUrl });
        localStorage.setItem('spopeer_user', JSON.stringify(mergedUser));
        if (window.SpopeerAPI.setUser) {
          window.SpopeerAPI.setUser(mergedUser, 'EditProfileAvatarUpload');
        }
        if (window.SpopeerAPI && typeof window.SpopeerAPI.getProfile === 'function') {
          try {
            await window.SpopeerAPI.getProfile();
          } catch (refreshErr) {
            console.warn('Profile refresh after avatar upload failed', refreshErr);
          }
        }

        var sa2 = document.getElementById('sidebarAv');
        if (sa2) sa2.innerHTML = '<img src="'+avatarUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        if (av) av.innerHTML = '<img src="'+avatarUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        showToast('Photo updated!', 'success');
        recalcCompletion();
      } catch (uploadErr) {
        console.error('Avatar upload failed', uploadErr);
        var backendMessage = (uploadErr && uploadErr.response && uploadErr.response.error && uploadErr.response.error.message) || (uploadErr && uploadErr.message) || 'Could not upload avatar.';
        showToast(backendMessage, 'error');
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    });
  }

  var removeBtn = document.getElementById('removePhotoBtn');
  if (removeBtn) {
    removeBtn.addEventListener('click', function() {
      if (!confirm('Remove your profile photo?')) return;
      ud = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
      delete ud.avatarUrl;
      safeSave(ud);
      var av = document.getElementById('avatarPreviewEl');
      if (av) av.innerHTML = '<i class="fa-solid fa-user" style="font-size:34px;opacity:.6"></i>';
      showToast('Photo removed', 'info');
      recalcCompletion();
    });
  }

  // ── Cover upload ──
  var coverStrip = document.getElementById('coverStrip');
  var coverInput = document.getElementById('coverInput');
  if (coverStrip && coverInput) {
    coverStrip.addEventListener('click', function() { coverInput.click(); });
    coverInput.addEventListener('change', async function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
      if (file.size > 8*1024*1024) { showToast('Cover file must be under 8 MB', 'error'); return; }

      var previewUrl = URL.createObjectURL(file);
      var cs = document.getElementById('coverStrip');
      if (cs) {
        cs.style.backgroundImage = 'url('+previewUrl+')';
        cs.style.backgroundSize = 'cover';
        cs.style.backgroundPosition = 'center';
      }

      try {
        if (!window.SpopeerAPI || typeof window.SpopeerAPI.uploadCover !== 'function') {
          throw new Error('Cover upload API unavailable.');
        }
        var uploadResult = await window.SpopeerAPI.uploadCover(file);
        var coverUrl = (uploadResult.data && uploadResult.data.coverPhotoUrl) || uploadResult.coverPhotoUrl;
        if (!coverUrl) throw new Error('Cover upload returned no URL.');

        var savedUser = (window.SpopeerAPI.getUser && window.SpopeerAPI.getUser()) || JSON.parse(localStorage.getItem('spopeer_user') || '{}');
        var mergedUser = Object.assign({}, savedUser, { coverPhotoUrl: coverUrl, coverUrl: coverUrl });
        ud = mergedUser;
        if (window.SpopeerAPI.setUser) {
          window.SpopeerAPI.setUser(mergedUser, 'EditProfileCoverUpload');
        }
        safeSave(mergedUser);

        if (cs) {
          cs.style.background = 'url('+coverUrl+') center/cover no-repeat';
        }
        showToast('Cover photo updated!', 'success');
      } catch (uploadErr) {
        console.error('Cover upload failed', uploadErr);
        showToast('Could not upload cover. Please try again.', 'error');
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
    });
  }

  // ── Sidebar nav active state on scroll ──
  var sections = document.querySelectorAll('.edit-card[id]');
  var navItems = document.querySelectorAll('.sidebar-nav-item[data-section]');
  window.addEventListener('scroll', function() {
    var scrollY = window.scrollY + 100;
    sections.forEach(function(sec) {
      if (sec.offsetTop <= scrollY && sec.offsetTop + sec.offsetHeight > scrollY) {
        navItems.forEach(function(n){ n.classList.remove('active'); });
        var active = document.querySelector('.sidebar-nav-item[href="#'+sec.id+'"]');
        if (active) active.classList.add('active');
      }
    });
  }, { passive: true });

  // ── Save All ──
  var saveAllInFlight = false;

  function defaultSaveButtonLabel(section) {
    return '<i class="fa-solid fa-check" style="font-size:11px"></i> Save ' + sectionLabel(section);
  }

  async function handleSectionSave(btn) {
    if (!btn || btn.disabled || btn.classList.contains('saving')) {
      return null;
    }

    var section = btn.dataset.section;
    var statusEl = document.getElementById('status-msg-' + section);
    var defaultLabel = defaultSaveButtonLabel(section);

    btn.disabled = true;
    btn.classList.add('saving');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:11px"></i> Saving...';
    if (statusEl) { statusEl.className = 'save-status saving'; statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:10px"></i> Saving...'; }

    ud = JSON.parse(localStorage.getItem('spopeer_user') || '{}');

    try {

      if (section === 'photo') {
        var dn = v('displayNameInput');
        if (dn) ud.displayName = dn;
      } else if (section === 'basic') {
        var fn = v('fullNameInput');
        if (fn) { var sn = splitName(fn); ud.name = fn; ud.firstName = sn[0]; ud.lastName = sn[1]; }
        var unameVal = v('usernameInput');
        if (unameVal) {
          unameVal = unameVal.toLowerCase().replace(/[^a-z0-9_.]/g, '');
          if (!isUsernameAvailable(unameVal, ud.email)) {
            showToast('Username @' + unameVal + ' is already taken. Choose another.', 'error');
            btn.classList.remove('saving');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check" style="font-size:11px"></i> Save Basic Info';
            if (statusEl) { statusEl.className = 'save-status'; statusEl.textContent = 'Username is already taken.'; }
            return;
          }
          ud.username = unameVal;
        }
        var dob = v('dobInput'); if (dob) ud.dateOfBirth = dob;
        var gen = v('genderInput'); if (gen) ud.gender = gen;
        ud.nationality = v('nationalityInput') || '';
        var loc = v('locationInput'); if (loc !== null) ud.location = loc;
        var bio = v('bioInput'); if (bio !== null) ud.bio = bio;
        ud.contactEmail = v('contactEmailInput') || '';
        ud.contactPhone = v('contactPhoneInput') || '';
        ud.contactAddress = v('contactAddressInput') || '';
      } else if (section === 'sports') {
        var ps = v('primarySportInput'); if (ps) { ud.primarySport = ps; ud.sport = ps; }
        var pl = v('playingLevelInput'); if (pl) { ud.playingLevel = pl; ud.sportsLevel = pl; }
        var pos = v('positionInput'); ud.position = pos;
        var ct = v('currentTeamInput'); ud.currentTeam = ct;
        var sy = v('sportsYearsInput'); if (sy) ud.sportsYears = sy;
      } else if (section === 'achievements') {
        ud.achievements = v('achievementsInput') || '';
        var hl = v('highestLevelInput'); if (hl) ud.highestLevelAchieved = hl;
        ud.stats = { goalsOrPoints: v('statGoals')||'', assists: v('statAssists')||'', appearances: v('statApps')||'' };
      } else if (section === 'training') {
        ud.trainingDays = v('trainingDaysInput') || '';
        ud.trainingHours = v('trainingHoursInput') || '';
        ud.trainingLocation = v('trainingLocationInput') || '';
        ud.trainingRoutine = v('trainingInput') || '';
        var focusArr = [];
        document.querySelectorAll('#trainingFocusCheckboxes input:checked').forEach(function(c){ focusArr.push(c.id.replace('focus_','')); });
        ud.trainingFocus = focusArr;
        ud.coachesTrainers = v('coachesTrainersInput') || '';
        var av2 = v('availabilityInput'); if (av2) ud.availability = av2;
        var goals = [];
        document.querySelectorAll('#goalsCheckboxes input:checked').forEach(function(c){ goals.push(c.id.replace('goal_','')); });
        ud.goals = goals;
      } else if (section === 'physical') {
        ud.height = v('heightInput') || '';
        ud.weight = v('weightInput') || '';
        ud.chest = v('chestInput') || '';
        ud.waist = v('waistInput') || '';
        ud.hips = v('hipsInput') || '';
        ud.eyeColor = v('eyeColorInput') || '';
        ud.hairColor = v('hairColorInput') || '';
      } else if (section === 'competition') {
        ud.upcomingEvents = v('upcomingEventsInput') || '';
        ud.competitionHistory = v('competitionHistoryInput') || '';
        ud.teamInfo = v('teamInfoInput') || '';
      } else if (section === 'health') {
        ud.injuryHistory = v('injuryHistoryInput') || '';
        ud.currentInjuries = v('currentInjuriesInput') || '';
        ud.medicalHistory = v('medicalHistoryInput') || '';
        ud.nutritionDiet = v('nutritionDietInput') || '';
      } else if (section === 'coaching') {
        var cs2 = v('coachSportInput'); if (cs2) { ud.primarySport = cs2; ud.sport = cs2; }
        ud.specialization = v('specializationInput') || '';
        var exp = v('experienceInput'); if (exp) ud.experience = parseInt(exp)||0;
        ud.currentTeam = v('coachTeamInput') || '';
        ud.coachEducation = v('coachEducationInput') || '';
        ud.coachingStyle = v('coachingStyleInput') || '';
        ud.coachingPhilosophy = v('philosophyInput') || '';
        ud.teamsCoached = v('teamsCoached') || '';
        ud.coachAchievements = v('coachAchievementsInput') || '';
        ud.certifications = v('certificationsInput') || '';
      } else if (section === 'coach-training') {
        ud.trainingPlans = v('trainingPlansInput') || '';
        ud.playerDevelopment = v('playerDevelopmentInput') || '';
        ud.techniquesMethods = v('techniquesMethodsInput') || '';
      } else if (section === 'management') {
        ud.teamManagement = v('teamManagementInput') || '';
        ud.rosterManagement = v('rosterManagementInput') || '';
        ud.playerSelection = v('playerSelectionInput') || '';
      } else if (section === 'club') {
        var cn = v('clubNameInput'); if (cn) { ud.clubName = cn; ud.name = cn; }
        var cbs = v('clubSportInput'); if (cbs) { ud.primarySport = cbs; ud.sport = cbs; }
        var fy = v('foundedYearInput'); if (fy) ud.foundedYear = fy;
        ud.teamsAndDivisions = v('teamsAndDivisionsInput') || '';
        ud.facilities = v('facilitiesInput') || '';
        ud.contactEmail = v('clubEmailInput') || '';
        ud.clubPhone = v('clubPhoneInput') || '';
        ud.clubAddress = v('clubAddressInput') || '';
        ud.website = v('clubWebsiteInput') || '';
      } else if (section === 'club-staff') {
        ud.coachingStaff = v('coachingStaffInput') || '';
        ud.managementStaff = v('managementStaffInput') || '';
        ud.clubPhilosophy = v('clubPhilosophyInput') || '';
      } else if (section === 'financial') {
        ud.clubBudget = v('clubBudgetInput') || '';
        ud.sponsorship = v('sponsorshipInput') || '';
        ud.revenueStreams = v('revenueStreamsInput') || '';
      } else if (section === 'youth') {
        ud.youthPrograms = v('youthProgramsInput') || '';
        ud.talentRecruitment = v('talentRecruitmentInput') || '';
        ud.scholarships = v('scholarshipsInput') || '';
      } else if (section === 'community') {
        ud.communityOutreach = v('communityOutreachInput') || '';
        ud.socialResponsibility = v('socialResponsibilityInput') || '';
        ud.charitablePartnerships = v('charitablePartnershipsInput') || '';
      } else if (section === 'facilities') {
        ud.trainingFields = v('trainingFieldsInput') || '';
        ud.gymFacilities = v('gymFacilitiesInput') || '';
        ud.lockerRooms = v('lockerRoomsInput') || '';
        ud.otherFacilities = v('otherFacilitiesInput') || '';
      } else if (section === 'equipment') {
        ud.equipmentList = v('equipmentListInput') || '';
        ud.maintenanceSchedule = v('maintenanceScheduleInput') || '';
      } else if (section === 'club-legal') {
        ud.clubLicensing = v('clubLicensingInput') || '';
        ud.clubCompliance = v('clubComplianceInput') || '';
      } else if (section === 'services') {
        var pt = v('profTitleInput'); if (pt) { ud.professionalTitle = pt; ud.specialization = pt; }
        ud.companyName = v('companyNameInput') || '';
        ud.specializationField = v('specializationFieldInput') || '';
        ud.profExperience = v('profExperienceInput') || '';
        ud.profEducation = v('profEducationInput') || '';
        ud.services = v('servicesInput') || '';
        ud.clientele = v('clienteleInput') || '';
        ud.credentials = v('credentialsInput') || '';
        ud.certifications = v('credentialsInput') || '';
        ud.contactEmail = v('profEmailInput') || '';
      } else if (section === 'communication') {
        ud.preferredContact = v('preferredContactInput') || '';
        ud.availabilityHours = v('availabilityHoursInput') || '';
        ud.communicationTools = v('communicationToolsInput') || '';
      } else if (section === 'testimonials') {
        ud.clientReviews = v('clientReviewsInput') || '';
        ud.professionalRefs = v('professionalRefsInput') || '';
      } else if (section === 'payment') {
        ud.feeStructure = v('feeStructureInput') || '';
        ud.paymentMethods = v('paymentMethodsInput') || '';
        ud.billingInfo = v('billingInfoInput') || '';
      } else if (section === 'prof-legal') {
        ud.profLicensing = v('profLicensingInput') || '';
        ud.profCompliance = v('profComplianceInput') || '';
      } else if (section === 'media') {
        ud.mediaLinks = {
          highlightVideo: v('highlightInput') || '',
          instagram: v('instagramInput') || '',
          youtubeChannel: v('youtubeInput') || '',
          linkedIn: v('linkedinInput') || '',
          website: v('websiteInput') || ''
        };
        ud.instagram = ud.mediaLinks.instagram;
        ud.youtube = ud.mediaLinks.youtubeChannel;
        ud.linkedin = ud.mediaLinks.linkedIn;
        ud.website = ud.mediaLinks.website;
        ud.highlightVideo = ud.mediaLinks.highlightVideo;
      } else if (section === 'privacy') {
        ud.profileVisibility = v('profileVisibilityInput') || 'public';
        ud.sharingPreferences = {
          contact: !!document.getElementById('share_contact').checked,
          stats: !!document.getElementById('share_stats').checked,
          media: !!document.getElementById('share_media').checked,
          searchable: !!document.getElementById('share_searchable').checked,
          messaging: !!document.getElementById('share_messaging').checked
        };
        ud.profileCardStyle = (function() {
          var sel = document.querySelector('.card-style-option.selected');
          return sel ? sel.dataset.value : 'card-stack';
        })();
      }

      // Canonical key aliases for cross-page sync
      if (ud.sportsYears) ud.experience = ud.sportsYears;
      if (ud.highestLevelAchieved) ud.highestLevel = ud.highestLevelAchieved;
      if (ud.coachesTrainers) ud.coaches = ud.coachesTrainers;
      if (ud.coachingPhilosophy) ud.philosophy = ud.coachingPhilosophy;
      if (ud.coachEducation) ud.education = ud.coachEducation;
      if (ud.coachAchievements && userType === 'coach') ud.achievements = ud.coachAchievements;
      if (section === 'club' && v('clubEmailInput')) ud.clubEmail = v('clubEmailInput');
      if (userType === 'club' && ud.website) ud.clubWebsite = ud.website;
      if (section === 'services' && v('profEmailInput')) ud.profEmail = v('profEmailInput');
      if (ud.profExperience && userType === 'supportive_professional') ud.experience = ud.profExperience;
      if (ud.profEducation && userType === 'supportive_professional') ud.education = ud.profEducation;
      if (userType === 'club' && ud.clubName) ud.firstName = ud.clubName;

      // Include visibility in every save
      ud.visibility = collectVisibilitySettings();

      // Unified save: API + local UI refresh together
      var merged = await saveSection(ud);
      ud = merged;
      recalcCompletion();

      var dispName = ud.displayName || ud.name || ((ud.firstName||'') + ' ' + (ud.lastName||'')).trim() || 'User';
      var ini = dispName.split(' ').map(function(n){return n[0]||'';}).join('').toUpperCase().slice(0,2) || 'U';
      el('sidebarName', dispName);
      el('sidebarHandle', '@' + (ud.username || (ud.email ? ud.email.split('@')[0] : 'user')));

      // Sync avatar
      var sa = document.getElementById('sidebarAv');
      if (ud.avatarUrl) {
        var imgH = '<img src="'+ud.avatarUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        if (sa) sa.innerHTML = imgH;
      } else {
        if (sa && !sa.querySelector('img')) sa.textContent = ini;
      }

      // Sync role badge
      var ri2 = roleInfo[ud.userType] || roleInfo.athlete;
      var rb2 = document.getElementById('sidebarRoleBadge');
      if (rb2) rb2.innerHTML = '<i class="fa-solid ' + ri2.icon + '" style="font-size:8px"></i> ' + ri2.label;

      // Sync sport badge
      var sn2 = ud.primarySport || ud.sport || '';
      var sb2 = document.getElementById('sidebarSportBadge');
      if (sb2) {
        if (sn2) {
          sb2.innerHTML = '<i class="fa-solid fa-futbol" style="font-size:8px"></i> ' + sn2.split('-').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(' ');
          sb2.style.display = 'inline-flex';
        } else {
          sb2.style.display = 'none';
        }
      }

      // Register username
      if (ud.username && ud.email) registerUsername(ud.username, ud.email);

      btn.classList.remove('saving');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check" style="font-size:11px"></i> Saved!';
      if(window.clearProfileDirty) window.clearProfileDirty();
      if (statusEl) {
        statusEl.className = 'save-status saved';
        statusEl.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size:11px"></i> Saved successfully';
      }
      setTimeout(function() {
        btn.innerHTML = defaultLabel;
        if (statusEl) { statusEl.className = 'save-status'; statusEl.textContent = ''; }
      }, 2500);
      return merged;
    } catch (error) {
      console.error('Edit profile save failed for section "' + section + '"', error);
      btn.classList.remove('saving');
      btn.disabled = false;
      btn.innerHTML = defaultLabel;
      if (statusEl) {
        statusEl.className = 'save-status';
        statusEl.textContent = 'Could not save changes. Please try again.';
      }
        var errMsg = (error && error.message) || 'Could not save profile. Please try again.';
        if (error && error.response && error.response.error && error.response.error.message) {
          errMsg = error.response.error.message;
        }
        showToast(errMsg, 'error');
      throw error;
    }
  }

  function buildCombinedProfileFromForm() {
    var draft = JSON.parse(localStorage.getItem('spopeer_user') || '{}');

    var fullName = v('fullNameInput');
    if (fullName) {
      var split = splitName(fullName);
      draft.name = fullName;
      if (split[0]) draft.firstName = split[0];
      if (split[1]) draft.lastName = split[1];
    }

    var primarySport = v('primarySportInput') || v('coachSportInput') || v('clubSportInput');
    if (primarySport) {
      draft.primarySport = primarySport;
      draft.sport = primarySport;
    }

    var map = {
      displayNameInput: 'displayName',
      usernameInput: 'username',
      dobInput: 'dateOfBirth',
      genderInput: 'gender',
      nationalityInput: 'nationality',
      locationInput: 'location',
      bioInput: 'bio',
      contactEmailInput: 'contactEmail',
      contactPhoneInput: 'contactPhone',
      contactAddressInput: 'contactAddress',
      playingLevelInput: 'playingLevel',
      positionInput: 'position',
      currentTeamInput: 'currentTeam',
      achievementsInput: 'achievements',
      highestLevelInput: 'highestLevelAchieved',
      trainingInput: 'trainingRoutine',
      trainingLocationInput: 'trainingLocation',
      injuryHistoryInput: 'injuryHistory',
      nutritionDietInput: 'nutritionDiet',
      specializationInput: 'specialization',
      coachEducationInput: 'coachEducation',
      philosophyInput: 'coachingPhilosophy',
      teamsCoached: 'teamsCoached',
      clubNameInput: 'clubName',
      clubEmailInput: 'contactEmail',
      clubPhoneInput: 'clubPhone',
      clubAddressInput: 'clubAddress',
      clubWebsiteInput: 'website',
      companyNameInput: 'companyName',
      profEmailInput: 'profEmail',
      preferredContactInput: 'preferredContact',
      availabilityHoursInput: 'availabilityHours',
      feeStructureInput: 'feeStructure'
    };

    Object.keys(map).forEach(function(inputId) {
      var value = v(inputId);
      if (value !== null && value !== undefined) {
        draft[map[inputId]] = value;
      }
    });

    draft.stats = {
      goalsOrPoints: v('statGoals') || '',
      assists: v('statAssists') || '',
      appearances: v('statApps') || ''
    };

    draft.mediaLinks = {
      highlightVideo: v('highlightInput') || '',
      instagram: v('instagramInput') || '',
      youtubeChannel: v('youtubeInput') || '',
      linkedIn: v('linkedinInput') || '',
      website: v('websiteInput') || ''
    };

    draft.sharingPreferences = {
      contact: !!document.getElementById('share_contact').checked,
      stats: !!document.getElementById('share_stats').checked,
      media: !!document.getElementById('share_media').checked,
      searchable: !!document.getElementById('share_searchable').checked,
      messaging: !!document.getElementById('share_messaging').checked
    };

    draft.visibility = collectVisibilitySettings();
    draft.profileVisibility = v('profileVisibilityInput') || draft.profileVisibility || 'public';
    draft.privacyPublic = draft.profileVisibility !== 'private';

    var selectedCard = document.querySelector('.card-style-option.selected');
    draft.profileCardStyle = selectedCard ? selectedCard.dataset.value : (draft.profileCardStyle || 'card-stack');

    return draft;
  }

  document.getElementById('saveAllBtn').addEventListener('click', async function() {
    if (saveAllInFlight) return;
    saveAllInFlight = true;

    var saveAllBtn = this;
    var originalLabel = saveAllBtn.innerHTML;
    saveAllBtn.disabled = true;
    saveAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:11px"></i> Saving...';

    try {
      var combined = buildCombinedProfileFromForm();
      console.log('Save All payload', combined);
      var merged = await saveSection(combined);
      ud = merged;
      recalcCompletion();
      showToast('All sections saved!', 'success');
      if(window.clearProfileDirty) window.clearProfileDirty();
    } catch (_error) {
      console.error('Save All failed:', _error);
      showToast('Could not save all sections. Please review the highlighted section.', 'error');
    } finally {
      saveAllInFlight = false;
      saveAllBtn.disabled = false;
      saveAllBtn.innerHTML = originalLabel;
    }
  });

  // ── Section saves ──
  document.querySelectorAll('.btn-save-section').forEach(function(btn) {
    btn.addEventListener('click', function() {
      void handleSectionSave(btn);
    });
  });

  // ── Nav search ──
  document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = '../search/search.html?term=' + encodeURIComponent(e.target.value.trim());
    }
  });

  // ── Profile menu: handled by shared-ui.js setupSocialFeedRuntime ──

  // ── UTILITIES ──
  function el(id, text) { var e = document.getElementById(id); if (e) e.textContent = text; }
  function v(id) { var e = document.getElementById(id); return e ? e.value : null; }
  function setVal(id, val) { var e = document.getElementById(id); if (e && val != null && val !== undefined) e.value = val; }
  function setSel(id, val) {
    var e = document.getElementById(id);
    if (!e || !val) return;
    // Wait for sport selects to populate
    setTimeout(function(){
      for (var i = 0; i < e.options.length; i++) {
        if (e.options[i].value === val || e.options[i].value === String(val).toLowerCase().replace(/\s+/g,'-')) {
          e.selectedIndex = i; return;
        }
      }
    }, 100);
  }
  function splitName(full) {
    var parts = (full||'').trim().split(/\s+/).filter(Boolean);
    return [parts[0]||'', parts.slice(1).join(' ')];
  }

  function normalizeProfileForSave(profileData, timestamp) {
    var normalizer = window.ProfileNormalizer;
    if (normalizer && typeof normalizer.withProfileTimestamp === 'function') {
      return normalizer.withProfileTimestamp(profileData || {}, timestamp || Date.now());
    }
    var merged = Object.assign({}, profileData || {});
    merged._profileUpdatedAt = Number(timestamp || Date.now());
    return merged;
  }

  function safeSave(data) {
    var normalized = normalizeProfileForSave(data, Date.now());
    try {
      if (window.ProfileSyncService && typeof ProfileSyncService.saveProfile === 'function') {
        ProfileSyncService.saveProfile(normalized);
      } else if (window.SpopeerAPI && typeof window.SpopeerAPI.setUser === 'function') {
        window.SpopeerAPI.setUser(normalized, 'EditProfileSafeSave');
      } else {
        localStorage.setItem('spopeer_user', JSON.stringify(normalized));
        localStorage.setItem('spopeerUser', JSON.stringify(normalized));
      }
    } catch(e) {
      localStorage.setItem('spopeer_user', JSON.stringify(normalized));
      localStorage.setItem('spopeerUser', JSON.stringify(normalized));
    }
    localStorage.setItem('_profileLastUpdated_', String(normalized._profileUpdatedAt));
    if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
      try { window.CurrentUserStore.setCurrentUser(normalized); } catch(e) {}
    }
  }

  function readStoredUserSafe() {
    try {
      return JSON.parse(localStorage.getItem('spopeer_user') || '{}');
    } catch (e) {
      console.warn('Invalid profile JSON in storage during save. Falling back to empty object.', e);
      return {};
    }
  }

  function normalizeSavedUserFromResponse(result) {
    return (result && result.data && (result.data.user || result.data.payload)) || (result && result.payload) || (result && result.user) || {};
  }

  function sanitizeProfilePayload(rawPayload) {
    var payload = Object.assign({}, rawPayload || {});
    var jsonFields = ['stats', 'mediaLinks', 'sharingPreferences', 'visibility', 'extendedProfile'];
    var boolFields = ['privacyPublic'];

    Object.keys(payload).forEach(function(key) {
      var value = payload[key];

      if (value === undefined || value === null) {
        delete payload[key];
        return;
      }

      if (typeof value === 'string') {
        var trimmed = value.trim();
        if (!trimmed) {
          payload[key] = '';
          return;
        }
        payload[key] = trimmed;
      }
    });

    // Explicitly guard known validation-sensitive fields.
    if (!payload.firstName) delete payload.firstName;
    if (!payload.lastName) delete payload.lastName;
    if (!payload.contactEmail) delete payload.contactEmail;

    // Normalize booleans.
    boolFields.forEach(function(field) {
      if (payload[field] !== undefined) {
        payload[field] = !!payload[field];
      }
    });

    // Ensure JSON fields are plain objects when present.
    jsonFields.forEach(function(field) {
      if (payload[field] === undefined) return;
      if (typeof payload[field] === 'string') {
        try {
          payload[field] = JSON.parse(payload[field]);
        } catch (_e) {
          delete payload[field];
          return;
        }
      }
      if (!payload[field] || typeof payload[field] !== 'object' || Array.isArray(payload[field])) {
        delete payload[field];
        return;
      }
      if (!Object.keys(payload[field]).length) {
        delete payload[field];
      }
    });

    return payload;
  }

  async function saveSection(profileData) {
    // Schema validation before sending to the server
    if (window.ProfileSchema) {
      var cleanPayload = window.ProfileSchema.sanitize(profileData);
      var validation = window.ProfileSchema.validate(cleanPayload);
      if (!validation.valid) {
        var msg = validation.errors.slice(0, 2).join(' · ');
        showToast(msg || 'Invalid profile data. Please check your inputs.', 'error');
        throw new Error(msg);
      }
      profileData = cleanPayload;
    }
    var outgoing = normalizeProfileForSave(profileData, Date.now());
    var sanitizedOutgoing = sanitizeProfilePayload(outgoing);
    delete sanitizedOutgoing._profileUpdatedAt;
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.updateProfile !== 'function') {
      throw new Error('Profile API is unavailable.');
    }
    console.log('Saving profile payload', sanitizedOutgoing);
    try {
      var result = await window.SpopeerAPI.updateProfile({ payload: sanitizedOutgoing });
      console.log('Save profile response', result);
      var returnedUser = normalizeSavedUserFromResponse(result);
      var saved = normalizeProfileForSave(returnedUser, Date.now());
      var existing = readStoredUserSafe();
      var merged = normalizeProfileForSave(Object.assign({}, existing, saved), saved._profileUpdatedAt || Date.now());
      safeSave(merged);
      return merged;
    } catch (saveErr) {
      console.log('Edit profile save failure details', {
        endpoint: (saveErr && saveErr.endpoint) || '/api/users/me',
        method: (saveErr && saveErr.method) || 'PATCH',
        payload: sanitizedOutgoing,
        backendResponse: saveErr && saveErr.response,
        validationField: saveErr && saveErr.validationField,
        statusCode: saveErr && saveErr.status,
        message: saveErr && saveErr.message
      });
      throw saveErr;
    }
  }
  function showToast(msg, type) {
    var t = document.getElementById('toast');
    t.className = 'toast ' + (type||'info');
    t.innerHTML = '<i class="fa-solid ' + ({success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'}[type]||'fa-circle-info') + '"></i> ' + msg;
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 3200);
  }
  function sectionLabel(s) {
    return {photo:'Photo & Name',basic:'Basic Info',sports:'Sports',achievements:'Achievements',training:'Training',physical:'Physical Info',competition:'Competition',health:'Health Info',coaching:'Coaching','coach-training':'Training & Dev',management:'Management',club:'Club Info','club-staff':'Staff',financial:'Financial',youth:'Youth & Dev',community:'Community',facilities:'Facilities',equipment:'Equipment','club-legal':'Legal',services:'Professional Details',communication:'Communication',testimonials:'Testimonials',payment:'Payment','prof-legal':'Legal',media:'Links',privacy:'Privacy'}[s] || 'Changes';
  }

  // ── Card collapse ──
  function setCardExpanded(card, expanded) {
    if (!card) return;
    if (expanded) {
      card.classList.remove('collapsed');
    } else {
      card.classList.add('collapsed');
    }
    var hdr = card.querySelector('.edit-card-header');
    if (hdr) hdr.setAttribute('aria-expanded', String(expanded));
  }

  // ── Visibility toggle logic ──
  function loadVisibilitySettings() {
    var user = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
    var vis = user.visibility || {};
    document.querySelectorAll('.visibility-toggle').forEach(function(btn) {
      var field = btn.dataset.field;
      var state = vis[field] || btn.dataset.state || 'public';
      setToggleState(btn, state);
    });
  }

  function setToggleState(btn, state) {
    btn.dataset.state = state;
    btn.querySelector('.vis-label').textContent = state === 'public' ? 'Public' : 'Private';
    btn.title = state === 'public' ? 'Click to make private' : 'Click to make public';
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.visibility-toggle');
    if (!btn) return;
    var newState = btn.dataset.state === 'public' ? 'private' : 'public';
    setToggleState(btn, newState);
  });

  function collectVisibilitySettings() {
    var vis = {};
    document.querySelectorAll('.visibility-toggle').forEach(function(btn) {
      vis[btn.dataset.field] = btn.dataset.state;
    });
    return vis;
  }

  loadVisibilitySettings();

  // ── Username uniqueness check ──
  function isUsernameAvailable(username, currentEmail) {
    if (!username) return false;
    var takenMap = JSON.parse(localStorage.getItem('spopeer_usernames') || '{}');
    var owner = takenMap[username.toLowerCase()];
    return !owner || owner === currentEmail;
  }

  function registerUsername(username, email) {
    var takenMap = JSON.parse(localStorage.getItem('spopeer_usernames') || '{}');
    // Remove old username for this user
    Object.keys(takenMap).forEach(function(k) {
      if (takenMap[k] === email) delete takenMap[k];
    });
    takenMap[username.toLowerCase()] = email;
    localStorage.setItem('spopeer_usernames', JSON.stringify(takenMap));
  }

  // Register current username on load
  if (ud.username && ud.email) registerUsername(ud.username, ud.email);

  // ── Live username validation ──
  var usernameInput = document.getElementById('usernameInput');
  var usernameStatus = document.getElementById('usernameStatus');
  if (usernameInput) {
    var usernameTimer = null;
    usernameInput.addEventListener('input', function() {
      var val = usernameInput.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
      usernameInput.value = val;
      clearTimeout(usernameTimer);
      if (!val || val.length < 3) {
        usernameStatus.style.display = val ? 'flex' : 'none';
        usernameStatus.style.color = 'var(--red)';
        usernameStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Username must be at least 3 characters';
        usernameInput.style.borderColor = val ? 'var(--red)' : '';
        return;
      }
      usernameTimer = setTimeout(function() {
        var available = isUsernameAvailable(val, ud.email);
        usernameStatus.style.display = 'flex';
        if (available) {
          usernameStatus.style.color = 'var(--green)';
          usernameStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> @' + val + ' is available';
          usernameInput.style.borderColor = 'var(--green)';
          // Live update sidebar handle
          el('sidebarHandle', '@' + val);
        } else {
          usernameStatus.style.color = 'var(--red)';
          usernameStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> @' + val + ' is already taken';
          usernameInput.style.borderColor = 'var(--red)';
        }
      }, 300);
    });
  }

})();
