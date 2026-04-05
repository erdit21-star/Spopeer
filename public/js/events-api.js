// Updated
(function () {
  if (!window.SpopeerAPI || typeof window.SpopeerAPI.request !== "function") {
    return;
  }

  window.SpopeerAPI.listEvents = function () {
    return window.SpopeerAPI.request("/api/events");
  };

  window.SpopeerAPI.createEvent = function (payload) {
    return window.SpopeerAPI.request("/api/events", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  };

  window.SpopeerAPI.respondToEventInvite = function (eventId, status) {
    return window.SpopeerAPI.request("/api/events/" + encodeURIComponent(eventId) + "/respond", {
      method: "POST",
      body: JSON.stringify({ status: status })
    });
  };
})();
