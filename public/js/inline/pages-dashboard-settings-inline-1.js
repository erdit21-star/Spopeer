(function() {
  const ud = JSON.parse(localStorage.getItem('spopeer_user') || '{}');

  function roleLabel(role) {
    return {
      athlete: 'Athlete',
      coach: 'Coach',
      club: 'Club',
      supportive_professional: 'Supportive Professional',
      admin: 'Admin'
    }[role] || 'User';
  }

  function injectSubscriptionSection() {
    var sidebar = document.querySelector('.settings-sidebar');
    var main = document.querySelector('.settings-main');
    if (!sidebar || !main) return;

    if (!document.querySelector('.sidebar-nav-item[data-section="subscription"]')) {
      var anchor = document.querySelector('.sidebar-nav-item[data-section="account"]');
      var subLink = document.createElement('a');
      subLink.href = '#section-subscription';
      subLink.className = 'sidebar-nav-item';
      subLink.setAttribute('data-section', 'subscription');
      subLink.innerHTML = '<i class="fa-solid fa-layer-group"></i> Subscription';
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(subLink, anchor);
      }
    }

    if (document.getElementById('section-subscription')) return;

    var section = document.createElement('div');
    section.className = 'settings-card';
    section.id = 'section-subscription';
    section.innerHTML = '' +
      '<div class="card-header">' +
        '<div class="card-icon blue"><i class="fa-solid fa-layer-group"></i></div>' +
        '<div class="card-header-text">' +
          '<div class="card-title">Subscription Plan</div>' +
          '<div class="card-desc">Choose your plan to unlock role-based and cross-network features.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="form-group">' +
          '<label class="form-label" for="accountSubscriptionPlan">Current Plan</label>' +
          '<select id="accountSubscriptionPlan" class="form-input"></select>' +
        '</div>' +
        '<div class="setting-row" style="align-items:flex-start">' +
          '<div class="setting-info" style="width:100%">' +
            '<div class="setting-label">Included Features</div>' +
            '<div class="setting-desc" id="subscriptionSignal" style="margin-bottom:8px"></div>' +
            '<ul id="subscriptionFeatureList" style="margin:0;padding-left:18px;display:grid;gap:6px"></ul>' +
          '</div>' +
        '</div>' +
        '<div class="btn-row">' +
          '<button class="btn-primary" id="saveSubscription"><i class="fa-solid fa-check" style="font-size:11px"></i> Update Subscription</button>' +
        '</div>' +
      '</div>';

    var accountSection = document.getElementById('section-account');
    if (accountSection && accountSection.parentNode === main) {
      main.insertBefore(section, accountSection);
    } else {
      main.appendChild(section);
    }
  }

  function refreshSubscriptionPreview(user, selectedCodeOverride) {
    if (!window.SubscriptionFeatures) return;
    var planSelect = document.getElementById('accountSubscriptionPlan');
    var list = document.getElementById('subscriptionFeatureList');
    var signal = document.getElementById('subscriptionSignal');
    if (!planSelect || !list || !signal) return;

    var resolved = window.SubscriptionFeatures.resolveCurrentPlan(user || {});
    var plans = resolved.plans || [];
    var selectedCode = String(selectedCodeOverride || resolved.code || '').trim().toUpperCase();
    var selectedPlan = plans.find(function (plan) { return plan.code === selectedCode; }) || resolved.plan;

    if (!planSelect.dataset.bound) {
      planSelect.innerHTML = plans.map(function (plan) {
        return '<option value="' + plan.code + '">' + plan.code + ' — ' + plan.label + '</option>';
      }).join('');
      planSelect.dataset.bound = '1';
      planSelect.addEventListener('change', function () {
        refreshSubscriptionPreview(user || {}, planSelect.value);
      });
    }

    planSelect.value = selectedPlan.code;
    signal.textContent = window.SubscriptionFeatures.getCrossTypeSignals({
      code: selectedPlan.code,
      tier: selectedPlan.tier
    }).join(' ');

    list.innerHTML = (selectedPlan.features || []).map(function (feature) {
      return '<li>' + (feature.text || '') + '</li>';
    }).join('');
  }

  async function persistProfile(payload, sourceLabel) {
    const result = await window.SpopeerAPI.updateProfile(payload);
    const savedUser = result.user || payload;
    localStorage.setItem('spopeer_user', JSON.stringify(savedUser));
    localStorage.setItem('user', JSON.stringify(savedUser));
    localStorage.setItem('spopeer_loggedIn', 'true');
    localStorage.setItem('_profileLastUpdated_', Date.now().toString());
    window.dispatchEvent(new CustomEvent('profileUpdated', {
      detail: {
        profile: savedUser,
        timestamp: Date.now(),
        source: sourceLabel
      }
    }));
    if (window.CurrentUserStore) {
      try { window.CurrentUserStore.setCurrentUser(savedUser); } catch(e) { /* ignore store sync errors */ }
    }
    return savedUser;
  }

  /* ── Hydrate account info ── */
  const fullName = ud.displayName || [ud.firstName, ud.lastName].filter(Boolean).join(' ') || ud.fullName || ud.name || 'User';
  const nameInput = document.getElementById('accountName');
  const emailInput = document.getElementById('accountEmail');
  const usernameInput = document.getElementById('accountUsername');
  const typeInput = document.getElementById('accountType');
  if (nameInput) nameInput.value = fullName;
  if (emailInput) emailInput.value = ud.email || ud.userEmail || '';
  if (usernameInput) usernameInput.value = '@' + (ud.email ? ud.email.split('@')[0] : ud.username || 'user');
  if (typeInput) typeInput.value = roleLabel(ud.role || ud.userType);
  injectSubscriptionSection();
  refreshSubscriptionPreview(ud);

  /* ── Profile menu: handled by shared-ui.js setupSocialFeedRuntime ── */

  /* ── Sidebar nav highlighting ── */
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    });
  });

  /* ── Search bar ── */
  document.getElementById('navSearchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = '../../pages/search/search.html?term=' + encodeURIComponent(e.target.value.trim());
    }
  });

  /* ── Toast ── */
  function showToast(msg, icon) {
    const toast = document.getElementById('toast');
    toast.innerHTML = '<i class="fa-solid ' + (icon || 'fa-circle-check') + '"></i> ' + msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }

  /* ── Save account info ── */
  document.getElementById('saveAccount')?.addEventListener('click', async () => {
    const name = document.getElementById('accountName').value.trim();
    if (!name) {
      showToast('Name cannot be empty', 'fa-triangle-exclamation');
      return;
    }

    try {
      const parts = name.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || name;
      const lastName = parts.slice(1).join(' ') || '';
      const savedUser = await persistProfile({ firstName, lastName, displayName: name }, 'settings-save');
      showToast('Account info saved!');
      if (chipNm) chipNm.textContent = (savedUser.displayName || savedUser.firstName || 'User');
      if (chipAv) {
        const initialsValue = (savedUser.displayName || name)
          .split(/\s+/)
          .filter(Boolean)
          .map(part => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'U';
        chipAv.textContent = initialsValue;
      }
    } catch (err) {
      showToast(err.message || 'Failed to save account info', 'fa-triangle-exclamation');
    }
  });

  document.getElementById('cancelAccount')?.addEventListener('click', () => {
    if (nameInput) nameInput.value = fullName;
  });

  /* ── Privacy & notification toggle persistence ── */
  const SETTINGS_KEY = 'spopeer_settings';
  const toggleIds = ['emailNotif','pushNotif','trainingNotif','followerNotif','digestNotif','profileVisibility','onlineStatus','dataSharing','allowDMs'];

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  // Hydrate toggles from saved state on load
  const saved = loadSettings();
  toggleIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id in saved) el.checked = !!saved[id];
    el.addEventListener('change', () => {
      const s = loadSettings();
      s[id] = el.checked;
      saveSettings(s);
      showToast('Setting updated');
    });
  });

  // Hydrate selects
  ['language','feedDefault','avatarStyle','avatarColor','avatarAccent'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (saved[id]) el.value = saved[id];
    el.addEventListener('change', () => {
      const s = loadSettings();
      s[id] = el.value;
      saveSettings(s);
    });
  });

  /* ── Save appearance ── */
  document.getElementById('saveAppearance')?.addEventListener('click', async () => {
    const s = loadSettings();
    s.language = document.getElementById('language')?.value || 'en';
    s.feedDefault = document.getElementById('feedDefault')?.value || 'all';
    s.avatarStyle = document.getElementById('avatarStyle')?.value || 'gradient';
    s.avatarColor = document.getElementById('avatarColor')?.value || '#001f3f';
    s.avatarAccent = document.getElementById('avatarAccent')?.value || '#1a6bff';
    saveSettings(s);

    try {
      await persistProfile({
        avatarStyle: s.avatarStyle,
        avatarColor: s.avatarColor,
        avatarAccent: s.avatarAccent
      }, 'settings-appearance');
      showToast('Preferences saved!');
    } catch (err) {
      showToast(err.message || 'Failed to save preferences', 'fa-triangle-exclamation');
    }
  });

  document.getElementById('saveSubscription')?.addEventListener('click', async () => {
    var select = document.getElementById('accountSubscriptionPlan');
    if (!select || !select.value) {
      showToast('Choose a subscription plan first', 'fa-triangle-exclamation');
      return;
    }

    try {
      var result = await window.SpopeerAPI.updateSubscriptionPlan(select.value);
      var savedUser = (result && result.data && result.data.user) || result.user || ud;
      localStorage.setItem('spopeer_user', JSON.stringify(savedUser));
      localStorage.setItem('user', JSON.stringify(savedUser));
      localStorage.setItem('spopeer_loggedIn', 'true');
      if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
        window.CurrentUserStore.setCurrentUser(savedUser);
      }
      refreshSubscriptionPreview(savedUser, select.value);
      if (window.sharedUi && window.sharedUi.ensureDesktopSubscriptionPanel) {
        window.sharedUi.ensureDesktopSubscriptionPanel();
      }
      if (window.sharedUi && window.sharedUi.ensureMobileDrawerPlanBlock) {
        window.sharedUi.ensureMobileDrawerPlanBlock();
      }
      showToast('Subscription updated!');
    } catch (err) {
      showToast(err.message || 'Failed to update subscription', 'fa-triangle-exclamation');
    }
  });

  /* ── Update password (calls real API) ── */
  document.getElementById('updatePassword')?.addEventListener('click', async () => {
    const curP = document.getElementById('currentPass').value;
    const newP = document.getElementById('newPass').value;
    const confP = document.getElementById('confirmPass').value;
    if (!curP || !newP || !confP) { showToast('Please fill all password fields', 'fa-triangle-exclamation'); return; }
    if (newP !== confP) { showToast('Passwords do not match', 'fa-triangle-exclamation'); return; }
    if (newP.length < 8) { showToast('Password must be at least 8 characters', 'fa-triangle-exclamation'); return; }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: curP, newPassword: newP })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to update password', 'fa-triangle-exclamation'); return; }
      document.getElementById('currentPass').value = '';
      document.getElementById('newPass').value = '';
      document.getElementById('confirmPass').value = '';
      showToast('Password updated!');
    } catch (err) {
      showToast('Network error — please try again', 'fa-triangle-exclamation');
    }
  });

  /* ── Download data ── */
  document.getElementById('downloadData')?.addEventListener('click', () => {
    const exportData = {
      profile: ud,
      posts: JSON.parse(localStorage.getItem('spopeer_user_posts') || '[]'),
      connections: JSON.parse(localStorage.getItem('spopeer_followed_users') || '[]'),
      exportDate: new Date().toISOString(),
      platform: 'Spopeer'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spopeer-data-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data downloaded!');
  });

  /* ── Delete account ── */
  document.getElementById('deleteAccount')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
      ['spopeer_token','spopeer_user','spopeer_loggedIn','authToken','token','user','userToken','userData'].forEach(k => localStorage.removeItem(k));
      window.location.href = '/feed.html';
    }
  });
})();
