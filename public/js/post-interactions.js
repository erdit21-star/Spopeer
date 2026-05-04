(function () {
  function getCount(button) {
    return Number(button.dataset.count || "0");
  }

  function setCount(button, count) {
    const safeCount = Math.max(0, Number(count || 0));
    button.dataset.count = String(safeCount);
    const countEl = button.querySelector(".action-count");
    if (countEl) countEl.textContent = String(safeCount);
  }

  async function likePost(postId) {
    const button = document.querySelector(`[data-like-button="${postId}"]`);
    if (!button || button.disabled) return;

    const wasLiked = button.classList.contains("active");
    const oldCount = getCount(button);
    const newCount = wasLiked ? oldCount - 1 : oldCount + 1;

    button.disabled = true;
    button.classList.toggle("active", !wasLiked);
    setCount(button, newCount);

    try {
      const result = await window.SpopeerAPI.togglePostLike(postId);
      const data = result && result.data ? result.data : result;

      if (data && typeof data.likesCount === "number") {
        setCount(button, data.likesCount);
      }

      if (data && typeof data.liked === "boolean") {
        button.classList.toggle("active", data.liked);
      }
    } catch (error) {
      button.classList.toggle("active", wasLiked);
      setCount(button, oldCount);
      window.SpopeerAPI.showNotification(error.message || "Could not like post.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function toggleComments(postId) {
    const panel = document.querySelector(`[data-comments-panel="${postId}"]`);
    if (!panel) return;

    const isOpen = panel.classList.contains("open");

    if (isOpen) {
      panel.classList.remove("open");
      return;
    }

    panel.classList.add("open");
    await loadComments(postId);
  }

  async function loadComments(postId) {
    const list = document.querySelector(`[data-comments-list="${postId}"]`);
    if (!list) return;

    list.innerHTML = `<div class="comment-empty">Loading comments...</div>`;

    try {
      const result = await window.SpopeerAPI.getPostComments(postId);
      const comments =
        Array.isArray(result.data) ? result.data :
        result.data && Array.isArray(result.data.comments) ? result.data.comments :
        [];

      if (!comments.length) {
        list.innerHTML = `<div class="comment-empty">No comments yet. Be the first to comment.</div>`;
        return;
      }

      list.innerHTML = comments.map(function (comment) {
        const author = comment.author
          ? [comment.author.firstName, comment.author.lastName].filter(Boolean).join(" ")
          : "User";

        return `
          <div class="comment-item">
            <div class="comment-avatar">${escapeHtml(author.charAt(0).toUpperCase())}</div>
            <div class="comment-body">
              <strong>${escapeHtml(author)}</strong>
              <p>${escapeHtml(comment.content || "")}</p>
            </div>
          </div>
        `;
      }).join("");
    } catch (error) {
      list.innerHTML = `<div class="comment-empty">Could not load comments.</div>`;
    }
  }

  async function submitComment(postId) {
    const input = document.querySelector(`[data-comment-input="${postId}"]`);
    const button = document.querySelector(`[data-comment-submit="${postId}"]`);

    if (!input || !input.value.trim()) return;

    const content = input.value.trim();

    button.disabled = true;

    try {
      await window.SpopeerAPI.addPostComment(postId, content);
      input.value = "";

      const commentButton = document.querySelector(`[data-comment-button="${postId}"]`);
      if (commentButton) {
        setCount(commentButton, getCount(commentButton) + 1);
      }

      await loadComments(postId);
    } catch (error) {
      window.SpopeerAPI.showNotification(error.message || "Could not add comment.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function repostPost(postId) {
    try {
      const result = await window.SpopeerAPI.repostPost(postId);
      const data = result && result.data ? result.data : result;

      const button = document.querySelector(`[data-repost-button="${postId}"]`);
      if (button && data && typeof data.repostsCount === "number") {
        setCount(button, data.repostsCount);
      }

      window.SpopeerAPI.showNotification("Post reposted.", "success");

      if (typeof window.loadFeed === "function") {
        await window.loadFeed();
      }
    } catch (error) {
      window.SpopeerAPI.showNotification(error.message || "Could not repost.", "error");
    }
  }

  async function savePost(postId) {
    const button = document.querySelector(`[data-save-button="${postId}"]`);

    try {
      const result = await window.SpopeerAPI.savePost(postId);
      const data = result && result.data ? result.data : result;
      const saved = data && data.saved;

      if (button) {
        button.classList.toggle("active", !!saved);
        const label = button.querySelector(".action-label");
        if (label) label.textContent = saved ? "Saved" : "Save";
      }

      window.SpopeerAPI.showNotification(saved ? "Post saved." : "Post unsaved.", "success");
    } catch (error) {
      window.SpopeerAPI.showNotification(error.message || "Could not save post.", "error");
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.likePost = likePost;
  window.toggleComments = toggleComments;
  window.submitComment = submitComment;
  window.repostPost = repostPost;
  window.savePost = savePost;
})();
