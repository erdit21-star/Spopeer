function filterChip(el) {
    document.querySelectorAll('.filter-chips .chip').forEach(function(c) { c.classList.remove('active'); });
    el.classList.add('active');
  }

  function filterType(el) {
    document.querySelectorAll('.type-tab').forEach(function(t) { t.classList.remove('active'); });
    el.classList.add('active');
  }

    async function toggleJoin(btn) {
      var groupId = btn && btn.dataset ? btn.dataset.groupId : '';
      var isJoined = btn.classList.contains('joined');

      if (!groupId) {
        if (isJoined) {
          btn.classList.remove('joined');
          btn.textContent = 'Join';
        } else {
          btn.classList.add('joined');
          btn.textContent = 'Joined';
        }
        return;
      }

      btn.disabled = true;
      try {
        if (window.Spopeer && window.Spopeer.api) {
          if (isJoined) {
            await window.Spopeer.api.delete('/api/groups/' + encodeURIComponent(groupId) + '/leave');
            btn.classList.remove('joined');
            btn.textContent = 'Join';
          } else {
            await window.Spopeer.api.post('/api/groups/' + encodeURIComponent(groupId) + '/join');
            btn.classList.add('joined');
            btn.textContent = 'Joined';
          }
        } else {
          throw new Error('API layer unavailable');
        }
      } catch (err) {
        if (window.SpopeerToast && window.SpopeerToast.error) {
          window.SpopeerToast.error((err && err.message) || 'Community action failed.');
        }
      } finally {
        btn.disabled = false;
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

  async function submitCommunity() {
    var name = (document.getElementById('commName').value || '').trim();
    var description = (document.getElementById('commDesc').value || '').trim();
    var sport = (document.getElementById('commSport').value || '').trim();
    var visibility = (document.getElementById('commVisibility').value || 'open').trim();

    if (!name) {
      if (window.SpopeerToast && window.SpopeerToast.warning) {
        window.SpopeerToast.warning('Community name is required.');
      }
      return;
    }

    var payload = {
      name: name,
      description: description,
      sport: sport,
      isPrivate: visibility === 'private'
    };

    var nextBtn = document.getElementById('modalNextBtn');
    if (nextBtn) nextBtn.disabled = true;
    try {
      if (window.Spopeer && window.Spopeer.api && typeof window.Spopeer.api.post === 'function') {
        await window.Spopeer.api.post('/api/groups', payload);
      } else if (window.SpopeerAPI && typeof window.SpopeerAPI.request === 'function') {
        await window.SpopeerAPI.request('/api/groups', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        throw new Error('API client unavailable.');
      }

      closeCreateModal();
      if (window.SpopeerToast && window.SpopeerToast.success) {
        window.SpopeerToast.success('Community created successfully.');
      }
    } catch (err) {
      if (window.SpopeerToast && window.SpopeerToast.error) {
        window.SpopeerToast.error((err && err.message) || 'Failed to create community.');
      }
    } finally {
      if (nextBtn) nextBtn.disabled = false;
    }
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

    document.querySelectorAll('.trend-join, .comm-join-btn').forEach(function(btn) {
      if (btn.dataset.boundJoin === '1') return;
      btn.dataset.boundJoin = '1';
      if (btn.hasAttribute('onclick')) return;
      btn.addEventListener('click', function() {
        toggleJoin(btn);
      });
    });
  });
