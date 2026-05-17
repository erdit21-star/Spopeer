document.addEventListener('DOMContentLoaded', async () => {
      if (window.CurrentUserStore) await CurrentUserStore.refreshCurrentUser();
      if (window.UserUI) UserUI.bindAllChips();
    });
