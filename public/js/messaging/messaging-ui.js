(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function renderConversationList(options) {
    var list = options && options.listEl;
    var conversations = options && options.conversations;
    var currentConversation = options && options.currentConversation;
    var initFor = options && options.initFor;
    var fmtTime = options && options.fmtTime;
    var escHtml = options && options.escHtml;
    var onOpen = options && options.onOpen;

    if (!list) return;

    if (!conversations || !conversations.length) {
      list.innerHTML = '<div class="conv-empty"><i class="fa-regular fa-comment-slash"></i><div style="margin-top:8px">No conversations yet</div><div style="font-size:12px;margin-top:4px;color:var(--muted-2)">Start a new message to connect</div></div>';
      return;
    }

    list.innerHTML = '';
    conversations.forEach(function (c) {
      var div = document.createElement('div');
      var otherId = String(c.otherId || c.id || '');
      div.className = 'conv-item' + ((currentConversation && currentConversation === otherId) ? ' active' : '');
      div.dataset.other = c.otherId || c.id;
      var unread = c.unread && c.unread > 0;
      var fallbackName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
      var name = c.otherName || fallbackName || ('User ' + (c.otherId || c.id));
      var init = typeof initFor === 'function' ? initFor(c.otherId || c.id) : '??';
      var time = c.lastAt && typeof fmtTime === 'function' ? fmtTime(c.lastAt) : '';
      var preview = c.lastMessage ? (typeof escHtml === 'function' ? escHtml(c.lastMessage.slice(0, 60)) : c.lastMessage.slice(0, 60)) : '';

      div.innerHTML =
        '<div class="conv-av">' + init + ((c.online || Math.random() > 0.7) ? '<span class="online-dot"></span>' : '') + '</div>' +
        '<div class="conv-info">' +
          '<div class="conv-name">' + name + '</div>' +
          '<div class="conv-preview ' + (unread ? 'unread-preview' : '') + '">' + preview + '</div>' +
        '</div>' +
        '<div class="conv-right">' +
          '<div class="conv-time">' + time + '</div>' +
          (unread ? '<div class="unread-badge">' + c.unread + '</div>' : '') +
        '</div>';

      div.addEventListener('click', function () {
        if (typeof onOpen === 'function') {
          onOpen(c.otherId || c.id || c.email, c.id || null);
        }
      });
      list.appendChild(div);
    });
  }

  function markUserOnline(uid) {
    var id = String(uid || '');
    if (!id) return;
    var item = document.querySelector('.conv-item[data-other="' + id + '"]');
    if (!item) return;
    var av = item.querySelector('.conv-av');
    if (av && !av.querySelector('.online-dot')) {
      var dot = document.createElement('div');
      dot.className = 'online-dot';
      av.appendChild(dot);
    }
  }

  function markUserOffline(uid) {
    var id = String(uid || '');
    if (!id) return;
    var item = document.querySelector('.conv-item[data-other="' + id + '"]');
    if (!item) return;
    var dot = item.querySelector('.online-dot');
    if (dot) dot.remove();
  }

  function applyChatTheme(theme, options) {
    var opts = options || {};
    var toggleId = opts.toggleId || 'chatThemeToggle';
    var isDark = String(theme || '').toLowerCase() === 'dark';
    document.body.classList.toggle('pulsechat-dark', isDark);

    var btn = document.getElementById(toggleId);
    if (btn) {
      btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      btn.title = isDark ? 'Use light theme' : 'Use dark theme';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  function initChatTheme(options) {
    var opts = options || {};
    var key = opts.storageKey || 'spopeer_chat_theme';
    var toggleId = opts.toggleId || 'chatThemeToggle';

    var saved = localStorage.getItem(key);
    if (!saved) {
      saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    applyChatTheme(saved, { toggleId: toggleId });

    var toggle = document.getElementById(toggleId);
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = document.body.classList.contains('pulsechat-dark') ? 'light' : 'dark';
        localStorage.setItem(key, next);
        applyChatTheme(next, { toggleId: toggleId });
      });
    }
  }

  function setMessagingAvailability(options) {
    var opts = options || {};
    var enabled = !!opts.enabled;
    var sendBtnId = opts.sendBtnId || 'sendBtn';
    var messageInputId = opts.messageInputId || 'messageText';
    var disabledMessage = opts.disabledMessage || 'Messaging will be available after backend activation.';

    var sendBtn = document.getElementById(sendBtnId);
    var messageText = document.getElementById(messageInputId);

    if (sendBtn) {
      var hasText = !!(messageText && String(messageText.value || '').trim());
      sendBtn.disabled = !enabled || !hasText;
    }

    if (messageText) {
      messageText.placeholder = enabled ? 'Write a message…' : disabledMessage;
      messageText.disabled = !enabled;
    }

    if (!enabled && window.SpopeerToast) {
      window.SpopeerToast.info(disabledMessage);
    }
  }

  messaging.ui = {
    renderConversationList: renderConversationList,
    markUserOnline: markUserOnline,
    markUserOffline: markUserOffline,
    applyChatTheme: applyChatTheme,
    initChatTheme: initChatTheme,
    setMessagingAvailability: setMessagingAvailability
  };
})();
