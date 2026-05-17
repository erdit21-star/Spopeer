document.addEventListener('DOMContentLoaded', async function () {
      if (window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
      if (window.UserUI) window.UserUI.bindAllChips();
    });
