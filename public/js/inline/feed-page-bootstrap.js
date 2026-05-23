(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var feed = (root.feed = root.feed || {});

  function getProfileMenuElement() {
    return document.querySelector("[data-user-menu]") || document.getElementById("profileMenu");
  }

  function toggleProfileMenuGlobal() {
    var menu = getProfileMenuElement();
    if (menu) menu.classList.toggle("visible");
  }

  // Backward-compat globals used by existing inline handlers.
  window.getProfileMenuElement = getProfileMenuElement;
  window.toggleProfileMenuGlobal = toggleProfileMenuGlobal;

  feed.getProfileMenuElement = getProfileMenuElement;
  feed.toggleProfileMenuGlobal = toggleProfileMenuGlobal;

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      if (window.CurrentUserStore && typeof window.CurrentUserStore.refreshCurrentUser === "function") {
        await window.CurrentUserStore.refreshCurrentUser();
      }
      if (window.UserUI && typeof window.UserUI.bindAllChips === "function") {
        window.UserUI.bindAllChips();
      }

      if (window.storiesManager) {
        var stories = await window.storiesManager.fetchFeedStories();
        window.storiesManager.renderStoriesCarousel(stories, "storiesCarousel");
      }
    } catch (err) {
      console.debug("feed-page-bootstrap init failed", err);
    }
  });

  window.addEventListener("currentUserChanged", function () {
    if (window.SpopeerStatsManager && typeof window.SpopeerStatsManager.syncSidebarStats === "function") {
      window.SpopeerStatsManager.syncSidebarStats();
    }
  });
})();
