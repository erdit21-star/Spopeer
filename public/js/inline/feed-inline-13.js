document.addEventListener('DOMContentLoaded', function () {
  const layout = document.querySelector('.app-layout');
  const toggle = document.getElementById('sidebarToggle');

  if (!layout || !toggle) return;

  // Load saved state
  if (localStorage.getItem('spopeer_left_sidebar_collapsed') === '1') {
    layout.classList.add('left-sidebar-collapsed');
  }

  toggle.addEventListener('click', function () {
    layout.classList.toggle('left-sidebar-collapsed');

    const collapsed = layout.classList.contains('left-sidebar-collapsed');

    localStorage.setItem(
      'spopeer_left_sidebar_collapsed',
      collapsed ? '1' : '0'
    );
  });

  document.addEventListener('click', function (event) {
    var actionNode = event.target && event.target.closest('[data-feed-action]');
    if (!actionNode) return;

    var action = actionNode.getAttribute('data-feed-action');
    if (!action) return;

    if (action === 'navigate-edit-profile') {
      if (typeof window.navigateToEditProfile === 'function') {
        window.navigateToEditProfile();
      }
      return;
    }

    if (action === 'navigate-edit-profile-link') {
      event.preventDefault();
      if (typeof window.navigateToEditProfile === 'function') {
        window.navigateToEditProfile();
      }
      return;
    }

    if (action === 'open-share-modal') {
      if (typeof window.openShareModal === 'function') {
        window.openShareModal();
      }
      return;
    }

    if (action === 'add-poll-option') {
      if (typeof window.addPollOption === 'function') {
        window.addPollOption();
      }
      return;
    }

    if (action === 'close-share-modal') {
      if (typeof window.closeShareModal === 'function') {
        window.closeShareModal();
      }
      return;
    }

    if (action === 'copy-share-link') {
      if (typeof window.copyShareLink === 'function') {
        window.copyShareLink();
      }
      return;
    }

    if (action === 'share-via') {
      var platform = actionNode.getAttribute('data-share-platform') || '';
      if (typeof window.shareVia === 'function' && platform) {
        window.shareVia(platform);
      }
    }
  });
});
