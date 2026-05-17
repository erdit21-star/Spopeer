(function () {
      var user;
      if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
        user = window.CurrentUserStore.getCurrentUser() || {};
      } else {
        try { user = JSON.parse(localStorage.getItem('spopeer_user') || '{}'); } catch(e) { user = {}; }
      }
      var sports = [user.primarySport].concat(Array.isArray(user.secondarySports) ? user.secondarySports : []).filter(Boolean);
      var sel = document.getElementById('filterSport');
      if (sel && sports.length) {
        sports.forEach(function (s) {
          var o = document.createElement('option');
          o.value = s;
          o.textContent = s;
          sel.appendChild(o);
        });
      }

      /* Category chip activation */
      document.querySelectorAll('.cat-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          document.querySelectorAll('.cat-chip').forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
        });
      });

      /* Reset filters */
      var resetBtn = document.getElementById('resetFilters');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          document.getElementById('filterSport').value = '';
          document.getElementById('filterType').value = '';
          document.getElementById('filterDate').value = '';
          document.getElementById('filterQuery').value = '';
          document.querySelectorAll('.cat-chip').forEach(function (c) { c.classList.remove('active'); });
          var allChip = document.querySelector('.cat-chip[data-cat="all"]');
          if (allChip) allChip.classList.add('active');
        });
      }
    })();
