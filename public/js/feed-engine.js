// Updated
(function () {
  function unwrapPosts(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.posts)) return result.posts;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.posts)) return result.data.posts;
    if (result.payload && Array.isArray(result.payload)) return result.payload;
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
    const result = await window.SpopeerAPI.getForYouFeed();
    return unwrapPosts(result);
  }

  async function getFollowingFeed() {
    const result = await window.SpopeerAPI.getFollowingFeed();
    return unwrapPosts(result);
  }

  async function getSportFeed(selectedSport) {
    const result = await window.SpopeerAPI.getSportFeed(selectedSport);
    return unwrapPosts(result);
  }

  async function getTrendingFeed() {
    const result = await window.SpopeerAPI.getTrendingFeed();
    return unwrapPosts(result);
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
