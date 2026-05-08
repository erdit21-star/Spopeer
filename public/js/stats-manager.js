// Updated
(function () {
  function unwrapStatsPayload(result) {
    if (!result) return {};
    if (result.data && typeof result.data === 'object') return result.data;
    return result;
  }

  async function syncSidebarStats() {
    const user = await window.Auth.syncUserFromBackend();
    if (!user || (!user._id && !user.id)) return;

    const userId = user._id || user.id;
    let stats;

    try {
      stats = unwrapStatsPayload(await window.SpopeerAPI.getProfileStats(userId));
    } catch (err) {
      console.warn('[Spopeer] Sidebar stats unavailable right now.', err);
      return;
    }

    const map = {
      following: Number(stats.followingCount || 0),
      followers: Number(stats.followersCount || 0),
      posts: Number(stats.postsCount || 0)
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
