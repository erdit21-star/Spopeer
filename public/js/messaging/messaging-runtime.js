(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function schema() {
    return (window.Spopeer && window.Spopeer.schema) || window.SpopeerSchemaNormalizer || null;
  }

  function normalizeUser(user) {
    var s = schema();
    if (s && typeof s.normalizeUser === "function") return s.normalizeUser(user || {});
    return user || {};
  }

  function getCurrentUser() {
    var s = schema();
    if (s && typeof s.getCurrentUser === "function") {
      return s.getCurrentUser() || null;
    }
    if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === "function") {
      return normalizeUser(window.CurrentUserStore.getCurrentUser() || {});
    }
    return null;
  }

  function getCurrentUserId() {
    var user = getCurrentUser();
    if (!user) return null;
    return String(user.id || user.userId || user.email || "");
  }

  function listFromResponse(data) {
    var s = schema();
    if (s && typeof s.listFromResponse === "function") return s.listFromResponse(data);
    return Array.isArray(data) ? data : [];
  }

  messaging.runtime = {
    schema: schema,
    normalizeUser: normalizeUser,
    getCurrentUser: getCurrentUser,
    getCurrentUserId: getCurrentUserId,
    listFromResponse: listFromResponse
  };
})();
