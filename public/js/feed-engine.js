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

  function getCurrentUser() {
    return window.SpopeerAPI && typeof window.SpopeerAPI.getUser === "function"
      ? window.SpopeerAPI.getUser()
      : null;
  }

  function normalizeAuthor(post) {
    if (!post || post.author) return post;
    const user = getCurrentUser();
    if (!user) return post;

    return {
      ...post,
      author: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" "),
        role: user.role,
        avatarUrl: user.avatarUrl || user.avatar,
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

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getAuthorName(post) {
    const author = post && post.author ? post.author : getCurrentUser() || {};
    return author.displayName || [author.firstName, author.lastName].filter(Boolean).join(" ") || "Spopeer member";
  }

  function getAuthorInitials(post) {
    const name = getAuthorName(post);
    const parts = name.trim().split(/\s+/);
    return ((parts[0] && parts[0][0]) || "S") + ((parts[1] && parts[1][0]) || "");
  }

  function findFeedContainer() {
    return document.querySelector("[data-feed-list]") ||
      document.getElementById("feedPosts") ||
      document.getElementById("postsContainer") ||
      document.querySelector(".feed-list") ||
      document.querySelector(".posts-feed") ||
      document.querySelector(".posts-container") ||
      document.querySelector(".feed-stream") ||
      document.querySelector(".main-feed") ||
      document.querySelector(".feed-main") ||
      document.querySelector(".center-column") ||
      document.querySelector(".app-layout > *:nth-child(2)") ||
      document.querySelector("main");
  }

  function createFallbackPostCard(post) {
    const normalized = normalizePost(post) || {};
    const id = getPostId(normalized) || "local-" + Date.now();
    const authorName = getAuthorName(normalized);
    const initials = getAuthorInitials(normalized).toUpperCase();
    const sport = normalized.sport || "General";

    const card = document.createElement("article");
    card.className = "post-card sp-inline-created-post";
    card.setAttribute("data-post-id", String(id));
    card.innerHTML = `
      <div class="post-head" style="display:flex;gap:12px;align-items:center;margin-bottom:10px;">
        <div class="post-avatar" style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#001f3f,#1a6bff);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;">${escapeHtml(initials)}</div>
        <div>
          <strong>${escapeHtml(authorName)}</strong>
          <div style="font-size:12px;color:#6b7280;">Just now · ${escapeHtml(sport)}</div>
        </div>
      </div>
      <div class="post-content" style="white-space:pre-wrap;line-height:1.55;">${escapeHtml(normalized.content || "")}</div>
      <div class="post-actions" style="display:flex;gap:10px;margin-top:14px;border-top:1px solid #edf0f5;padding-top:10px;">
        <button type="button" class="act-btn" data-like-button="${escapeHtml(id)}" data-count="0"><i class="fa-regular fa-heart"></i> <span class="action-label">Like</span> <span class="action-count">0</span></button>
        <button type="button" class="act-btn" data-comment-button="${escapeHtml(id)}" data-count="0"><i class="fa-regular fa-comment"></i> <span class="action-label">Comment</span> <span class="action-count">0</span></button>
      </div>
    `;
    return card;
  }

  function ensurePostVisible(post) {
    const id = getPostId(post);
    if (id && document.querySelector('[data-post-id="' + CSS.escape(String(id)) + '"]')) return;
    const container = findFeedContainer();
    const composer = document.getElementById("sp-inline-composer");
    const card = createFallbackPostCard(post);

    if (container && composer && container === composer.parentElement) {
      composer.insertAdjacentElement("afterend", card);
      return;
    }

    if (container) {
      container.prepend(card);
    } else if (composer) {
      composer.insertAdjacentElement("afterend", card);
    }
  }

  function injectInlineComposerStyles() {
    if (document.getElementById("sp-inline-composer-style")) return;
    const style = document.createElement("style");
    style.id = "sp-inline-composer-style";
    style.textContent = `
      #sp-inline-composer{background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:18px;padding:14px 16px;margin:0 0 16px;box-shadow:0 8px 24px rgba(15,23,42,.04)}
      .sp-inline-composer-row{display:flex;gap:12px;align-items:flex-start}
      .sp-inline-composer-avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#001f3f,#1a6bff);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 42px;overflow:hidden}
      .sp-inline-composer-avatar img{width:100%;height:100%;object-fit:cover}
      .sp-inline-composer-body{flex:1;min-width:0}
      #sp-inline-post-content{width:100%;min-height:78px;resize:vertical;border:1px solid var(--border,#e5e7eb);border-radius:14px;padding:12px 14px;font:500 14px/1.45 'Plus Jakarta Sans',system-ui,sans-serif;color:var(--ink,#111827);outline:none;background:#f8fafc}
      #sp-inline-post-content:focus{background:#fff;border-color:var(--accent,#1a6bff);box-shadow:0 0 0 3px rgba(26,107,255,.12)}
      .sp-inline-composer-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;flex-wrap:wrap}
      .sp-inline-composer-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#64748b;font-size:12px;font-weight:700}
      #sp-inline-post-sport{border:1px solid var(--border,#e5e7eb);border-radius:999px;padding:8px 10px;background:#fff;font:700 12px 'Plus Jakarta Sans',system-ui,sans-serif;color:#334155;outline:none}
      #sp-inline-post-submit{border:0;border-radius:999px;padding:10px 18px;background:var(--accent,#001f3f);color:#fff;font:800 13px 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 8px 18px rgba(0,31,63,.18)}
      #sp-inline-post-submit:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
      .sp-inline-composer-status{font-size:12px;font-weight:700;margin-top:8px;color:#64748b;min-height:16px}
      .sp-inline-composer-status.error{color:#dc2626}.sp-inline-composer-status.success{color:#16a34a}
      .sp-inline-created-post{background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:18px;padding:16px;margin:0 0 16px;box-shadow:0 8px 24px rgba(15,23,42,.04)}
      @media(max-width:640px){#sp-inline-composer{border-radius:14px;padding:12px}.sp-inline-composer-row{gap:10px}.sp-inline-composer-actions{align-items:stretch}.sp-inline-composer-tools,#sp-inline-post-submit{width:100%;justify-content:center}#sp-inline-post-sport{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function buildInlineComposer() {
    const user = getCurrentUser() || {};
    const displayName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "You";
    const initials = ((displayName.trim().split(/\s+/)[0] || "Y")[0] + ((displayName.trim().split(/\s+/)[1] || "")[0] || "")).toUpperCase();
    const sport = user.sport || user.primarySport || "";
    const avatar = user.avatarUrl || user.avatar;

    const section = document.createElement("section");
    section.id = "sp-inline-composer";
    section.setAttribute("aria-label", "Create a post");
    section.innerHTML = `
      <div class="sp-inline-composer-row">
        <div class="sp-inline-composer-avatar">${avatar ? '<img src="' + escapeHtml(avatar) + '" alt="Your avatar">' : escapeHtml(initials)}</div>
        <div class="sp-inline-composer-body">
          <textarea id="sp-inline-post-content" rows="3" maxlength="5000" placeholder="Share an update with the sports world..."></textarea>
          <div class="sp-inline-composer-actions">
            <div class="sp-inline-composer-tools">
              <select id="sp-inline-post-sport" aria-label="Post sport">
                <option value="">General</option>
                ${sport ? '<option value="' + escapeHtml(sport) + '" selected>' + escapeHtml(sport) + '</option>' : ''}
                <option value="Football">Football</option>
                <option value="Basketball">Basketball</option>
                <option value="Tennis">Tennis</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Running">Running</option>
                <option value="Fitness">Fitness</option>
              </select>
              <span><i class="fa-regular fa-pen-to-square"></i> Write directly here — no popup</span>
            </div>
            <button id="sp-inline-post-submit" type="button"><i class="fa-solid fa-paper-plane"></i> Post</button>
          </div>
          <div id="sp-inline-composer-status" class="sp-inline-composer-status" aria-live="polite"></div>
        </div>
      </div>
    `;
    return section;
  }

  async function refreshFeedAfterCreate(post) {
    let usedRenderer = false;
    try {
      if (typeof window.loadFeed === "function") {
        usedRenderer = true;
        await window.loadFeed();
      } else if (typeof window.renderFeed === "function") {
        usedRenderer = true;
        const posts = await getForYouFeed();
        window.renderFeed(posts);
      }
    } catch (err) {
      console.warn("[Spopeer] Feed renderer failed after post create:", err);
    }

    window.setTimeout(function () {
      ensurePostVisible(post);
    }, usedRenderer ? 250 : 0);
  }

  function setupInlineComposer() {
    if (!/\/feed\.html$/i.test(window.location.pathname || "")) return;
    if (document.getElementById("sp-inline-composer")) return;
    if (!window.SpopeerAPI || typeof window.SpopeerAPI.createPost !== "function") return;

    injectInlineComposerStyles();

    const host = findFeedContainer();
    if (!host) return;

    const composer = buildInlineComposer();
    const firstPost = host.querySelector(".post-card,[data-post-id],article");
    if (firstPost) host.insertBefore(composer, firstPost);
    else host.prepend(composer);

    const textarea = composer.querySelector("#sp-inline-post-content");
    const sportInput = composer.querySelector("#sp-inline-post-sport");
    const button = composer.querySelector("#sp-inline-post-submit");
    const status = composer.querySelector("#sp-inline-composer-status");

    function setStatus(message, tone) {
      status.textContent = message || "";
      status.className = "sp-inline-composer-status" + (tone ? " " + tone : "");
    }

    async function submitInlinePost() {
      const content = textarea.value.trim();
      const sport = sportInput.value.trim();
      if (!content) {
        setStatus("Write something before posting.", "error");
        textarea.focus();
        return;
      }

      button.disabled = true;
      setStatus("Publishing your post...", "");

      try {
        const post = await createPost({ content: content, sport: sport || undefined });
        textarea.value = "";
        setStatus("Post published.", "success");
        if (window.SpopeerAPI && typeof window.SpopeerAPI.showNotification === "function") {
          window.SpopeerAPI.showNotification("Post published.", "success");
        }
        await refreshFeedAfterCreate(post || { content: content, sport: sport, tempId: "local-" + Date.now() });
      } catch (err) {
        console.error("[Spopeer] Inline post failed:", err);
        setStatus(err.message || "Could not publish post. Try again.", "error");
        if (window.SpopeerAPI && typeof window.SpopeerAPI.showNotification === "function") {
          window.SpopeerAPI.showNotification(err.message || "Could not publish post.", "error");
        }
      } finally {
        button.disabled = false;
      }
    }

    button.addEventListener("click", submitInlinePost);
    textarea.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        submitInlinePost();
      }
    });

    document.querySelectorAll('.compose-btn, [data-open-post-modal], [data-action="create-post"], a[href$="create-post.html"]').forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        textarea.focus();
        composer.scrollIntoView({ behavior: "smooth", block: "center" });
      }, true);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInlineComposer);
  } else {
    setupInlineComposer();
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
    setupInlineComposer,
  };
})();
