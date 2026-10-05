/* ============================================================
   SPOPEER ADS MANAGER — REAL BACKEND
   Phase 2: persisted campaigns, creative upload and review status.
   ============================================================ */
(function () {
  'use strict';

  var campaigns = [];
  var currentStep = 1;
  var TOTAL_STEPS = 4;
  var creativeFile = null;

  function escStr(v) {
    if (v == null) return '';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  }

  function unwrap(response) {
    if (!response) return null;
    return response.data !== undefined ? response.data : response;
  }

  function money(value) {
    return '€' + Number(value || 0).toFixed(2);
  }

  function formatTag(format) {
    var map = {
      feed: ['', 'Sponsored Post'],
      search: ['search', 'Search Boost'],
      community: ['community', 'Community Pin'],
      sidebar: ['sidebar', 'Sidebar Banner']
    };
    var pair = map[format] || ['', format || 'Sponsored'];
    return '<span class="format-tag ' + pair[0] + '">' + escStr(pair[1]) + '</span>';
  }

  function statusLabel(status) {
    return String(status || '').charAt(0).toUpperCase() + String(status || '').slice(1);
  }

  function renderTable(filter) {
    var tbody = document.getElementById('campTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    var list = campaigns.filter(function (c) {
      return filter === 'all' || c.status === filter;
    });

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--muted);">No campaigns found.</td></tr>';
      return;
    }

    list.forEach(function (c) {
      var budget = Number(c.dailyBudget || 0);
      var spend = Number(c.spend || 0);
      var pct = budget > 0 ? Math.min(100, Math.round((spend / budget) * 100)) : 0;
      var actions = '';

      if (c.status === 'live') {
        actions += '<button class="icon-btn" title="Pause" data-ad-status="' + c.id + '" data-status-value="paused"><i class="fa-solid fa-pause"></i></button>';
      } else if (c.status === 'paused') {
        actions += '<button class="icon-btn" title="Resume review" data-ad-status="' + c.id + '" data-status-value="review"><i class="fa-solid fa-play"></i></button>';
      }

      tbody.innerHTML += '<tr>' +
        '<td><div class="camp-name">' + escStr(c.name) + '</div><div class="camp-type">' + escStr(c.objective) + '</div></td>' +
        '<td><span class="status-badge ' + escStr(c.status) + '">' + escStr(statusLabel(c.status)) + '</span></td>' +
        '<td>' + formatTag(c.format) + '</td>' +
        '<td class="camp-stat-cell"><div class="camp-stat-num">' + Number(c.impressions || 0).toLocaleString() + '</div><div class="camp-progress"><div class="camp-progress-fill" style="width:' + pct + '%"></div></div></td>' +
        '<td class="camp-stat-cell"><div class="camp-stat-num">' + Number(c.clicks || 0).toLocaleString() + '</div><div class="camp-stat-sub">' + (Number(c.impressions || 0) ? ((Number(c.clicks || 0) / Number(c.impressions || 0)) * 100).toFixed(2) : '0.00') + '% CTR</div></td>' +
        '<td class="camp-stat-cell"><div class="camp-stat-num">' + money(spend) + '</div><div class="camp-stat-sub">€' + budget.toFixed(2) + ' / day</div></td>' +
        '<td><div class="camp-actions">' + actions + '</div></td>' +
      '</tr>';
    });
  }

  function updateDashboard() {
    var impressions = campaigns.reduce(function (s,c){ return s + Number(c.impressions || 0); }, 0);
    var clicks = campaigns.reduce(function (s,c){ return s + Number(c.clicks || 0); }, 0);
    var spend = campaigns.reduce(function (s,c){ return s + Number(c.spend || 0); }, 0);
    var ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0.00%';

    var vals = document.querySelectorAll('.stats-strip .stat-val');
    if (vals[0]) vals[0].textContent = impressions.toLocaleString();
    if (vals[1]) vals[1].textContent = clicks.toLocaleString();
    if (vals[2]) vals[2].textContent = ctr;
    if (vals[3]) vals[3].textContent = money(spend);

    var chart = document.getElementById('mainChart');
    var labels = document.getElementById('chartLabels');
    if (chart) {
      chart.innerHTML = '';
      var max = Math.max(impressions, clicks, 1);
      [['Impressions', impressions, 'impressions'], ['Clicks', clicks, 'clicks']].forEach(function(item) {
        var group = document.createElement('div');
        group.className = 'chart-bar-group';
        group.style.alignItems = 'flex-end';
        var bar = document.createElement('div');
        bar.className = 'chart-bar ' + item[2];
        bar.style.height = Math.max(4, (item[1] / max) * 100) + '%';
        bar.title = item[0] + ': ' + item[1].toLocaleString();
        group.appendChild(bar);
        chart.appendChild(group);
      });
    }
    if (labels) labels.innerHTML = '<span>Current</span><span>Campaign totals</span>';
  }

  async function loadCampaigns() {
    try {
      var response = await window.SpopeerAPI.adsList();
      var data = unwrap(response);
      campaigns = Array.isArray(data) ? data : (data && Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch (error) {
      campaigns = [];
      if (window.SpopeerToast) window.SpopeerToast.error('Could not load advertising campaigns.');
    }
    renderTable('all');
    updateDashboard();
  }

  function filterCamps(el, filter) {
    document.querySelectorAll('.section-card .date-pill').forEach(function(p){ p.classList.remove('active'); });
    if (el) el.classList.add('active');
    renderTable(filter);
  }

  function openModal() {
    document.getElementById('createModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    currentStep = 1;
    creativeFile = null;
    renderStep();
    var today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    var end = new Date();
    end.setDate(end.getDate() + 14);
    document.getElementById('endDate').value = end.toISOString().split('T')[0];
  }

  function closeModal() {
    document.getElementById('createModal').classList.remove('open');
    document.body.style.overflow = '';
    currentStep = 1;
    creativeFile = null;
    renderStep();
    document.getElementById('panelSuccess').classList.remove('active');
    document.getElementById('panel1').classList.add('active');
    document.getElementById('modalFooter').style.display = 'flex';
  }

  function renderStep() {
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var panel = document.getElementById('panel' + i);
      if (panel) panel.classList.toggle('active', i === currentStep);
    }
    for (var j = 1; j <= TOTAL_STEPS; j++) {
      var item = document.getElementById('stepItem' + j);
      var num = document.getElementById('stepNum' + j);
      if (!item || !num) continue;
      item.classList.remove('active', 'done');
      if (j < currentStep) { item.classList.add('done'); num.innerHTML = '<i class="fa-solid fa-check" style="font-size:10px"></i>'; }
      else if (j === currentStep) { item.classList.add('active'); num.textContent = j; }
      else num.textContent = j;
    }
    var subtitles = ['', 'Choose your objective', 'Set audience & format', 'Add creative & budget', 'Review & launch'];
    document.getElementById('modalSubtitle').textContent = 'Step ' + currentStep + ' of ' + TOTAL_STEPS + ' — ' + subtitles[currentStep];
    document.getElementById('stepIndicatorText').textContent = 'Step ' + currentStep + ' of ' + TOTAL_STEPS;
    document.getElementById('btnBack').style.display = currentStep > 1 ? 'inline-flex' : 'none';
    document.getElementById('btnNext').style.display = currentStep < TOTAL_STEPS ? 'inline-flex' : 'none';
    document.getElementById('btnLaunch').style.display = currentStep === TOTAL_STEPS ? 'inline-flex' : 'none';
  }

  function normalizeObjective(text) {
    return ({
      'Awareness':'awareness', 'Reach':'reach', 'Event Sign-ups':'event-signups',
      'Profile Visits':'profile-visits', 'Marketplace':'marketplace', 'Sponsorship':'sponsorship'
    })[text] || 'awareness';
  }

  function normalizeFormat(text) {
    return ({
      'Sponsored Feed Post':'feed', 'Sidebar Banner':'sidebar',
      'Community Pin':'community', 'Search Boost':'search'
    })[text] || 'feed';
  }

  function selectedTexts(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector + '.sel')).map(function(el){ return el.textContent.trim(); });
  }

  function buildPayload() {
    var obj = document.querySelector('.obj-card.selected .obj-name');
    var fmt = document.querySelector('.format-card.selected .format-card-name');
    var cta = document.querySelector('.cta-option.selected');
    return {
      name: document.getElementById('campName').value.trim(),
      objective: normalizeObjective(obj ? obj.textContent.trim() : 'Awareness'),
      format: normalizeFormat(fmt ? fmt.textContent.trim() : 'Sponsored Feed Post'),
      targetProfiles: selectedTexts('.tag-cloud:first-of-type .tag-pill'),
      targetSport: document.getElementById('targetSport').value,
      targetLocation: document.getElementById('targetLocation').value.trim(),
      targetAgeRange: document.querySelectorAll('#panel2 .form-select')[1] ? document.querySelectorAll('#panel2 .form-select')[1].value : 'All ages',
      targetSkillLevel: document.querySelectorAll('#panel2 .form-select')[2] ? document.querySelectorAll('#panel2 .form-select')[2].value : 'All levels',
      targetInterests: selectedTexts('#panel2 .tag-cloud')[1] ? selectedTexts('#panel2 .tag-cloud')[1] : [],
      headline: document.getElementById('adHeadline').value.trim(),
      body: document.getElementById('adBody').value.trim(),
      cta: cta ? cta.textContent.trim() : 'Learn More',
      destinationUrl: (document.getElementById('destinationUrl') || {}).value || '',
      dailyBudget: Number(document.getElementById('budgetSlider').value || 25),
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      billingModel: document.getElementById('billingModel').value
    };
  }

  function nextStep() {
    if (currentStep === 3) buildReview();
    if (currentStep < TOTAL_STEPS) { currentStep++; renderStep(); }
  }

  function prevStep() {
    if (currentStep > 1) { currentStep--; renderStep(); }
  }

  function buildReview() {
    var p = buildPayload();
    document.getElementById('rv-name').textContent = p.name || '(no name)';
    document.getElementById('rv-obj').textContent = p.objective;
    document.getElementById('rv-format').textContent = p.format;
    document.getElementById('rv-sport').textContent = p.targetSport || 'All sports';
    document.getElementById('rv-location').textContent = p.targetLocation || 'All locations';
    document.getElementById('rv-cta').textContent = p.cta;
    document.getElementById('rv-budget').textContent = money(p.dailyBudget) + ' / day';
    document.getElementById('rv-start').textContent = p.startDate || '—';
    document.getElementById('rv-end').textContent = p.endDate || '—';
    document.getElementById('rv-billing').textContent = p.billingModel.toUpperCase();
    document.getElementById('rv-est').textContent = 'Delivery begins after review and approval.';
  }

  async function launchCampaign() {
    var payload = buildPayload();
    if (!payload.name || !payload.headline || !payload.startDate || !payload.endDate) {
      alert('Please complete the required campaign fields.');
      return;
    }

    var button = document.getElementById('btnLaunch');
    button.disabled = true;
    button.textContent = 'Submitting…';

    try {
      var response = await window.SpopeerAPI.adsCreate(payload);
      var data = unwrap(response);
      var campaign = data && data.campaign ? data.campaign : data;
      if (!campaign || !campaign.id) throw new Error('Campaign was not created.');

      if (creativeFile) {
        var uploadResponse = await window.SpopeerAPI.adsUploadCreative(campaign.id, creativeFile);
        var uploadData = unwrap(uploadResponse);
        campaign = uploadData && uploadData.campaign ? uploadData.campaign : campaign;
      }

      document.getElementById('modalFooter').style.display = 'none';
      for (var i = 1; i <= TOTAL_STEPS; i++) document.getElementById('panel' + i).classList.remove('active');
      document.getElementById('panelSuccess').classList.add('active');
      document.getElementById('successMsg').textContent =
        '"' + payload.name + '" was submitted for review. It will not appear to users until approved.';
      await loadCampaigns();
    } catch (error) {
      alert(error && error.message ? error.message : 'Could not create campaign.');
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-rocket"></i> Launch Campaign';
    }
  }

  function selectObj(el) {
    document.querySelectorAll('.obj-card').forEach(function(c){ c.classList.remove('selected'); });
    el.classList.add('selected');
  }
  function selectFormat(el) {
    document.querySelectorAll('.format-card').forEach(function(c){ c.classList.remove('selected'); });
    el.classList.add('selected');
  }
  function selectCTA(el) {
    document.querySelectorAll('.cta-option').forEach(function(c){ c.classList.remove('selected'); });
    el.classList.add('selected');
  }

  function updateBudget(val) {
    var v = parseInt(val, 10) || 5;
    document.getElementById('budgetDisplay').textContent = '€' + v + ' / day';
    document.getElementById('budgetEst').textContent = 'Delivery estimate will be calculated after launch.';
  }

  function handleCreativeUpload(input) {
    if (input.files && input.files[0]) {
      creativeFile = input.files[0];
      document.getElementById('creativeDrop').style.display = 'none';
      document.getElementById('creativePreview').classList.add('show');
      document.getElementById('creativeName').textContent = creativeFile.name;
      document.getElementById('creativeSize').textContent = (creativeFile.size / 1024).toFixed(0) + ' KB';
    }
  }

  function removeCreative() {
    creativeFile = null;
    document.getElementById('creativePreview').classList.remove('show');
    document.getElementById('creativeDrop').style.display = 'block';
    document.getElementById('creativeInput').value = '';
  }

  function setDatePill(el) {
    document.querySelectorAll('.date-range-row .date-pill').forEach(function(p){ p.classList.remove('active'); });
    el.classList.add('active');
  }

  async function changeCampaignStatus(id, status) {
    try {
      await window.SpopeerAPI.adsStatus(id, status);
      await loadCampaigns();
    } catch (error) {
      alert(error && error.message ? error.message : 'Could not update campaign.');
    }
  }

  function togglePlacement(_input) {
    // Placement controls are intentionally visual until per-placement inventory is backend-configured.
  }

  document.addEventListener('DOMContentLoaded', async function() {
    if (window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
    if (window.UserUI) window.UserUI.bindAllChips();
    await loadCampaigns();
    updateBudget(document.getElementById('budgetSlider').value);
  });

  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

  document.addEventListener('click', function(e) {
    var t = e.target;
    var navBtn = t.closest('[data-nav-href]');
    if (navBtn) { window.location.href = navBtn.dataset.navHref; return; }

    if (t.closest('[data-action="toggle-profile-menu"]')) {
      if (window.toggleProfileMenuGlobal) window.toggleProfileMenuGlobal();
      return;
    }

    var tabLink = t.closest('[data-tab]');
    if (tabLink) { e.preventDefault(); document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); }); tabLink.classList.add('active'); return; }

    var rangePill = t.closest('[data-date-range-pill]');
    if (rangePill) { setDatePill(rangePill); return; }

    var filterPill = t.closest('[data-filter]');
    if (filterPill) { filterCamps(filterPill, filterPill.dataset.filter); return; }

    if (t.closest('[data-action="open-modal"]')) { openModal(); return; }
    if (t.closest('[data-action="close-modal"]')) { closeModal(); return; }
    if (t.dataset.action === 'modal-overlay-click' && t === e.target) { closeModal(); return; }
    if (t.closest('[data-action="next-step"]')) { nextStep(); return; }
    if (t.closest('[data-action="prev-step"]')) { prevStep(); return; }
    if (t.closest('[data-action="launch-campaign"]')) { launchCampaign(); return; }

    var obj = t.closest('[data-action="select-obj"]'); if (obj) { selectObj(obj); return; }
    var fmt = t.closest('[data-action="select-format"]'); if (fmt) { selectFormat(fmt); return; }
    var pill = t.closest('[data-action="toggle-pill"]'); if (pill) { pill.classList.toggle('sel'); return; }
    var cta = t.closest('[data-action="select-cta"]'); if (cta) { selectCTA(cta); return; }

    if (t.closest('[data-action="trigger-creative-upload"]')) {
      document.getElementById('creativeInput').click(); return;
    }
    if (t.closest('[data-action="remove-creative"]')) { removeCreative(); return; }

    var statusButton = t.closest('[data-ad-status]');
    if (statusButton) {
      changeCampaignStatus(statusButton.getAttribute('data-ad-status'), statusButton.getAttribute('data-status-value'));
      return;
    }
  });

  document.addEventListener('change', function(e) {
    if (e.target.hasAttribute('data-placement-toggle')) togglePlacement(e.target);
    if (e.target.hasAttribute('data-creative-input')) handleCreativeUpload(e.target);
  });

  document.addEventListener('input', function(e) {
    if (e.target.id === 'budgetSlider' || e.target.hasAttribute('data-budget-slider')) updateBudget(e.target.value);
  });

  window.openModal = openModal;
  window.closeModal = closeModal;
  window.filterCamps = filterCamps;
  window.togglePlacement = togglePlacement;
})();
