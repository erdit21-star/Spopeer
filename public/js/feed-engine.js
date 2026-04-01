(function () {
  async function getForYouFeed() {
    try {
      const result = await window.SpopeerAPI.getForYouFeed();
      return result.posts || [];
    } catch (err) {
      console.warn('[Spopeer] For-you feed unavailable.', err);
      return [];
    }
  }

  async function getFollowingFeed() {
    try {
      const result = await window.SpopeerAPI.getFollowingFeed();
      return result.posts || [];
    } catch (err) {
      console.warn('[Spopeer] Following feed unavailable.', err);
      return [];
    }
  }

  async function getSportFeed(selectedSport) {
    try {
      const result = await window.SpopeerAPI.getSportFeed(selectedSport);
      return result.posts || [];
    } catch (err) {
      console.warn('[Spopeer] Sport feed unavailable.', err);
      return [];
    }
  }

  async function getTrendingFeed() {
    try {
      const result = await window.SpopeerAPI.getTrendingFeed();
      return result.posts || [];
    } catch (err) {
      console.warn('[Spopeer] Trending feed unavailable.', err);
      return [];
    }
  }

  async function createPost(payload) {
    const result = await window.SpopeerAPI.createPost(payload);
    return result.post;
  }

  async function registerView(postId) {
    try {
      await window.SpopeerAPI.registerView(postId);
    } catch (err) {
      console.warn('[Spopeer] Post view sync unavailable.', err);
    }
  }

  window.SpopeerFeedEngine = {
    getForYouFeed,
    getFollowingFeed,
    getSportFeed,
    getTrendingFeed,
    createPost,
    registerView,
    markViewed: registerView
  };
})();
