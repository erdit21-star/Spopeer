(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var schema = (root.schema = root.schema || {});

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function unwrapPayload(value) {
    if (!value || typeof value !== "object") return value;
    if (value.data && value.data.payload !== undefined) return value.data.payload;
    if (value.data && value.data.user !== undefined) return value.data.user;
    if (value.data !== undefined) return value.data;
    if (value.payload !== undefined) return value.payload;
    return value;
  }

  function listFromResponse(value) {
    var unwrapped = unwrapPayload(value);
    if (Array.isArray(unwrapped)) return unwrapped;
    if (unwrapped && Array.isArray(unwrapped.results)) return unwrapped.results;
    if (unwrapped && Array.isArray(unwrapped.items)) return unwrapped.items;
    if (Array.isArray(value && value.results)) return value.results;
    if (Array.isArray(value && value.items)) return value.items;
    return [];
  }

  function normalizeUser(user) {
    var u = user && typeof user === "object" ? user : {};
    var id = u.id || u.userId || u.uuid || "";
    var displayName =
      u.displayName ||
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.username ||
      u.email ||
      "User";
    var role = u.role || u.userType || "athlete";
    var avatarUrl = u.avatarUrl || u.profilePicture || u.profileImage || u.avatar || "";

    return Object.assign({}, u, {
      id: id,
      userId: u.userId || id,
      displayName: displayName,
      role: role,
      avatarUrl: avatarUrl,
      verified: Boolean(u.verified || u.isVerified),
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      email: u.email || ""
    });
  }

  function normalizePost(post) {
    var p = post && typeof post === "object" ? post : {};
    var author = normalizeUser(p.author || p.user || p.creator || {});
    var media = Array.isArray(p.media)
      ? p.media
      : (p.image ? [{ type: "image", url: p.image }] : []);

    return Object.assign({}, p, {
      id: p.id || p.postId || "",
      content: p.content || p.text || "",
      media: media,
      createdAt: p.createdAt || p.timestamp || new Date().toISOString(),
      likesCount: Number(p.likesCount ?? p.likes ?? 0),
      commentsCount: Number(p.commentsCount ?? p.comments ?? 0),
      viewsCount: Number(p.viewsCount ?? p.views ?? 0),
      liked: Boolean(p.liked),
      sport: p.sport || "General",
      type: p.type || (media.length ? "media" : "text"),
      author: author
    });
  }

  function initialsForName(name) {
    return String(name || "U")
      .split(" ")
      .map(function (part) { return part[0] || ""; })
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  }

  function normalizePostForFeed(post) {
    var normalized = normalizePost(post);
    var author = normalized.author || normalizeUser({});
    var authorName = author.displayName || "User";

    return Object.assign({}, normalized, {
      authorId: author.id || "",
      authorName: authorName,
      authorEmail: author.email || "",
      authorType: author.role || "athlete",
      authorAvatarUrl: author.avatarUrl || "",
      authorAvatar: initialsForName(authorName),
      timestamp: normalized.createdAt,
      likes: normalized.likesCount,
      comments: normalized.commentsCount,
      views: normalized.viewsCount,
      image: normalized.image || (normalized.media[0] && normalized.media[0].url) || null,
      poll: normalized.poll || null,
      event: normalized.event || null
    });
  }

  function getCurrentUser() {
    if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === "function") {
      return normalizeUser(window.CurrentUserStore.getCurrentUser() || {});
    }
    return normalizeUser({});
  }

  schema.unwrapPayload = unwrapPayload;
  schema.listFromResponse = listFromResponse;
  schema.normalizeUser = normalizeUser;
  schema.normalizePost = normalizePost;
  schema.normalizePostForFeed = normalizePostForFeed;
  schema.getCurrentUser = getCurrentUser;

  window.SpopeerSchemaNormalizer = schema;
})();
