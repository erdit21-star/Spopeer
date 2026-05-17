/* -- CHART -- */
(function() {
  var impData = [28,32,29,35,42,38,44,50,46,52,48,55,60,58,62,65,70,68,72,75,80,82,85];
  var clkData = [8,10,9,11,13,12,14,16,15,17,15,18,19,18,20,21,22,21,23,24,25,26,27];
  var chart = document.getElementById('mainChart');
  var labelsEl = document.getElementById('chartLabels');
  var max = Math.max.apply(null, impData);
  impData.forEach(function(imp, i) {
    var grp = document.createElement('div');
    grp.className = 'chart-bar-group';
    var bImp = document.createElement('div');
    bImp.className = 'chart-bar impressions';
    bImp.style.height = (imp / max * 100) + '%';
    bImp.title = 'Impressions: ' + (imp * 580).toLocaleString();
    var bClk = document.createElement('div');
    bClk.className = 'chart-bar clicks';
    bClk.style.height = (clkData[i] / max * 100) + '%';
    bClk.title = 'Clicks: ' + (clkData[i] * 22).toLocaleString();
    grp.appendChild(bImp);
    grp.appendChild(bClk);
    chart.appendChild(grp);
  });
  labelsEl.innerHTML = '<span>Apr 1</span><span>Apr 8</span><span>Apr 15</span><span>Apr 22</span><span>Apr 27</span>';
})();

/* -- CAMPAIGN TABLE -- */
var campaigns = [
  { name: 'Tryouts 2025 � Athens',    type: 'Sport Club � Event Sign-ups', status: 'live',   format: 'feed',      impressions: 14200, clicks: 682, ctr: 4.8,  spend: 120, budget: 200 },
  { name: 'Coaching Clinic � June',   type: 'Coach Promo � Profile Visits', status: 'live',   format: 'search',    impressions: 9800,  clicks: 391, ctr: 3.99, spend: 88,  budget: 150 },
  { name: 'Kit Sponsor Outreach',     type: 'Sponsor � Awareness',          status: 'paused', format: 'community', impressions: 6100,  clicks: 198, ctr: 3.25, spend: 54,  budget: 100 },
  { name: 'Spring Membership Drive',  type: 'Sport Club � Reach',           status: 'ended',  format: 'feed',      impressions: 18100, clicks: 569, ctr: 3.14, spend: 80,  budget: 80  },
  { name: 'Youth Rugby Academy',      type: 'Club � Youth Dev',             status: 'review', format: 'sidebar',   impressions: 0,     clicks: 0,   ctr: 0,    spend: 0,   budget: 60  }
];

