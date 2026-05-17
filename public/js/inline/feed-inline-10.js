window.addEventListener("currentUserChanged", function() {
    if (window.SpopeerStatsManager) {
      window.SpopeerStatsManager.syncSidebarStats();
    }
  });
