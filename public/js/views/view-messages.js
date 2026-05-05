(function () {
  'use strict';

  var pollTimer = null;
  var activeConversationId = null;

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function unwrapList(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.conversations)) return result.conversations;
    if (result.data && Array.isArray(result.data.conversations)) return result.data.conversations;
    return [];
  }

  function unwrapConversation(result) {
    if (!result) return null;
    if (result.data && typeof result.data === 'object') return result.data;
    return result;
  }

  function messageText(msg) {
    return msg && (msg.text || msg.content || msg.body || '');
  }

  function formatName(conv) {
    if (!conv) return 'Conversation';
    return conv.otherName || conv.name || [conv.firstName, conv.lastName].filter(Boolean).join(' ') || 'Conversation';
  }

  function conversationId(conv) {
    return conv && (conv.id || conv.conversationId || conv._id || null);
  }

  function conversationParticipant(conv) {
    return conv && (conv.otherId || conv.participantId || conv.userId || null);
  }

  function renderMessages(chatEl, messages) {
    var rows = Array.isArray(messages) ? messages : [];
    if (!rows.length) {
      chatEl.innerHTML = '<p style="color:var(--muted);margin:0;">No messages yet.</p>';
      return;
    }

    chatEl.innerHTML = rows.map(function (m) {
      var text = messageText(m);
      var when = m && (m.createdAt || m.timestamp) ? new Date(m.createdAt || m.timestamp).toLocaleString() : '';
      return '<article class="post-card" style="margin-bottom:8px;"><div class="post-body"><p style="margin:0 0 6px;">' +
        String(text || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; }) +
        '</p><small style="color:var(--muted);">' + when + '</small></div></article>';
    }).join('');
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  async function openConversation(outlet, conv) {
    var chatTitle = outlet.querySelector('#spaMessagesTitle');
    var chatList = outlet.querySelector('#spaMessagesThread');
    var sendBtn = outlet.querySelector('#spaMessagesSend');
    var input = outlet.querySelector('#spaMessagesInput');
    if (!chatTitle || !chatList || !sendBtn || !input) return;

    var convId = conversationId(conv);
    if (!convId) {
      var participant = conversationParticipant(conv);
      if (participant && window.SpopeerAPI && typeof window.SpopeerAPI.createConversation === 'function') {
        var created = await window.SpopeerAPI.createConversation(participant);
        convId = conversationId(unwrapConversation(created));
      }
    }

    if (!convId) {
      chatTitle.textContent = 'Conversation unavailable';
      chatList.innerHTML = '<p style="color:var(--muted);">Could not open this conversation.</p>';
      return;
    }

    activeConversationId = String(convId);
    chatTitle.textContent = formatName(conv);
    chatList.innerHTML = '<p style="color:var(--muted);">Loading messages...</p>';

    try {
      var result = await window.SpopeerAPI.getConversation(activeConversationId);
      var data = unwrapConversation(result) || {};
      var messages = Array.isArray(data.messages) ? data.messages : (Array.isArray(data.data) ? data.data : []);
      renderMessages(chatList, messages);
    } catch (_err) {
      chatList.innerHTML = '<p style="color:var(--muted);">Could not load messages.</p>';
    }

    sendBtn.onclick = async function () {
      var text = String(input.value || '').trim();
      if (!text || !activeConversationId) return;
      sendBtn.disabled = true;
      try {
        await window.SpopeerAPI.sendConversationMessage(activeConversationId, text);
        input.value = '';
        var refreshed = await window.SpopeerAPI.getConversation(activeConversationId);
        var refreshedData = unwrapConversation(refreshed) || {};
        var refreshedMessages = Array.isArray(refreshedData.messages) ? refreshedData.messages : (Array.isArray(refreshedData.data) ? refreshedData.data : []);
        renderMessages(chatList, refreshedMessages);
      } catch (_sendErr) {
        // Keep UX non-blocking on transient send failures.
      } finally {
        sendBtn.disabled = false;
      }
    };
  }

  async function loadList(outlet) {
    var listEl = outlet.querySelector('#spaMessagesList');
    if (!listEl) return;

    var res = await window.SpopeerAPI.listConversations();
    var rows = unwrapList(res);

    if (!rows.length) {
      listEl.innerHTML = '<p style="color:var(--muted);">No conversations yet.</p>';
      return;
    }

    listEl.innerHTML = '';
    rows.forEach(function (c) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'nav-item';
      item.style.width = '100%';
      item.style.textAlign = 'left';
      var preview = c.lastMessage && (c.lastMessage.content || c.lastMessage.text)
        ? (c.lastMessage.content || c.lastMessage.text)
        : 'Open conversation';
      item.innerHTML = '<i class="fa-regular fa-comment-dots"></i> <span class="nav-label"><strong>' + formatName(c) + '</strong> · ' + preview + '</span>';
      item.addEventListener('click', function () { openConversation(outlet, c).catch(function () {}); });
      listEl.appendChild(item);
    });
  }

  async function mount(outlet) {
    outlet.innerHTML = '<div class="post-card"><div class="post-body"><h3 style="margin:0 0 10px;">Messages</h3><div style="display:grid;grid-template-columns:minmax(220px,320px) minmax(0,1fr);gap:12px;"><div id="spaMessagesList">Loading conversations...</div><section><h4 id="spaMessagesTitle" style="margin:0 0 8px;">Select a conversation</h4><div id="spaMessagesThread" style="max-height:420px;overflow:auto;"></div><div style="display:flex;gap:8px;margin-top:10px;"><input id="spaMessagesInput" type="text" placeholder="Write a message..." style="flex:1;border:1px solid var(--border);border-radius:999px;padding:8px 12px;"><button id="spaMessagesSend" class="post-action-btn" type="button">Send</button></div></section></div></div></div>';
    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);
    try {
      await loadList(outlet);
      pollTimer = setInterval(function () {
        loadList(outlet).catch(function () {});
      }, 15000);
    } catch (_err) {
      var list = outlet.querySelector('#spaMessagesList');
      if (list) list.innerHTML = '<p style="color:var(--muted);">Could not load conversations.</p>';
    }
  }

  function unmount() {
    stopPolling();
    activeConversationId = null;
  }

  if (window.SpaRouter) {
    window.SpaRouter.register('messages', { mount: mount, unmount: unmount });
  }
})();
