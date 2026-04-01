(function () {
  function typeIcon(type) {
    if (type === "post") return "fa-regular fa-note-sticky";
    if (type === "link") return "fa-solid fa-link";
    return "fa-regular fa-newspaper";
  }

  function titleType(type) {
    if (type === "post") return "Post";
    if (type === "link") return "Link";
    return "Article";
  }

  function render(items, activeTab) {
    const mount = document.getElementById("libraryContent");
    if (!mount) return;

    const filtered = activeTab === "all"
      ? items
      : items.filter((item) => item.itemType === activeTab);

    if (!filtered.length) {
      mount.innerHTML = `
        <div class="empty-state">
          <h3 style="margin:0 0 8px;color:#111;">Nothing saved here yet</h3>
          <p style="margin:0;">Start saving posts, links, or articles and they will appear in your Library.</p>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="library-grid">
        ${filtered.map((item) => `
          <article class="library-card">
            <div class="library-card-top">
              <span class="library-type">
                <i class="${typeIcon(item.itemType)}"></i>
                ${titleType(item.itemType)}
              </span>
            </div>

            <h3 class="library-title">${item.title || "Untitled item"}</h3>
            <p class="library-desc">${item.description || ""}</p>

            <div class="library-meta">
              <span class="meta-chip">${new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    let activeTab = "all";

    async function load() {
      const result = await window.SpopeerAPI.listBookmarks();
      render(result.items || [], activeTab);
    }

    await load();

    document.querySelectorAll(".library-tab").forEach((btn) => {
      btn.addEventListener("click", async () => {
        document.querySelectorAll(".library-tab").forEach((tab) => tab.classList.remove("active"));
        btn.classList.add("active");
        activeTab = btn.dataset.libraryTab;
        await load();
      });
    });

    document.getElementById("seedLibraryBtn")?.remove();
  });
})();
