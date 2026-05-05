(function () {
  const $ = (s) => document.querySelector(s);

  const app = {
    route: "feed",
  };

  const screens = {
    feed: async () => {
      const container = $("#spmScreen");
      container.innerHTML = "Loading...";

      try {
        const res = await window.SpopeerAPI.listPosts({ limit: 20 });

        container.innerHTML = "";

        if (!res.posts || !res.posts.length) {
          container.innerHTML = "<div>No posts yet</div>";
          return;
        }

        res.posts.forEach((p) => {
          const card = document.createElement("div");
          card.className = "spm-card";

          card.innerHTML = `
            <strong>${p.author?.displayName || "User"}</strong>
            <p>${p.content || ""}</p>
          `;

          container.appendChild(card);
        });
      } catch (e) {
        container.innerHTML = "Error loading feed";
        console.error(e);
      }
    },

    create: () => {
      $("#spmScreen").innerHTML = `
        <textarea id="postContent" placeholder="Write something..."></textarea>
        <button id="postBtn">Post</button>
      `;

      $("#postBtn").onclick = async () => {
        const content = $("#postContent").value.trim();
        if (!content) return alert("Write something");

        await window.SpopeerAPI.createPost({ content });

        app.route = "feed";
        render();
      };
    },

    search: () => {
      $("#spmScreen").innerHTML = "<div>Search coming</div>";
    },

    messages: () => {
      $("#spmScreen").innerHTML = "<div>Messages coming</div>";
    },

    profile: () => {
      $("#spmScreen").innerHTML = "<div>Profile coming</div>";
    },
  };

  function render() {
    screens[app.route]?.();

    document.querySelectorAll(".spm-tabbar button").forEach((b) => {
      b.classList.toggle("active", b.dataset.route === app.route);
    });
  }

  function bindNav() {
    document.querySelectorAll(".spm-tabbar button").forEach((btn) => {
      btn.onclick = () => {
        app.route = btn.dataset.route;
        render();
      };
    });
  }

  async function init() {
    bindNav();

    setTimeout(async () => {
      try {
        await window.SpopeerAPI.me();

        $("#spmSplash").classList.add("spm-hidden");
        $("#spmShell").classList.remove("spm-hidden");

        render();
      } catch {
        $("#spmSplash").classList.add("spm-hidden");
        $("#spmAuth").classList.remove("spm-hidden");
      }
    }, 1200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
