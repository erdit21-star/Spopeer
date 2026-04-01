(function () {
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("spopeer_user") || "{}");
    } catch {
      return {};
    }
  }

  function getRelevantSports(user) {
    return [
      user.primarySport,
      ...(Array.isArray(user.secondarySports) ? user.secondarySports : [])
    ].filter(Boolean);
  }

  function populateSportSelect() {
    const user = getCurrentUser();
    const sports = getRelevantSports(user);
    const select = document.getElementById("eventSport");
    if (!select) return;

    if (!sports.length) {
      select.innerHTML = '<option value="">No sports configured yet</option>';
      return;
    }

    select.innerHTML = `
      <option value="">Choose sport</option>
      ${sports.map((sport) => `<option value="${sport}">${sport}</option>`).join("")}
    `;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderEvents(events) {
    const list = document.getElementById("eventsList");
    if (!list) return;

    if (!events.length) {
      list.innerHTML = `
        <div class="empty-state">
          No events available yet for your sports.
        </div>
      `;
      return;
    }

    list.innerHTML = events.map((event) => {
      const pending = Array.isArray(event.myInvites) && event.myInvites.some((inv) => inv.status === "pending");

      return `
        <article class="event-card">
          <div class="event-top">
            <div>
              <div class="event-sport">
                <i class="fa-regular fa-calendar"></i>
                ${escapeHtml(event.sport)}
              </div>
            </div>
            <div class="event-type">${escapeHtml(event.type)}</div>
          </div>

          <h3 class="event-title">${escapeHtml(event.title)}</h3>
          <p class="muted">${escapeHtml(event.description || "")}</p>

          <div class="event-meta">
            <span class="meta-chip"><i class="fa-regular fa-clock"></i> ${new Date(event.date).toLocaleString()}</span>
            <span class="meta-chip"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location)}</span>
            <span class="meta-chip"><i class="fa-solid fa-user-group"></i> ${event.inviteCount || 0} invited</span>
          </div>

          ${pending ? `
            <div class="invite-box">
              <div style="font-size:13px;font-weight:700;margin-bottom:10px;">You are invited to this event.</div>
              <div class="event-actions">
                <button class="btn btn-accept" data-accept-event="${event.id}">Accept</button>
                <button class="btn btn-decline" data-decline-event="${event.id}">Decline</button>
              </div>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");

    list.querySelectorAll("[data-accept-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await window.SpopeerAPI.respondToEventInvite(btn.getAttribute("data-accept-event"), "accepted");
          await loadEvents();
        } catch (err) {
          alert(err.message || "Failed to accept invitation");
        }
      });
    });

    list.querySelectorAll("[data-decline-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await window.SpopeerAPI.respondToEventInvite(btn.getAttribute("data-decline-event"), "declined");
          await loadEvents();
        } catch (err) {
          alert(err.message || "Failed to decline invitation");
        }
      });
    });
  }

  async function loadEvents() {
    const result = await window.SpopeerAPI.listEvents();
    renderEvents(result.events || []);
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateSportSelect();
    loadEvents().catch((err) => {
      const list = document.getElementById("eventsList");
      if (list) {
        list.innerHTML = `<div class="empty-state">${err.message || "Failed to load events"}</div>`;
      }
    });

    const form = document.getElementById("createEventForm");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        title: document.getElementById("eventTitle")?.value.trim(),
        type: document.getElementById("eventType")?.value,
        sport: document.getElementById("eventSport")?.value,
        location: document.getElementById("eventLocation")?.value.trim(),
        date: document.getElementById("eventDate")?.value,
        description: document.getElementById("eventDescription")?.value.trim(),
        invitees: (document.getElementById("eventInvitees")?.value || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      };

      try {
        await window.SpopeerAPI.createEvent(payload);
        form.reset();
        populateSportSelect();
        await loadEvents();
      } catch (err) {
        alert(err.message || "Failed to create event");
      }
    });
  });
})();
