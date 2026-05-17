document.addEventListener('DOMContentLoaded', async function () {
    var hasSession = localStorage.getItem('spopeer_loggedIn') === 'true' && !!(localStorage.getItem('spopeer_user') || localStorage.getItem('user'));
    if (hasSession && window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
    if (window.UserUI) window.UserUI.bindAllChips();
  });
