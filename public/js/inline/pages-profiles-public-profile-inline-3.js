document.addEventListener('DOMContentLoaded', async function () {
    var hasSession = !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
    if (hasSession && window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
    if (window.UserUI) window.UserUI.bindAllChips();
  });