function escStr(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

function formatTag(f) {
  var map = { feed: ['','Sponsored Post'], search: ['search','Search Boost'], community: ['community','Community Pin'], sidebar: ['sidebar','Sidebar Banner'] };
  var pair = map[f] || ['','�'];
  return '<span class="format-tag ' + pair[0] + '">' + pair[1] + '</span>';
}

function renderTable(filter) {
  filter = filter || 'all';
  var tbody = document.getElementById('campTableBody');
  tbody.innerHTML = '';
  campaigns.filter(function(c){ return filter === 'all' || c.status === filter; }).forEach(function(c) {
    var pct = Math.round((c.spend / c.budget) * 100);
    tbody.innerHTML += '<tr>' +
      '<td><div class="camp-name">' + escStr(c.name) + '</div><div class="camp-type">' + escStr(c.type) + '</div></td>' +
      '<td><span class="status-badge ' + c.status + '">' + c.status.charAt(0).toUpperCase() + c.status.slice(1) + '</span></td>' +
      '<td>' + formatTag(c.format) + '</td>' +
      '<td class="camp-stat-cell"><div class="camp-stat-num">' + c.impressions.toLocaleString() + '</div><div class="camp-progress"><div class="camp-progress-fill" style="width:' + Math.min(pct,100) + '%"></div></div></td>' +
      '<td class="camp-stat-cell"><div class="camp-stat-num">' + c.clicks.toLocaleString() + '</div><div class="camp-stat-sub">' + c.ctr.toFixed(2) + '% CTR</div></td>' +
      '<td class="camp-stat-cell"><div class="camp-stat-num">�' + c.spend + '</div><div class="camp-stat-sub">of �' + c.budget + '</div></td>' +
      '<td><div class="camp-actions">' +
        '<button class="icon-btn" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>' +
        '<button class="icon-btn" title="' + (c.status === 'live' ? 'Pause' : 'Resume') + '"><i class="fa-solid fa-' + (c.status === 'live' ? 'pause' : 'play') + '"></i></button>' +
        '<button class="icon-btn danger" title="Delete"><i class="fa-regular fa-trash-can"></i></button>' +
      '</div></td>' +
    '</tr>';
  });
}
renderTable('all');

function filterCamps(el, filter) {
  document.querySelectorAll('.section-card .date-pill').forEach(function(p){ p.classList.remove('active'); });
  el.classList.add('active');
  renderTable(filter);
}

/* -- MODAL -- */
var currentStep = 1;
var TOTAL_STEPS = 4;

function openModal() {
  document.getElementById('createModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  currentStep = 1;
  renderStep();
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').value = today;
  var end = new Date(); end.setDate(end.getDate() + 14);
  document.getElementById('endDate').value = end.toISOString().split('T')[0];
}

function closeModal() {
  document.getElementById('createModal').classList.remove('open');
  document.body.style.overflow = '';
  currentStep = 1;
  renderStep();
  document.getElementById('panelSuccess').classList.remove('active');
  document.getElementById('panel1').classList.add('active');
  document.getElementById('modalFooter').style.display = 'flex';
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('createModal')) closeModal();
}

function renderStep() {
  for (var i = 1; i <= TOTAL_STEPS; i++) {
    var panel = document.getElementById('panel' + i);
    panel.classList.toggle('active', i === currentStep);
  }
  for (var j = 1; j <= TOTAL_STEPS; j++) {
    var item = document.getElementById('stepItem' + j);
    var num = document.getElementById('stepNum' + j);
    item.classList.remove('active', 'done');
    if (j < currentStep) {
      item.classList.add('done');
      num.innerHTML = '<i class="fa-solid fa-check" style="font-size:10px"></i>';
    } else if (j === currentStep) {
      item.classList.add('active');
      num.textContent = j;
    } else {
      num.textContent = j;
    }
  }
  var subtitles = ['', 'Choose your objective', 'Set audience &amp; format', 'Add creative &amp; budget', 'Review &amp; launch'];
  document.getElementById('modalSubtitle').innerHTML = 'Step ' + currentStep + ' of ' + TOTAL_STEPS + ' � ' + subtitles[currentStep];
  document.getElementById('stepIndicatorText').textContent = 'Step ' + currentStep + ' of ' + TOTAL_STEPS;
  document.getElementById('btnBack').style.display = currentStep > 1 ? 'inline-flex' : 'none';
  document.getElementById('btnNext').style.display = currentStep < TOTAL_STEPS ? 'inline-flex' : 'none';
  document.getElementById('btnLaunch').style.display = currentStep === TOTAL_STEPS ? 'inline-flex' : 'none';
}

function nextStep() {
  if (currentStep < TOTAL_STEPS) {
    if (currentStep === TOTAL_STEPS - 1) buildReview();
    currentStep++;
    renderStep();
  }
}

function prevStep() {
  if (currentStep > 1) { currentStep--; renderStep(); }
}

function buildReview() {
  document.getElementById('rv-name').textContent = document.getElementById('campName').value || '(no name)';
  var selObj = document.querySelector('.obj-card.selected .obj-name');
  document.getElementById('rv-obj').textContent = selObj ? selObj.textContent : '�';
  var selFmt = document.querySelector('.format-card.selected .format-card-name');
  document.getElementById('rv-format').textContent = selFmt ? selFmt.textContent : '�';
  document.getElementById('rv-sport').textContent = document.getElementById('targetSport').value || 'All sports';
  document.getElementById('rv-location').textContent = document.getElementById('targetLocation').value || 'All locations';
  var selCta = document.querySelector('.cta-option.selected');
  document.getElementById('rv-cta').textContent = selCta ? selCta.textContent : '�';
  document.getElementById('rv-budget').textContent = document.getElementById('budgetDisplay').textContent;
  document.getElementById('rv-start').textContent = document.getElementById('startDate').value || '�';
  document.getElementById('rv-end').textContent = document.getElementById('endDate').value || '�';
  var billingMap = { cpm: 'CPM (per 1,000 impressions)', cpc: 'CPC (per click)', flat: 'Flat daily rate' };
  document.getElementById('rv-billing').textContent = billingMap[document.getElementById('billingModel').value] || '�';
  document.getElementById('rv-est').textContent = document.getElementById('budgetEst').textContent;
}

function launchCampaign() {
  for (var i = 1; i <= TOTAL_STEPS; i++) document.getElementById('panel' + i).classList.remove('active');
  document.getElementById('panelSuccess').classList.add('active');
  document.getElementById('modalFooter').style.display = 'none';
  var name = document.getElementById('campName').value || 'your campaign';
  document.getElementById('successMsg').textContent = '"' + name + '" is now under review. You will get a notification once it goes live � usually within 24 hours.';
  for (var j = 1; j <= TOTAL_STEPS; j++) {
    document.getElementById('stepItem' + j).classList.add('done');
    document.getElementById('stepNum' + j).innerHTML = '<i class="fa-solid fa-check" style="font-size:10px"></i>';
  }
}

/* -- FORM INTERACTIONS -- */
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
  var v = parseInt(val);
  document.getElementById('budgetDisplay').textContent = '�' + v + ' / day';
  var low = Math.round(v * 32), high = Math.round(v * 56);
  document.getElementById('budgetEst').textContent = 'Estimated ' + low.toLocaleString() + '�' + high.toLocaleString() + ' impressions per day';
  var slider = document.getElementById('budgetSlider');
  var pct = ((v - 5) / (200 - 5)) * 100;
  slider.style.setProperty('--pct', pct + '%');
}
updateBudget(25);

function handleCreativeUpload(input) {
  if (input.files && input.files[0]) {
    var file = input.files[0];
    document.getElementById('creativeDrop').style.display = 'none';
    var preview = document.getElementById('creativePreview');
    preview.classList.add('show');
    document.getElementById('creativeName').textContent = file.name;
    document.getElementById('creativeSize').textContent = (file.size / 1024).toFixed(0) + ' KB';
  }
}
function removeCreative() {
  document.getElementById('creativePreview').classList.remove('show');
  document.getElementById('creativeDrop').style.display = 'block';
  document.getElementById('creativeInput').value = '';
}

/* -- UI HELPERS -- */
function setDatePill(el) {
  document.querySelectorAll('.date-range-row .date-pill').forEach(function(p){ p.classList.remove('active'); });
  el.classList.add('active');
}
function switchTab(tab, el) {
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  el.classList.add('active');
}
function togglePlacement(input) {
  // visual feedback � production would call API
}

/* -- USER DATA -- */
document.addEventListener('DOMContentLoaded', async function() {
  if (window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
  if (window.UserUI) window.UserUI.bindAllChips();
});

/* -- KEYBOARD -- */
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
document.addEventListener('click', function(e) {
  var menu = document.getElementById('profileMenu');
  var chip = document.getElementById('userChip');
  if (menu && chip && !chip.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('visible');
  }
});
