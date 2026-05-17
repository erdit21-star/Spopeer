document.addEventListener('DOMContentLoaded', async function () {
    if (window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
    if (window.UserUI) window.UserUI.bindAllChips();
  });

document.addEventListener('click', function(e) {
  if (e.target.closest('[data-action="switch-followers"]')) { if (window.switchTab) window.switchTab('followers'); }
  else if (e.target.closest('[data-action="switch-following"]')) { if (window.switchTab) window.switchTab('following'); }
});
