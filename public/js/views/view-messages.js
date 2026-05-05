(function () {
  'use strict';

  var pollTimer = null;

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function loadList(listEl) {
    var res = await window.SpopeerAPI.request('/api/messages/conversations');
    var rows = Array.isArray(res.data) ? res.data : (Array.isArray(res.conversations) ? res.conversations : []);

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
      var text = c.lastMessage && c.lastMessage.content ? c.lastMessage.content : 'Open conversation';
      item.innerHTML = '<i class="fa-regular fa-comment-dots"></i> <span class="nav-label">' + text + '</span>';
      item.addEventListener('click', function () {
        window.location.href = '/pages/messaging/inbox.html';
      });
      listEl.appendChild(item);
    });
  }

  async function mount(outlet) {
    outlet.innerHTML = '<div class="post-card"><div class="post-body"><h3 style="margin:0 0 10px;">Messages</h3><div id="spaMessagesList">Loading conversations...</div></div></div>';
    outlet.classList.add('spa-view-enter');
    setTimeout(function () { outlet.classList.remove('spa-view-enter'); }, 220);

    var list = outlet.querySelector('#spaMessagesList');
    try {
      await loadList(list);
      pollTimer = setInterval(function () {
        loadList(list).catch(function () {});
      }, 15000);
    } catch (_err) {
      list.innerHTML = '<p style="color:var(--muted);">Could not load conversations.</p>';
    }
  }

  function unmount() {
    stopPolling();
  }

  if (window.SpaRouter) {
    window.SpaRouter.register('messages', { mount: mount, unmount: unmount });
  }
})();
