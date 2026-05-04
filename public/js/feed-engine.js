(function () {
  const LOCAL_POSTS_KEY = "spopeer_recent_created_posts";
  const LOCAL_POST_TTL_MS = 10 * 60 * 1000;

  function readLocalPosts() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || "[]");
      const now = Date.now();
      return Array.isArray(raw)
        ? raw.filter(function (item) {
            return item && item.post && item.savedAt && now - item.savedAt < LOCAL_POST_TTL_MS;
          })
        : [];
    } catch (_err) {
      return [];
    }
  }

  function writeLocalPosts(items) {
    try {
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(items.slice(0, 10)));
    } catch (_err) {
      // Local storage can fail in private mode. Feed should still work from API.
    }
  }

  function getPostId(post) {
    return post && (post.id || post.postId || post.uuid || post.tempId);
  }

  function normalizeAuthor(post) {
    if (!post || post.author) return post;

    const user = window.SpopeerAPI && typeof window.SpopeerAPI.getUser === "function"
      ? window.SpopeerAPI.getUser()
      : null;

    if (!user) return post;

    return {
      ...post,
      author: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" "),
        role: user.role,
        avatarUrl: user.avatarUrl,
        sport: user.sport || user.primarySport,
      },
    };
  }

  function normalizePost(post) {
    if (!post || typeof post !== "object") return post;
    return normalizeAuthor({
      ...post,
      content: post.content || post.body || post.text || "",
      sport: post.sport || (post.author && post.author.sport) || "General",
      likesCount: Number(post.likesCount || 0),
      commentsCount: Number(post.commentsCount || 0),
      repostsCount: Number(post.repostsCount || 0),
      createdAt: post.createdAt || post.created_at || new Date().toISOString(),
      isActive: post.isActive !== false,
    });
  }

  function storeLocalPost(post) {
    const normalized = normalizePost(post);
    if (!normalized) return null;

    const id = getPostId(normalized);
    const current = readLocalPosts().filter(function (item) {
      return getPostId(item.post) !== id;
    });

    current.unshift({ post: normalized, savedAt: Date.now() });
    writeLocalPosts(current);
    return normalized;
  }

  function mergeLocalPosts(serverPosts) {
    const posts = Array.isArray(serverPosts) ? serverPosts.map(normalizePost).filter(Boolean) : [];
    const localPosts = readLocalPosts().map(function (item) { return normalizePost(item.post); }).filter(Boolean);
    const seen = new Set(posts.map(getPostId).filter(Boolean));

    localPosts.forEach(function (post) {
      const id = getPostId(post);
      if (!id || !seen.has(id)) {
        posts.unshift(post);
        if (id) seen.add(id);
      }
    });

    return posts.sort(function (a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  function unwrapPosts(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.posts)) return result.posts;
    if (Array.isArray(result.data)) return result.data;
    if (result.data && Array.isArray(result.data.posts)) return result.data.posts;
    if (result.data && Array.isArray(result.data.rows)) return result.data.rows;
    if (result.data && Array.isArray(result.data.items)) return result.data.items;
    if (result.data && result.data.data && Array.isArray(result.data.data)) return result.data.data;
    return [];
  }

  function unwrapPost(result) {
    if (!result) return null;
    if (result.post) return result.post;
    if (result.payload) return result.payload;
    if (result.data && result.data.post) return result.data.post;
    if (result.data && result.data.payload) return result.data.payload;
    if (result.data) return result.data;
    return result;
  }

  async function getForYouFeed() {
    try {
      const result = await window.SpopeerAPI.listPosts({ limit: 50, page: 1, _: Date.now() });
      return mergeLocalPosts(unwrapPosts(result));
    } catch (err) {
      console.error("[Spopeer] For-you feed failed:", err);
      return mergeLocalPosts([]);
    }
  }

  async function getFollowingFeed() {
    try {
      const result = await window.SpopeerAPI.getFollowingFeed();
      return mergeLocalPosts(unwrapPosts(result));
    } catch (err) {
      console.error("[Spopeer] Following feed failed:", err);
      return mergeLocalPosts([]);
    }
  }

  async function getSportFeed(selectedSport) {
    try {
      const result = await window.SpopeerAPI.getSportFeed(selectedSport);
      return mergeLocalPosts(unwrapPosts(result));
    } catch (err) {
      console.error("[Spopeer] Sport feed failed:", err);
      return mergeLocalPosts([]);
    }
  }

  async function getTrendingFeed() {
    try {
      const result = await window.SpopeerAPI.getTrendingFeed();
      return mergeLocalPosts(unwrapPosts(result));
    } catch (err) {
      console.error("[Spopeer] Trending feed failed:", err);
      return mergeLocalPosts([]);
    }
  }

  async function createPost(payload) {
    const result = await window.SpopeerAPI.createPost(payload);
    const post = storeLocalPost(unwrapPost(result));
    window.dispatchEvent(new CustomEvent("spopeer:post-created", { detail: { post: post } }));
    return post;
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
    mergeLocalPosts,
  };
})();
