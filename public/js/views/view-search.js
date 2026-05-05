(function () {
  'use strict';

  var debounceTimer = null;

  function renderUsers(resultsEl, users) {
    resultsEl.innerHTML = '';
    if (!users.length) {
      resultsEl.innerHTML = '<p style="color:var(--muted);">No matching people found.</p>';
      return;
    }

    users.forEach(function (u) {
      var name = (u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'User');
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'nav-item';
      card.style.width = '100%';
      card.style.textAlign = 'left';
      card.innerHTML = '<i class="fa-solid fa-user"></i> <span class="nav-label">' + name + '</span>';
      card.addEventListener('click', function () {
        if (window.SpaRouter) {
          window.SpaRouter.navigate('public-profile', { userId: String(u.id || u.userId || '') });
        }
      });
      resultsEl.appendChild(card);
    });
  }

  async function runSearch(term, resultsEl) {
    var value = String(term || '').trim();
    if (!value) {
      resultsEl.innerHTML = '';
      return;
    }

    resultsEl.innerHTML = '<p style="color:var(--muted);">Searching...</p>';
    try {
      var result = await window.SpopeerAPI.request('/api/search?term=' + encodeURIComponent(value));
      var users = Array.isArray(result.data && result.data.users) ? result.data.users : (Array.isArray(result.users) ? result.users : []);
      renderUsers(resultsEl, users);
    } catch (_err) {
      resultsEl.innerHTML = '<p style="color:var(--muted);">Search failed.</p>';
    }
  }

  async function mount(outlet, _params, query) {
    outlet.innerHTML = '<div class="post-card"><div class="post-body"><h3 style="margin:0 0 10px;">Search</h3><input id="spaSearchInput" class="composer-textarea" style="min-height:44px;" placeholder="Search athletes, clubs, coaches..."><div id="spaSearchResults" style="margin-top:12px;"></div></div></div>';
    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);

    var input = outlet.querySelector('#spaSearchInput');
    var results = outlet.querySelector('#spaSearchResults');

    if (query && (query.q || query.term)) {
      input.value = query.q || query.term;
      await runSearch(input.value, results);
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var val = input.value.trim();
        if (val) {
          window.history.replaceState(null, '', '#search?q=' + encodeURIComponent(val));
        }
        runSearch(val, results);
      }, 280);
    });
  }

  function unmount() {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (window.SpaRouter) {
    window.SpaRouter.register('search', { mount: mount, unmount: unmount });
  }
})();
