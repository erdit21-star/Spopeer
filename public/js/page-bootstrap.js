/* Shared authenticated page bootstrap.
 * CurrentUserStore is the canonical current-user state owner.
 * localStorage is cache only; pages must not manage user state directly.
 */
(function () {
  'use strict';

  async function init() {
    try {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.refreshCurrentUser === 'function') {
        await window.CurrentUserStore.refreshCurrentUser();
      }
    } catch (err) {
      console.debug('Shared page current-user refresh failed', err);
    }

    try {
      if (window.UserUI && typeof window.UserUI.bindAllChips === 'function') {
        window.UserUI.bindAllChips();
      }
    } catch (err) {
      console.debug('Shared page user-chip binding failed', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
