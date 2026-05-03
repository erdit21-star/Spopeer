(function () {
  function unwrapPosts(result) {
    console.log("[Spopeer Feed] raw result:", result);

    if (!result) return [];

    if (Array.isArray(result)) return result;

    if (Array.isArray(result.posts)) return result.posts;

    if (Array.isArray(result.data)) return result.data;

    if (result.data && Array.isArray(result.data.posts)) {
      return result.data.posts;
    }

    if (result.data && Array.isArray(result.data.rows)) {
      return result.data.rows;
    }

    if (result.data && Array.isArray(result.data.items)) {
      return result.data.items;
    }

    if (result.data && result.data.data && Array.isArray(result.data.data)) {
      return result.data.data;
    }

    console.warn("[Spopeer Feed] Could not unwrap posts:", result);
    return [];
  }

  function unwrapPost(result) {
    if (!result) return null;
    if (result.post) return result.post;
    if (result.data) return result.data;
    if (result.payload) return result.payload;
    return result;
  }

  async function getForYouFeed() {
    try {
      const result = await window.SpopeerAPI.listPosts({
        limit: 50,
        page: 1,
        _: Date.now(),
      });

      return unwrapPosts(result);
    } catch (err) {
      console.error("[Spopeer] For-you feed failed:", err);
      return [];
    }
  }

  async function getFollowingFeed() {
    return getForYouFeed();
  }

  async function getSportFeed(selectedSport) {
    try {
      const result = await window.SpopeerAPI.listPosts({
        limit: 50,
        page: 1,
        sport: selectedSport || "",
        _: Date.now(),
      });

      return unwrapPosts(result);
    } catch (err) {
      console.error("[Spopeer] Sport feed failed:", err);
      return [];
    }
  }

  async function getTrendingFeed() {
    return getForYouFeed();
  }

  async function createPost(payload) {
    const result = await window.SpopeerAPI.createPost(payload);
    return unwrapPost(result);
  }

  async function registerView(postId) {
    try {
      await window.SpopeerAPI.registerView(postId);
    } catch (err) {
      console.warn("[Spopeer] Post view sync unavailable.", err);
    }
  }

  window.SpopeerFeedEngine = {
    getForYouFeed,
    getFollowingFeed,
    getSportFeed,
    getTrendingFeed,
    createPost,
    registerView,
    markViewed: registerView,
  };
})();
