function filterChip(el) {
    document.querySelectorAll('.filter-chips .chip').forEach(function(c) { c.classList.remove('active'); });
    el.classList.add('active');
  }

  function filterType(el) {
    document.querySelectorAll('.type-tab').forEach(function(t) { t.classList.remove('active'); });
    el.classList.add('active');
  }

  function toggleJoin(btn) {
    if (btn.classList.contains('joined')) {
      btn.classList.remove('joined');
      btn.textContent = 'Join';
    } else {
      btn.classList.add('joined');
      btn.textContent = 'Joined';
    }
  }

  var currentStep = 1;
  var totalSteps = 3;

  function openCreateModal() {
    document.getElementById('createModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    currentStep = 1;
    renderStep();
  }

  function closeCreateModal() {
    document.getElementById('createModal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function handleOverlayClick(e) {
    if (e.target === document.getElementById('createModal')) closeCreateModal();
  }

  function renderStep() {
    for (var i = 1; i <= 3; i++) {
      document.getElementById('step' + i).style.display = i === currentStep ? 'block' : 'none';
      document.getElementById('stepBar' + i).style.background = i <= currentStep ? 'var(--blue)' : 'var(--border)';
    }

    document.getElementById('modalBackBtn').style.display = currentStep > 1 ? 'inline-block' : 'none';
    document.getElementById('modalNextBtn').textContent = currentStep === totalSteps ? 'Create Community' : 'Next';

    if (currentStep === 3) buildReview();
  }

  function modalNext() {
    if (currentStep === totalSteps) {
      submitCommunity();
      return;
    }

    currentStep += 1;
    renderStep();
  }

  function modalBack() {
    if (currentStep > 1) {
      currentStep -= 1;
      renderStep();
    }
  }

  function selectType(el) {
    document.querySelectorAll('.type-option').forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
  }

  function buildReview() {
    var name = document.getElementById('commName').value || '(unnamed)';
    var desc = document.getElementById('commDesc').value || '-';
    var sport = document.getElementById('commSport').value || '-';
    var country = document.getElementById('commCountry').value || '-';
    var city = document.getElementById('commCity').value || '-';
    var vis = document.getElementById('commVisibility').value || 'open';
    var type = (document.querySelector('.type-option.selected') || {}).dataset ? document.querySelector('.type-option.selected').dataset.type : '-';

    document.getElementById('reviewSummary').innerHTML =
      '<b>Name:</b> ' + escHtml(name) + '<br>' +
      '<b>Type:</b> ' + escHtml(type) + '<br>' +
      '<b>Sport:</b> ' + escHtml(sport) + '<br>' +
      '<b>Location:</b> ' + escHtml(city) + ', ' + escHtml(country) + '<br>' +
      '<b>Visibility:</b> ' + escHtml(vis) + '<br>' +
      '<b>About:</b> ' + escHtml(desc.slice(0, 120)) + (desc.length > 120 ? '...' : '');
  }

  function submitCommunity() {
    closeCreateModal();
    alert('Community created! It will appear in the feed once reviewed.');
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeCreateModal();
  });

  document.addEventListener('DOMContentLoaded', async function() {
    if (window.CurrentUserStore && window.CurrentUserStore.refreshCurrentUser) {
      await window.CurrentUserStore.refreshCurrentUser();
    }

    if (window.UserUI && window.UserUI.bindAllChips) {
      window.UserUI.bindAllChips();
    }

    if (window.sharedUi && typeof window.sharedUi.setupSocialFeedRuntime === 'function') {
      window.sharedUi.setupSocialFeedRuntime({ basePath: '../../' });
    }
  });
