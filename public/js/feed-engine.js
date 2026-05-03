(function () {
  function unwrapPosts(result) {
    if (!result) return [];

    if (Array.isArray(result)) return result;
    if (Array.isArray(result.posts)) return result.posts;
    if (Array.isArray(result.data)) return result.data;

    // IMPORTANT: for /api/posts paginated response
    if (result.data && Array.isArray(result.data.posts)) {
      return result.data.posts;
    }

    if (result.data && Array.isArray(result.data.items)) {
      return result.data.items;
    }

    if (result.data && Array.isArray(result.data.rows)) {
      return result.data.rows;
    }

    if (Array.isArray(result.payload)) return result.payload;

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
      const result = await window.SpopeerAPI.getForYouFeed();
      return unwrapPosts(result);
    } catch (err) {
      console.warn("[Spopeer] For-you feed unavailable.", err);
      return [];
    }
  }

  async function getFollowingFeed() {
    try {
      const result = await window.SpopeerAPI.getFollowingFeed();
      return unwrapPosts(result);
    } catch (err) {
      console.warn("[Spopeer] Following feed unavailable.", err);
      return [];
    }
  }

  async function getSportFeed(selectedSport) {
    try {
      const result = await window.SpopeerAPI.getSportFeed(selectedSport);
      return unwrapPosts(result);
    } catch (err) {
      console.warn("[Spopeer] Sport feed unavailable.", err);
      return [];
    }
  }

  async function getTrendingFeed() {
    try {
      const result = await window.SpopeerAPI.getTrendingFeed();
      return unwrapPosts(result);
    } catch (err) {
      console.warn("[Spopeer] Trending feed unavailable.", err);
      return [];
    }
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
