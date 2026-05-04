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
      // Feed still works from API if localStorage is unavailable.
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

  function clearLocalPost(post) {
    const id = getPostId(post);
    if (!id) return;
    writeLocalPosts(readLocalPosts().filter(function (item) {
      return getPostId(item.post) !== id;
    }));
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
      } else {
        clearLocalPost(post);
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

  function injectInlineComposerStyles() {
    if (document.getElementById("sp-inline-composer-style")) return;
    const style = document.createElement("style");
    style.id = "sp-inline-composer-style";
    style.textContent = `
      #sp-inline-composer{
        background:#fff;
        border:1px solid var(--border,#ebebe7);
        border-radius:28px;
        padding:24px;
        margin:0 0 14px;
        box-shadow:0 8px 24px rgba(0,0,0,.04),0 2px 6px rgba(0,0,0,.02);
        transition:box-shadow .2s;
      }
      #sp-inline-composer:focus-within{box-shadow:0 10px 32px rgba(0,0,0,.07),0 2px 8px rgba(0,0,0,.03)}
      .sp-inline-composer-row{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px}
      .sp-inline-composer-avatar{
        width:46px;height:46px;border-radius:50%;
        background:linear-gradient(135deg,#001f3f,#1a6bff);
        color:#fff;font-size:15px;font-weight:800;
        display:flex;align-items:center;justify-content:center;
        flex:0 0 46px;overflow:hidden;
        box-shadow:0 2px 8px rgba(0,31,63,.18);
      }
      .sp-inline-composer-avatar img{width:100%;height:100%;object-fit:cover}
      .sp-inline-composer-body{flex:1;min-width:0}
      #sp-inline-post-content{
        width:100%;min-height:90px;resize:vertical;
        border:1.5px solid var(--border,#ebebe7);
        border-radius:18px;
        padding:14px 18px;
        font:500 14px/1.55 'Plus Jakarta Sans',system-ui,sans-serif;
        color:var(--ink,#111111);
        outline:none;
        background:#fff;
        transition:border-color .15s,box-shadow .15s;
      }
      #sp-inline-post-content::placeholder{color:#b8b8b8}
      #sp-inline-post-content:focus{border-color:#1a6bff;box-shadow:0 0 0 3px rgba(26,107,255,.08)}
      .sp-inline-composer-actions{
        display:flex;align-items:center;justify-content:space-between;
        gap:10px;padding-top:16px;border-top:1px solid var(--border,#ebebe7);flex-wrap:wrap;
      }
      .sp-inline-tool-group{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .sp-inline-tool-btn{
        width:36px;height:36px;border-radius:999px;
        border:1.5px solid var(--border,#ebebe7);
        background:#fff;color:#7a7a7a;
        display:inline-flex;align-items:center;justify-content:center;
        cursor:pointer;transition:all .15s ease;
      }
      .sp-inline-tool-btn:hover{background:#f3f3ef;color:#111111;border-color:#d9d9d4}
      .sp-inline-tool-btn i{font-size:14px}
      #sp-inline-post-submit{
        border:0;border-radius:999px;padding:10px 28px;
        background:var(--accent,#001233);color:#fff;
        font:700 13px/1 'Plus Jakarta Sans',system-ui,sans-serif;
        cursor:pointer;display:inline-flex;align-items:center;gap:8px;
        letter-spacing:.01em;transition:background .2s,transform .15s;
      }
      #sp-inline-post-submit:hover{background:#002060;transform:translateY(-1px)}
      #sp-inline-post-submit:disabled{opacity:.55;cursor:not-allowed;transform:none}
      .sp-inline-composer-status{font-size:12px;font-weight:700;margin-top:8px;color:#7a7a7a;min-height:16px}
      .sp-inline-composer-status.error{color:#dc2626}
      .sp-inline-composer-status.success{color:#16a34a}
      @media(max-width:640px){
        #sp-inline-composer{border-radius:18px;padding:16px}
        .sp-inline-composer-row{gap:10px}
        .sp-inline-tool-group{width:100%;justify-content:flex-start}
        #sp-inline-post-submit{width:100%;justify-content:center}
      }
    `;
    document.head.appendChild(style);
  }

  function buildInlineComposer() {
    const user = getCurrentUser() || {};
    const displayName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "You";
    const parts = displayName.trim().split(/\s+/);
    const initials = ((parts[0] && parts[0][0]) || "Y") + ((parts[1] && parts[1][0]) || "");
    const avatar = user.avatarUrl || user.avatar;

    const section = document.createElement("section");
    section.id = "sp-inline-composer";
    section.setAttribute("aria-label", "Create a post");
    section.innerHTML = `
      <div class="sp-inline-composer-row">
        <div class="sp-inline-composer-avatar">${avatar ? '<img src="' + escapeHtml(avatar) + '" alt="Your avatar">' : escapeHtml(initials.toUpperCase())}</div>
        <div class="sp-inline-composer-body">
          <textarea id="sp-inline-post-content" rows="3" maxlength="5000" placeholder="Tell the sports world what’s happening."></textarea>
          <div class="sp-inline-composer-actions">
            <div class="sp-inline-tool-group" aria-label="Post tools">
              <button type="button" class="sp-inline-tool-btn" data-inline-tool="photo" title="Add image" aria-label="Add image"><i class="fa-solid fa-image"></i></button>
              <button type="button" class="sp-inline-tool-btn" data-inline-tool="video" title="Add video" aria-label="Add video"><i class="fa-solid fa-video"></i></button>
              <button type="button" class="sp-inline-tool-btn" data-inline-tool="poll" title="Create poll" aria-label="Create poll"><i class="fa-solid fa-chart-bar"></i></button>
              <button type="button" class="sp-inline-tool-btn" data-inline-tool="event" title="Create event" aria-label="Create event"><i class="fa-solid fa-calendar-days"></i></button>
            </div>
            <button id="sp-inline-post-submit" type="button"><i class="fa-solid fa-paper-plane"></i> Post</button>
          </div>
          <div id="sp-inline-composer-status" class="sp-inline-composer-status" aria-live="polite"></div>
        </div>
      </div>
    `;
    return section;
  }

  async function refreshFeedAfterCreate() {
    try {
      if (typeof window.loadFeed === "function") {
        await window.loadFeed();
        return;
      }

      if (typeof window.renderFeed === "function") {
        const posts = await getForYouFeed();
        window.renderFeed(posts);
      }
    } catch (err) {
      console.warn("[Spopeer] Feed renderer failed after post create:", err);
    }
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
    const button = composer.querySelector("#sp-inline-post-submit");
    const status = composer.querySelector("#sp-inline-composer-status");
    const toolButtons = composer.querySelectorAll("[data-inline-tool]");

    function setStatus(message, tone) {
      status.textContent = message || "";
      status.className = "sp-inline-composer-status" + (tone ? " " + tone : "");
    }

    async function submitInlinePost() {
      const content = textarea.value.trim();
      if (!content) {
        setStatus("Write something before posting.", "error");
        textarea.focus();
        return;
      }

      button.disabled = true;
      setStatus("Publishing your post...", "");

      try {
        const user = getCurrentUser() || {};
        await createPost({ content: content, sport: user.sport || user.primarySport || undefined });
        textarea.value = "";
        setStatus("Post published.", "success");
        if (window.SpopeerAPI && typeof window.SpopeerAPI.showNotification === "function") {
          window.SpopeerAPI.showNotification("Post published.", "success");
        }
        await refreshFeedAfterCreate();
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

    function openModalTool(toolType) {
      const modal = document.getElementById("postComposerModal");
      if (!modal) return;

      modal.classList.add("visible");
      const contentInput = document.getElementById("postContent");
      if (contentInput) contentInput.focus();

      const modalTool = modal.querySelector('.composer-tool-icon[data-tool="' + toolType + '"]');
      if (modalTool && typeof modalTool.click === "function") {
        modalTool.click();
        return;
      }

      if (toolType === "photo") {
        const photoInput = document.getElementById("photoInput");
        if (photoInput && typeof photoInput.click === "function") {
          photoInput.value = "";
          photoInput.click();
        }
      } else if (toolType === "video") {
        const videoInput = document.getElementById("videoInput");
        if (videoInput && typeof videoInput.click === "function") {
          videoInput.value = "";
          videoInput.click();
        }
      }
    }

    toolButtons.forEach(function (toolBtn) {
      toolBtn.addEventListener("click", function (event) {
        event.preventDefault();
        const toolType = toolBtn.getAttribute("data-inline-tool");
        if (!toolType) return;
        openModalTool(toolType);
      });
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
