(function () {
  async function reloadFeed() {
    if (typeof window.loadFeed === "function") {
      await window.loadFeed();
      return;
    }

    if (window.SpopeerFeedEngine && typeof window.SpopeerFeedEngine.getForYouFeed === "function") {
      const posts = await window.SpopeerFeedEngine.getForYouFeed();

      if (typeof window.renderPosts === "function") {
        window.renderPosts(posts);
      }
    }
  }

  async function likePost(postId) {
    try {
      const result = await window.SpopeerAPI.togglePostLike(postId);
      console.log("Like result:", result);
      await reloadFeed();
    } catch (error) {
      console.error("Like failed:", error);
      window.SpopeerAPI.showNotification(error.message || "Could not like post.", "error");
    }
  }

  async function commentPost(postId) {
    const content = prompt("Write your comment:");

    if (!content || !content.trim()) {
      return;
    }

    try {
      await window.SpopeerAPI.addPostComment(postId, content.trim());
      window.SpopeerAPI.showNotification("Comment added.", "success");
      await reloadFeed();
    } catch (error) {
      console.error("Comment failed:", error);
      window.SpopeerAPI.showNotification(error.message || "Could not comment.", "error");
    }
  }

  async function viewComments(postId) {
    try {
      const result = await window.SpopeerAPI.getPostComments(postId);
      const comments = Array.isArray(result.data) ? result.data : [];

      if (!comments.length) {
        alert("No comments yet.");
        return;
      }

      const text = comments
        .map(function (comment) {
          const author = comment.author
            ? [comment.author.firstName, comment.author.lastName].filter(Boolean).join(" ")
            : "User";

          return author + ": " + comment.content;
        })
        .join("\n\n");

      alert(text);
    } catch (error) {
      console.error("Load comments failed:", error);
      window.SpopeerAPI.showNotification("Could not load comments.", "error");
    }
  }

  async function repostPost(postId) {
    try {
      await window.SpopeerAPI.repostPost(postId);
      window.SpopeerAPI.showNotification("Post reposted.", "success");
      await reloadFeed();
    } catch (error) {
      console.error("Repost failed:", error);
      window.SpopeerAPI.showNotification(error.message || "Could not repost.", "error");
    }
  }

  async function savePost(postId) {
    try {
      const result = await window.SpopeerAPI.savePost(postId);
      const saved = result && result.data && result.data.saved;

      window.SpopeerAPI.showNotification(
        saved ? "Post saved." : "Post removed from saved.",
        "success"
      );

      await reloadFeed();
    } catch (error) {
      console.error("Save failed:", error);
      window.SpopeerAPI.showNotification(error.message || "Could not save post.", "error");
    }
  }

  window.likePost = likePost;
  window.commentPost = commentPost;
  window.viewComments = viewComments;
  window.repostPost = repostPost;
  window.savePost = savePost;
})();
