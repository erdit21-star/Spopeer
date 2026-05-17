(function () {
  const SUGGESTIONS_TARGET = 8;

  function getCurrentUser() {
    if (window.getCurrentUserData) return window.getCurrentUserData() || {};
    try { return JSON.parse(localStorage.getItem('spopeer_user') || '{}'); } catch (e) { return {}; }
  }

  function getUserKey(user) {
    return String(user && (user.id || user.userId || user.email || 'anon'));
  }

  function roleLabel(role) {
    const map = {
      athlete: 'Athlete',
      coach: 'Coach',
      club: 'Club',
      supportive_professional: 'Sports Pro'
    };
    return map[role] || 'Member';
  }

  function initialsFor(user) {
    const first = (user.firstName || '').charAt(0);
    const last = (user.lastName || '').charAt(0);
    const fallback = (user.displayName || user.email || 'U').charAt(0);
    return (first + last || fallback).toUpperCase();
  }

  function openComposerFromAnyButton() {
    if (typeof window.focusFeedComposer === 'function') {
      window.focusFeedComposer();
      return;
    }
    const createInput = document.querySelector('.create-input');
    if (createInput) {
      createInput.click();
      createInput.focus();
    }
  }

  async function getFollowingCount(user) {
    try {
      if (!window.SpopeerAPI || !window.SpopeerAPI.getProfileStats) return Number(user.followingCount || user.following || 0);
      const userId = user.id || user.userId;
      if (!userId) return Number(user.followingCount || user.following || 0);
      const stats = await window.SpopeerAPI.getProfileStats(userId);
      const count = Number(stats?.payload?.followingCount ?? stats?.followingCount ?? user.followingCount ?? user.following ?? 0);
      return Number.isFinite(count) ? count : 0;
    } catch (e) {
      return Number(user.followingCount || user.following || 0);
    }
  }

  async function loadSuggestedUsers() {
    const listEl = document.getElementById('whoToFollowList');
    const user = getCurrentUser();
    if (!listEl || !window.SpopeerAPI || typeof window.SpopeerAPI.request !== 'function') return [];

    const sport = (user.primarySport || user.sport || '').trim();
    const role = (user.role || user.userType || '').trim();
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (role) params.set('role', role);
    params.set('limit', '20');

    let users = [];
    try {
      const data = await window.SpopeerAPI.request('/api/users?' + params.toString());
      users = data?.payload || data?.data?.payload || data?.data || [];
      if (!Array.isArray(users)) users = [];
      if (users.length < SUGGESTIONS_TARGET && sport) {
        const fallbackData = await window.SpopeerAPI.request('/api/users?sport=' + encodeURIComponent(sport) + '&limit=20');
        const fallbackUsers = fallbackData?.payload || fallbackData?.data?.payload || fallbackData?.data || [];
        if (Array.isArray(fallbackUsers)) users = users.concat(fallbackUsers);
      }
    } catch (e) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:6px 2px;">Could not load suggestions right now.</div>';
      return [];
    }

    const currentId = String(user.id || user.userId || '');
    const currentEmail = String(user.email || '').toLowerCase();
    const dedup = new Map();
    users.forEach((u) => {
      const key = String(u.id || u.email || Math.random());
      if (!dedup.has(key)) dedup.set(key, u);
    });

    let filtered = Array.from(dedup.values()).filter((u) => {
      const uid = String(u.id || '');
      const uemail = String(u.email || '').toLowerCase();
      return uid !== currentId && (!currentEmail || uemail !== currentEmail);
    });

    try {
      if (window.SpopeerAPI.getFollowing && (user.id || user.userId)) {
        const followingRes = await window.SpopeerAPI.getFollowing(user.id || user.userId);
        const following = followingRes?.payload || followingRes?.data?.payload || followingRes?.data || [];
        if (Array.isArray(following) && following.length) {
          const followedIds = new Set(following.map((f) => String(f.id || f.userId || f.followingId)));
          filtered = filtered.filter((u) => !followedIds.has(String(u.id || u.userId)));
        }
      }
    } catch (e) {
      // Keep suggestions if following lookup fails
    }

    filtered = filtered.slice(0, SUGGESTIONS_TARGET);
    if (!filtered.length) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:6px 2px;">No suggestions yet. Check back soon.</div>';
      return [];
    }

    listEl.innerHTML = filtered.map((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.displayName || 'User';
      const sportText = u.sport || sport || 'General';
      return '<div class="suggest-item" data-user-id="' + String(u.id || '') + '">' +
        '<div class="suggest-av av-blue">' + initialsFor(u) + '</div>' +
        '<div class="suggest-info">' +
        '<div class="suggest-name">' + name + '</div>' +
        '<div class="suggest-role">' + roleLabel(u.role) + ' � ' + sportText + '</div>' +
        '</div>' +
        '<button class="follow-btn" type="button">Follow</button>' +
      '</div>';
    }).join('');

    listEl.querySelectorAll('.follow-btn').forEach((btn) => {
      btn.addEventListener('click', async function () {
        const item = this.closest('.suggest-item');
        const userId = item && item.getAttribute('data-user-id');
        if (!userId || !window.SpopeerAPI || !window.SpopeerAPI.followUser) return;
        this.disabled = true;
        try {
          await window.SpopeerAPI.followUser(userId);
          this.textContent = 'Following';
          this.style.background = 'var(--surface-2)';
          this.style.color = 'var(--muted)';
          this.style.borderColor = 'var(--border)';
          refreshOnboardingCards();
        } catch (e) {
          this.disabled = false;
          this.textContent = 'Follow';
        }
      });
    });

    return filtered;
  }

  async function refreshOnboardingCards() {
    const user = getCurrentUser();
    const firstPostPrompt = document.getElementById('firstPostPrompt');
    const checklistCard = document.getElementById('onboardingChecklistCard');
    const checklist = document.getElementById('onboardingChecklist');
    const fill = document.getElementById('onboardingProgressFill');
    const text = document.getElementById('onboardingProgressText');
    if (firstPostPrompt) firstPostPrompt.style.display = 'none';
    if (checklistCard) checklistCard.style.display = 'none';
    if (!checklistCard || !checklist || !fill || !text) return;

    const userKey = getUserKey(user);
    const dismissKey = 'spopeer_first_post_prompt_dismissed_' + userKey;

    let freshProfile = null;
    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.getCurrentProfile === 'function') {
        const profileRes = await window.SpopeerAPI.getCurrentProfile();
        freshProfile = profileRes?.payload || profileRes?.data?.payload || profileRes?.data || null;
      }
    } catch (e) {
      freshProfile = null;
    }

    const profileForChecks = (freshProfile && typeof freshProfile === 'object') ? freshProfile : user;
    const hasPhoto = !!(profileForChecks.avatarUrl || profileForChecks.avatar);
    const hasBio = !!(profileForChecks.bio && String(profileForChecks.bio).trim().length >= 8);
    const hasPosted = Number(user.postsCount || 0) > 0 || !!document.querySelector('.post-card[data-post-id]');

    const checks = [
      { label: 'Add a profile photo', done: hasPhoto },
      { label: 'Write a short bio', done: hasBio },
      { label: 'Make your first post', done: hasPosted }
    ];

    const doneCount = checks.filter((x) => x.done).length;
    checklist.innerHTML = checks.map((c) => {
      return '<li class="' + (c.done ? 'done' : '') + '">' +
        '<span class="onboarding-check-icon"><i class="fa-solid ' + (c.done ? 'fa-check' : 'fa-circle') + '"></i></span>' +
        '<span>' + c.label + '</span>' +
      '</li>';
    }).join('');

    fill.style.width = String((doneCount / checks.length) * 100) + '%';
    text.textContent = doneCount + '/' + checks.length;
    checklistCard.style.display = doneCount === checks.length ? 'none' : 'block';

    if (firstPostPrompt) {
      const dismissed = localStorage.getItem(dismissKey) === '1';
      firstPostPrompt.style.display = (!hasPosted && !dismissed) ? 'block' : 'none';
    }

    const onboardingFollowCount = document.getElementById('onboardingFollowCount');
    if (onboardingFollowCount) {
      onboardingFollowCount.style.display = 'none';
    }

    return { hasPhoto, hasBio, hasPosted };
  }

  window.refreshFeedOnboarding = refreshOnboardingCards;

  async function initOnboardingFlow() {
    const modal = document.getElementById('onboardingFlowModal');
    const openBtn = document.getElementById('openOnboardingFlowBtn');
    const closeBtn = document.getElementById('closeOnboardingFlow');
    const backdrop = document.getElementById('onboardingBackdrop');
    const nextBtn = document.getElementById('onboardingNextBtn');
    const backBtn = document.getElementById('onboardingBackBtn');
    const stepLabel = document.getElementById('onboardingStepLabel');
    const flowFill = document.getElementById('onboardingFlowProgress');
    const panels = [
      document.getElementById('onboardingStep1'),
      document.getElementById('onboardingStep2'),
      document.getElementById('onboardingStep3')
    ];
    const bioInput = document.getElementById('onboardingBioInput');
    const avatarInput = document.getElementById('onboardingAvatarInput');
    const sportSelect = document.getElementById('onboardingPrimarySport');
    if (modal) {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      modal.style.pointerEvents = 'none';
    }
    if (backdrop) backdrop.style.pointerEvents = 'none';
    if (openBtn) openBtn.style.display = 'none';
    return;

    const user = getCurrentUser();
    if (bioInput) bioInput.value = user.bio || '';

    if (sportSelect) {
      try {
        const text = await fetch('/data/list-of-sports.txt').then((r) => r.text());
        const sports = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 250);
        sportSelect.innerHTML = '<option value="">Select your primary sport</option>' + sports.map((s) => '<option value="' + s + '">' + s + '</option>').join('');
        const currentSport = user.primarySport || user.sport || '';
        if (currentSport) sportSelect.value = currentSport;
      } catch (e) {
        // keep default option
      }
    }

    let step = 1;
    function renderStep() {
      panels.forEach((p, idx) => {
        if (!p) return;
        p.style.display = idx === (step - 1) ? 'block' : 'none';
      });
      stepLabel.textContent = 'Step ' + step + ' of 3';
      flowFill.style.width = String((step / 3) * 100) + '%';
      backBtn.style.display = step > 1 ? '' : 'none';
      nextBtn.textContent = step === 3 ? 'Finish' : 'Save & Continue';
    }

    async function saveStep1() {
      if (!window.SpopeerAPI) return true;
      const payload = {};
      if (bioInput && bioInput.value.trim()) payload.bio = bioInput.value.trim();
      if (Object.keys(payload).length) {
        await window.SpopeerAPI.updateCurrentProfile(payload);
      }
      const file = avatarInput && avatarInput.files && avatarInput.files[0];
      if (file) {
        await window.SpopeerAPI.uploadAvatar(file);
      }
      return true;
    }

    async function saveStep2() {
      if (!window.SpopeerAPI || !sportSelect) return true;
      const sport = sportSelect.value.trim();
      if (!sport) return false;
      await window.SpopeerAPI.updateCurrentProfile({ primarySport: sport, sport: sport });
      return true;
    }

    async function validateStep3() {
      const info = await refreshOnboardingCards();
      return !!(info && info.hasPosted);
    }

    function openModal() {
      modal.classList.add('visible');
      modal.setAttribute('aria-hidden', 'false');
      step = 1;
      renderStep();
    }
    function closeModal() {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop && backdrop.addEventListener('click', closeModal);
    backBtn.addEventListener('click', function () {
      if (step > 1) { step -= 1; renderStep(); }
    });

    nextBtn.addEventListener('click', async function () {
      nextBtn.disabled = true;
      try {
        if (step === 1) {
          await saveStep1();
          step = 2;
          renderStep();
          await refreshOnboardingCards();
        } else if (step === 2) {
          const ok = await saveStep2();
          if (!ok) {
            nextBtn.disabled = false;
            return;
          }
          step = 3;
          renderStep();
          await refreshOnboardingCards();
        } else {
          const done = await validateStep3();
          if (!done) {
            nextBtn.disabled = false;
            return;
          }
          closeModal();
          await refreshOnboardingCards();
        }
      } catch (e) {
        console.error('Onboarding step failed:', e);
      }
      nextBtn.disabled = false;
    });

    const info = await refreshOnboardingCards();
    if (info && (!info.hasPhoto || !info.hasBio || !info.hasFollowed3)) {
      openModal();
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const dismissPromptBtn = document.getElementById('dismissFirstPostPrompt');
    const openComposerBtn = document.getElementById('openComposerFromPrompt');
    const user = getCurrentUser();
    const dismissKey = 'spopeer_first_post_prompt_dismissed_' + getUserKey(user);

    if (dismissPromptBtn) {
      dismissPromptBtn.addEventListener('click', function () {
        localStorage.setItem(dismissKey, '1');
        const card = document.getElementById('firstPostPrompt');
        if (card) card.style.display = 'none';
      });
    }

    if (openComposerBtn) {
      openComposerBtn.addEventListener('click', openComposerFromAnyButton);
    }

    await loadSuggestedUsers();
    await refreshOnboardingCards();
    await initOnboardingFlow();
  });
})();
