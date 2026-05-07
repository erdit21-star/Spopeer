// Updated
(function () {
  const ARTICLE_HOST_HINTS = ["medium.com", "substack.com", "blog", "news", "article"];
  const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
  const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i;

  let allItems = [];
  let activeTab = "all";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function unwrapData(res) {
    if (!res || typeof res !== "object") return res;
    if (res.data !== undefined) return res.data;
    if (res.payload !== undefined) return res.payload;
    if (res.results !== undefined) return res.results;
    if (res.items !== undefined) return res.items;
    if (res.sponsorships !== undefined) return res.sponsorships;
    return res;
  }

  function pickTitleFromPost(post) {
    const content = String(post.content || "").trim();
    if (!content) return "Untitled post";
    return content.length > 90 ? content.slice(0, 90) + "..." : content;
  }

  function extractUrls(text) {
    const matches = String(text || "").match(/https?:\/\/[^\s)]+/g);
    return matches || [];
  }

  function looksArticle(post) {
    const content = String(post.content || "").toLowerCase();
    const urls = extractUrls(content);
    if (content.length >= 280) return true;
    if (content.includes("article") || content.includes("read:")) return true;
    return urls.some((url) => ARTICLE_HOST_HINTS.some((hint) => url.includes(hint)));
  }

  function inferMediaKindFromPost(post) {
    const mediaUrl = String(post.image || post.mediaUrl || post.videoUrl || "");
    const content = String(post.content || "").toLowerCase();
    if (VIDEO_EXT_RE.test(mediaUrl) || content.includes("youtube.com") || content.includes("youtu.be") || content.includes("vimeo.com")) {
      return "videos";
    }
    if (IMAGE_EXT_RE.test(mediaUrl) || !!mediaUrl) {
      return "images";
    }
    return null;
  }

  function typeIcon(type) {
    const map = {
      posts: "fa-regular fa-note-sticky",
      links: "fa-solid fa-link",
      articles: "fa-regular fa-newspaper",
      videos: "fa-solid fa-video",
      images: "fa-regular fa-image",
      events: "fa-regular fa-calendar",
      sponsorships: "fa-solid fa-handshake-angle"
    };
    return map[type] || "fa-regular fa-folder-open";
  }

  function typeLabel(type) {
    const map = {
      posts: "Post",
      links: "Link",
      articles: "Article",
      videos: "Video",
      images: "Image",
      events: "Event",
      sponsorships: "Sponsorship"
    };
    return map[type] || "Item";
  }

  function sourceLabel(source) {
    return source === "created" ? "Created" : "Saved";
  }

  function normalizePostToItems(post, source) {
    const items = [];
    const createdAt = post.createdAt || new Date().toISOString();
    const urls = extractUrls(post.content);
    const mediaKind = inferMediaKindFromPost(post);
    const base = {
      id: "post-" + post.id + "-" + source,
      source,
      postId: post.id,
      createdAt,
      title: pickTitleFromPost(post),
      description: String(post.content || ""),
      sport: post.sport || "",
      href: "/feed.html"
    };

    items.push(Object.assign({}, base, { itemType: "posts" }));
    if (urls.length) {
      items.push(Object.assign({}, base, {
        id: "link-" + post.id + "-" + source,
        itemType: "links",
        href: urls[0],
        description: urls[0]
      }));
    }
    if (looksArticle(post)) {
      items.push(Object.assign({}, base, { id: "article-" + post.id + "-" + source, itemType: "articles" }));
    }
    if (mediaKind) {
      items.push(Object.assign({}, base, {
        id: mediaKind + "-" + post.id + "-" + source,
        itemType: mediaKind,
        mediaUrl: post.image || post.mediaUrl || post.videoUrl || ""
      }));
    }

    return items;
  }

  function normalizeEventToItem(event, source) {
    return {
      id: "event-" + event.id + "-" + source,
      itemType: "events",
      source,
      createdAt: event.createdAt || event.startDate || new Date().toISOString(),
      title: event.title || "Untitled event",
      description: event.description || event.location || "Event",
      sport: event.sport || "",
      href: "/pages/events/event.html"
    };
  }

  function normalizeSponsorshipToItem(item, source) {
    return {
      id: "sponsorship-" + item.id + "-" + source,
      itemType: "sponsorships",
      source,
      createdAt: item.createdAt || new Date().toISOString(),
      title: item.title || "Untitled sponsorship",
      description: item.summary || item.mode || "Sponsorship",
      sport: item.sport || "",
      href: "/pages/sponsorship/sponsor.html"
    };
  }

  async function loadAllItems() {
    const user = (window.SpopeerAPI && typeof window.SpopeerAPI.getUser === "function") ? window.SpopeerAPI.getUser() : null;
    const currentUserId = user && user.id != null ? String(user.id) : "";

    const [postsRes, savedRes, bookmarksRes, eventsRes, sponsorshipsRes] = await Promise.allSettled([
      window.SpopeerAPI.listPosts({ authorId: currentUserId, limit: 200 }),
      window.SpopeerAPI.listSavedPosts(),
      window.SpopeerAPI.listBookmarks(),
      window.SpopeerAPI.listEvents(),
      window.SpopeerAPI.listSponsorships({ limit: 200 })
    ]);

    const posts = postsRes.status === "fulfilled" ? (unwrapData(postsRes.value) || []) : [];
    const savedPosts = savedRes.status === "fulfilled" ? (unwrapData(savedRes.value) || []) : [];
    const bookmarks = bookmarksRes.status === "fulfilled" ? (unwrapData(bookmarksRes.value) || []) : [];
    const events = eventsRes.status === "fulfilled" ? (unwrapData(eventsRes.value) || []) : [];
    const sponsorships = sponsorshipsRes.status === "fulfilled" ? (unwrapData(sponsorshipsRes.value) || []) : [];

    const items = [];
    const seen = new Set();

    (Array.isArray(posts) ? posts : []).forEach(function (post) {
      normalizePostToItems(post, "created").forEach(function (item) {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        items.push(item);
      });
    });

    (Array.isArray(savedPosts) ? savedPosts : []).forEach(function (saved) {
      const post = saved && (saved.post || saved);
      if (!post || !post.id) return;
      normalizePostToItems(post, "saved").forEach(function (item) {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        items.push(item);
      });
    });

    (Array.isArray(bookmarks) ? bookmarks : []).forEach(function (saved) {
      const post = saved && (saved.post || saved);
      if (!post || !post.id) return;
      normalizePostToItems(post, "saved").forEach(function (item) {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        items.push(item);
      });
    });

    (Array.isArray(events) ? events : [])
      .forEach(function (event) {
        var source = (currentUserId && String(event.createdBy || "") === currentUserId) ? "created" : "saved";
        const item = normalizeEventToItem(event, source);
        if (seen.has(item.id)) return;
        seen.add(item.id);
        items.push(item);
      });

    (Array.isArray(sponsorships) ? sponsorships : [])
      .filter(function (entry) {
        if (!currentUserId) return false;
        return String(entry.userId || (entry.author && entry.author.id) || "") === currentUserId;
      })
      .forEach(function (entry) {
        const item = normalizeSponsorshipToItem(entry, "created");
        if (seen.has(item.id)) return;
        seen.add(item.id);
        items.push(item);
      });

    var coverUrl = user && (user.coverPhotoUrl || user.coverUrl) ? (user.coverPhotoUrl || user.coverUrl) : "";
    var avatarUrl = user && (user.avatarUrl || user.avatar) ? (user.avatarUrl || user.avatar) : "";
    if (coverUrl) {
      items.push({
        id: "profile-cover",
        itemType: "images",
        source: "created",
        createdAt: user.updatedAt || new Date().toISOString(),
        title: "Profile Cover Photo",
        description: "Cover image used in your profile card.",
        sport: "",
        href: "/pages/profiles/edit-profile.html"
      });
    }
    if (avatarUrl) {
      items.push({
        id: "profile-avatar",
        itemType: "images",
        source: "created",
        createdAt: user.updatedAt || new Date().toISOString(),
        title: "Profile Photo",
        description: "Avatar image used across your profile.",
        sport: "",
        href: "/pages/profiles/edit-profile.html"
      });
    }
    if (user && user.mediaLinks && user.mediaLinks.highlightVideo) {
      items.push({
        id: "profile-highlight-video",
        itemType: "videos",
        source: "created",
        createdAt: user.updatedAt || new Date().toISOString(),
        title: "Profile Highlight Video",
        description: "Highlight video saved in your profile media links.",
        sport: "",
        href: user.mediaLinks.highlightVideo
      });
    }

    return items;
  }

  function getFilteredItems() {
    const sourceEl = document.getElementById("librarySourceFilter");
    const sortEl = document.getElementById("librarySort");
    const sourceFilter = sourceEl ? sourceEl.value : "all";
    const sortBy = sortEl ? sortEl.value : "newest";

    let out = allItems.filter(function (item) {
      if (activeTab !== "all" && item.itemType !== activeTab) return false;
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      return true;
    });

    if (sortBy === "title") {
      out = out.slice().sort(function (a, b) {
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
    } else if (sortBy === "oldest") {
      out = out.slice().sort(function (a, b) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } else {
      out = out.slice().sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return out;
  }

  function render() {
    const mount = document.getElementById("libraryContent");
    if (!mount) return;

    const filtered = getFilteredItems();
    if (!filtered.length) {
      mount.innerHTML = "<div class=\"empty-state\"><h3 style=\"margin:0 0 8px;color:#111;\">No items in this view</h3><p style=\"margin:0;\">Try another tab or filter. New activity will appear here automatically.</p></div>";
      return;
    }

    mount.innerHTML = "<div class=\"library-grid\">" + filtered.map(function (item) {
      return "<article class=\"library-card\">" +
        "<div class=\"library-card-top\">" +
          "<span class=\"library-type\"><i class=\"" + typeIcon(item.itemType) + "\"></i>" + typeLabel(item.itemType) + "</span>" +
        "</div>" +
        "<h3 class=\"library-title\">" + escapeHtml(item.title || "Untitled item") + "</h3>" +
        "<p class=\"library-desc\">" + escapeHtml(item.description || "") + "</p>" +
        "<div class=\"library-meta\">" +
          "<span class=\"meta-chip\">" + escapeHtml(sourceLabel(item.source)) + "</span>" +
          (item.sport ? "<span class=\"meta-chip\">" + escapeHtml(item.sport) + "</span>" : "") +
          "<span class=\"meta-chip\">" + new Date(item.createdAt).toLocaleDateString() + "</span>" +
          (item.href ? "<a class=\"meta-chip\" href=\"" + escapeHtml(item.href) + "\" target=\"_blank\" rel=\"noopener noreferrer\">Open</a>" : "") +
        "</div>" +
      "</article>";
    }).join("") + "</div>";
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const mount = document.getElementById("libraryContent");
    if (mount) {
      mount.innerHTML = "<div class=\"empty-state\"><h3 style=\"margin:0 0 8px;color:#111;\">Loading your library…</h3><p style=\"margin:0;\">Fetching your posts, links, media, events and sponsorships.</p></div>";
    }

    try {
      allItems = await loadAllItems();
    } catch (err) {
      console.error("Library load failed", err);
      allItems = [];
    }

    document.querySelectorAll(".library-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".library-tab").forEach(function (tab) { tab.classList.remove("active"); });
        btn.classList.add("active");
        activeTab = btn.dataset.libraryTab;
        render();
      });
    });

    var sourceEl = document.getElementById("librarySourceFilter");
    var sortEl = document.getElementById("librarySort");
    if (sourceEl) sourceEl.addEventListener("change", render);
    if (sortEl) sortEl.addEventListener("change", render);

    render();
  });
})();
