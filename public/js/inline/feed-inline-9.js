document.addEventListener("DOMContentLoaded", async () => {
    const card = document.getElementById("eventsPreviewCard");
    const list = document.getElementById("eventsPreviewList");

    if (!card || !list || !window.SpopeerAPI || !window.SpopeerAPI.listEvents) return;

    try {
      const result = await window.SpopeerAPI.listEvents();
      const events = (result.events || []).slice(0, 3);

      if (!events.length) return;

      card.style.display = "block";
      list.innerHTML = events.map((event) => `
        <div style="padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface);">
          <div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:6px;">
            ${event.sport} � ${event.type}
          </div>
          <div style="font-size:15px;font-weight:800;color:var(--ink);margin-bottom:4px;">
            ${event.title}
          </div>
          <div style="font-size:13px;color:var(--muted);">
            ${new Date(event.date).toLocaleString()} � ${event.location}
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.warn("Events preview failed:", err);
    }
  });

  document.addEventListener("DOMContentLoaded", function() {
    const adminEntry = document.getElementById("openAdminDashboardBtn");
    if (adminEntry) {
      window.Auth.syncUserFromBackend().then(function(user) {
        if (user && user.role === "admin") {
          adminEntry.style.display = "flex";
          adminEntry.addEventListener("click", function(e) {
            e.preventDefault();
            window.location.href = "/pages/admin/dashboard.html";
          });
        } else {
          adminEntry.remove();
        }
      });
    }

    if (window.SpopeerStatsManager) {
      window.SpopeerStatsManager.syncSidebarStats();
    }
  });
