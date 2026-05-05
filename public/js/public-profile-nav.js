/* public/js/public-profile-nav.js
 * NAV button wiring for public-profile.html.
 * Extracted from inline script.
 */
(function() {
  // Notif popover interaction (profile menu toggle + actions handled by shared-ui.js)
  const notifBtn    = document.getElementById('notifBtn');
  const notifPopover = document.getElementById('notifPopover');

  function closeNotifPopover() {
    notifPopover?.classList.remove('visible');
    notifPopover?.setAttribute('aria-hidden','true');
  }

  // Close notif popover when opening profile menu
  document.getElementById('userChip')?.addEventListener('click', function() {
    closeNotifPopover();
  });

  notifBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (window.closeProfileMenu) window.closeProfileMenu();
    notifPopover?.classList.toggle('visible');
    notifPopover?.setAttribute('aria-hidden', notifPopover.classList.contains('visible') ? 'false' : 'true');
  });

  document.addEventListener('click', e => {
    if (!notifPopover?.contains(e.target) && !notifBtn?.contains(e.target)) closeNotifPopover();
  });

  // Nav icon buttons
  document.getElementById('feedBtn')?.addEventListener('click', () => window.location.href = '/app.html');
  document.getElementById('exploreBtn')?.addEventListener('click', () => window.location.href = '../search/search.html');
  document.getElementById('messagesBtn')?.addEventListener('click', () => window.location.href = '../messaging/inbox.html');

  // Search bar
  document.getElementById('navSearchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = '../search/search.html?term=' + encodeURIComponent(e.target.value.trim());
    }
  });
})();
