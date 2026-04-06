// Updated
(function () {
  async function syncSidebarStats() {
    const user = await window.Auth.syncUserFromBackend();
    if (!user || (!user._id && !user.id)) return;

    const userId = user._id || user.id;
    let stats;

    try {
      stats = await window.SpopeerAPI.getProfileStats(userId);
    } catch (err) {
      console.warn('[Spopeer] Sidebar stats unavailable right now.', err);
      return;
    }

    const map = {
      following: stats.followingCount || 0,
      followers: stats.followersCount || 0,
      posts: stats.postsCount || 0
    };

    Object.entries(map).forEach(([key, value]) => {
      document.querySelectorAll("[data-stat='" + key + "'] .sp-stat-num").forEach((el) => {
        el.textContent = String(value);
      });
    });
  }

  async function followUser(targetId) {
    await window.SpopeerAPI.followUser(targetId);
    await syncSidebarStats();
  }

  async function unfollowUser(targetId) {
    await window.SpopeerAPI.unfollowUser(targetId);
    await syncSidebarStats();
  }

  window.SpopeerStatsManager = {
    syncSidebarStats,
    followUser,
    unfollowUser
  };
})();
