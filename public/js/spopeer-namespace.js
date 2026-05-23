(function () {
  var root = (window.Spopeer = window.Spopeer || {});

  root.utils = root.utils || {};
  root.feed = root.feed || {};
  root.messaging = root.messaging || {};
  root.community = root.community || {};
  root.stories = root.stories || {};

  Object.defineProperty(root, "api", {
    configurable: true,
    enumerable: true,
    get: function () {
      return window.SpopeerAPI || null;
    }
  });

  Object.defineProperty(root, "auth", {
    configurable: true,
    enumerable: true,
    get: function () {
      return window.Auth || null;
    }
  });

  Object.defineProperty(root, "store", {
    configurable: true,
    enumerable: true,
    get: function () {
      return window.CurrentUserStore || null;
    }
  });

  root.utils.getCurrentUser = function () {
    if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === "function") {
      return window.CurrentUserStore.getCurrentUser() || {};
    }
    return {};
  };
})();
