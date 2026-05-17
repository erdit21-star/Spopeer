(function () {
  async function initEditProfilePage() {
    // 1. Auth check using backend session
    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
        await window.SpopeerAPI.me();
      }
    } catch (err) {
      var hasLocalSessionSignal = !!(
        localStorage.getItem('spopeer_user')
        || localStorage.getItem('spopeerUser')
        || localStorage.getItem('user')
      );
      if (!hasLocalSessionSignal) {
        window.location.href = '../auth/login.html';
        return;
      }
      console.debug('edit-profile: ignoring transient me() failure because local session exists', err);
    }

    // 2. Fetch full profile from backend (source of truth) and re-hydrate form
    try {
      if (window.SpopeerAPI && typeof window.SpopeerAPI.getCurrentProfile === 'function') {
        await window.SpopeerAPI.getCurrentProfile();
        var freshUser = (window.SpopeerAPI.getUser && window.SpopeerAPI.getUser()) ||
          JSON.parse(localStorage.getItem('spopeer_user') || '{}');
        if (freshUser && window._hydrateEditProfileFormFields) {
          window._hydrateEditProfileFormFields(freshUser);
        }
      }
    } catch (profileErr) {
      console.warn('Backend profile refresh failed on page load', profileErr);
    }

    // 3. Refresh current signed-in user and bind chips
    try {
      if (window.CurrentUserStore) {
        await window.CurrentUserStore.refreshCurrentUser();
      }
      if (window.UserUI) {
        window.UserUI.bindAllChips();
      }
    } catch (err) {
      console.debug('Current-user initialization failed on edit-profile page', err);
    }

    // 3. Shared profile menu runtime
    var chip = document.getElementById('userChip');
    if (window.sharedUi && typeof window.sharedUi.setupSocialFeedRuntime === 'function') {
      window.sharedUi.setupSocialFeedRuntime({ basePath: '../../' });
    }

    if (chip) {
      chip.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chip.click();
        }
      });
    }

    // 4. Section expand/collapse — collapse all by default
    var cards = Array.prototype.slice.call(document.querySelectorAll('.edit-card'));
    var headers = Array.prototype.slice.call(document.querySelectorAll('.edit-card-header'));

    cards.forEach(function (card) {
      card.classList.add('collapsed');
    });

    function setCardExpanded(card, expanded) {
      if (!card) return;
      if (expanded) card.classList.remove('collapsed');
      else card.classList.add('collapsed');

      var header = card.querySelector('.edit-card-header');
      if (header) {
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
    }

    headers.forEach(function (header) {
      header.setAttribute('tabindex', '0');
      header.setAttribute('role', 'button');
      var card = header.closest('.edit-card');
      header.setAttribute('aria-expanded', card && !card.classList.contains('collapsed') ? 'true' : 'false');

      header.addEventListener('click', function () {
        var currentCard = header.closest('.edit-card');
        if (!currentCard) return;
        var shouldExpand = currentCard.classList.contains('collapsed');
        setCardExpanded(currentCard, shouldExpand);
      });

      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });
    });

    // 5. Sidebar navigation opens target section
    document.querySelectorAll('.sidebar-nav-item[href^="#section-"]').forEach(function (link) {
      link.addEventListener('click', function () {
        var targetId = link.getAttribute('href').slice(1);
        var targetCard = document.getElementById(targetId);
        if (targetCard) {
          setCardExpanded(targetCard, true);
        }

        document.querySelectorAll('.sidebar-nav-item').forEach(function (item) {
          item.classList.toggle('active', item === link);
        });
      });
    });

    // 6. Dirty-state tracking: warn on unsaved changes
    var dirty = false;
    function markDirty() { dirty = true; }
    window.clearProfileDirty = function () { dirty = false; };
    document.addEventListener('input', function (e) {
      if (e.target.closest('.edit-card')) markDirty();
    }, true);
    document.addEventListener('change', function (e) {
      if (e.target.closest('.edit-card')) markDirty();
    }, true);
    window.addEventListener('beforeunload', function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  document.addEventListener('DOMContentLoaded', initEditProfilePage);
})();
