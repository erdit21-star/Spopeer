(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function bindConversationSearch(options) {
    var opts = options || {};
    var input = document.getElementById(opts.searchInputId || 'convSearch');
    var itemSelector = opts.itemSelector || '.conv-item';
    if (!input) return;

    input.addEventListener('input', function () {
      var q = String(input.value || '').toLowerCase();
      document.querySelectorAll(itemSelector).forEach(function (item) {
        var name = (item.querySelector('.conv-name') && item.querySelector('.conv-name').textContent || '').toLowerCase();
        var preview = (item.querySelector('.conv-preview') && item.querySelector('.conv-preview').textContent || '').toLowerCase();
        item.style.display = (name.includes(q) || preview.includes(q)) ? '' : 'none';
      });
    });
  }

  function bindViewProfile(options) {
    var opts = options || {};
    var getCurrentConversation = opts.getCurrentConversation;
    var profilePath = opts.profilePath || '../../pages/profiles/public-profile.html';

    window.viewProfile = function () {
      var current = typeof getCurrentConversation === 'function' ? getCurrentConversation() : '';
      if (!current) return;
      window.location.href = profilePath + '?userId=' + encodeURIComponent(current);
    };
  }

  async function resolveRecipientFromUrl(options) {
    var opts = options || {};
    var rawValue = opts.rawValue;
    var conversations = Array.isArray(opts.conversations) ? opts.conversations : [];
    var searchUsers = opts.searchUsers;

    var value = String(rawValue || '').trim();
    if (!value) return '';
    if (/^\d+$/.test(value)) return value;

    var exact = conversations.find(function (c) {
      var candidates = [c.otherId, c.otherUserId, c.email, c.otherEmail, c.username, c.id];
      return candidates.some(function (candidate) {
        return String(candidate || '').toLowerCase() === value.toLowerCase();
      });
    });

    if (exact && (exact.otherId || exact.otherUserId || exact.id)) {
      return String(exact.otherId || exact.otherUserId || exact.id);
    }

    try {
      var users = typeof searchUsers === 'function' ? await searchUsers(value) : [];
      if (Array.isArray(users) && users.length) {
        var match = users.find(function (u) {
          var keys = [u.id, u.userId, u.email, u.username];
          return keys.some(function (key) { return String(key || '').toLowerCase() === value.toLowerCase(); });
        }) || users[0];

        if (match && (match.id || match.userId)) {
          return String(match.id || match.userId);
        }
      }
    } catch (_e) {
      return value;
    }

    return value;
  }

  async function openConversationFromUrl(options) {
    var opts = options || {};
    var getMe = opts.getMe;
    var getConversations = opts.getConversations;
    var searchUsers = opts.searchUsers;
    var openConversation = opts.openConversation;
    var getConversationId = opts.getConversationId;

    var params = new URLSearchParams(window.location.search);
    var urlOther = params.get('userId') || params.get('otherId');
    if (!urlOther) return;

    var me = typeof getMe === 'function' ? getMe() : null;
    if (!me) {
      await new Promise(function (resolve) {
        var timeout = setTimeout(resolve, 3000);
        window.addEventListener('currentUserChanged', function handler() {
          clearTimeout(timeout);
          window.removeEventListener('currentUserChanged', handler);
          resolve();
        }, { once: true });
      });
    }

    var resolvedOther = await resolveRecipientFromUrl({
      rawValue: urlOther,
      conversations: typeof getConversations === 'function' ? getConversations() : [],
      searchUsers: searchUsers
    });

    if (!resolvedOther || typeof openConversation !== 'function') return;

    for (var attempt = 0; attempt < 3; attempt++) {
      var beforeConversationId = typeof getConversationId === 'function' ? getConversationId() : null;
      await openConversation(resolvedOther);
      var afterConversationId = typeof getConversationId === 'function' ? getConversationId() : null;
      if (afterConversationId || beforeConversationId !== afterConversationId) {
        return;
      }
      await new Promise(function (resolve) { setTimeout(resolve, 250); });
    }
  }

  messaging.navigation = {
    bindConversationSearch: bindConversationSearch,
    bindViewProfile: bindViewProfile,
    resolveRecipientFromUrl: resolveRecipientFromUrl,
    openConversationFromUrl: openConversationFromUrl
  };
})();
