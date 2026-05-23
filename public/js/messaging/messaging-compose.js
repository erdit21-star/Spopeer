(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function bindComposer(options) {
    var opts = options || {};
    var inputId = opts.inputId || 'messageText';
    var sendBtnId = opts.sendBtnId || 'sendBtn';
    var input = document.getElementById(inputId);
    var sendBtn = document.getElementById(sendBtnId);

    if (!input || !sendBtn) return;

    var stopTypingTimer = null;

    sendBtn.addEventListener('click', function () {
      if (typeof opts.onSend === 'function') {
        opts.onSend();
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (typeof opts.onSend === 'function') {
          opts.onSend();
        }
      }
    });

    input.addEventListener('input', function () {
      var enabled = typeof opts.isMessagingEnabled === 'function' ? !!opts.isMessagingEnabled() : true;
      sendBtn.disabled = !enabled || !String(input.value || '').trim();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';

      var socket = typeof opts.getSocket === 'function' ? opts.getSocket() : null;
      var currentConversation = typeof opts.getCurrentConversation === 'function' ? opts.getCurrentConversation() : null;
      if (!socket || !currentConversation) return;

      var receiverId = parseInt(currentConversation, 10);
      if (!isNaN(receiverId) && receiverId > 0) {
        socket.emit('typing', { receiverId: receiverId });
      }

      clearTimeout(stopTypingTimer);
      stopTypingTimer = setTimeout(function () {
        var s = typeof opts.getSocket === 'function' ? opts.getSocket() : null;
        var conv = typeof opts.getCurrentConversation === 'function' ? opts.getCurrentConversation() : null;
        if (!s || !conv) return;
        var r = parseInt(conv, 10);
        if (!isNaN(r) && r > 0) {
          s.emit('stop_typing', { receiverId: r });
        }
      }, 800);
    });

    input.addEventListener('blur', function () {
      var socket = typeof opts.getSocket === 'function' ? opts.getSocket() : null;
      var currentConversation = typeof opts.getCurrentConversation === 'function' ? opts.getCurrentConversation() : null;
      if (!socket || !currentConversation) return;
      var receiverId = parseInt(currentConversation, 10);
      if (!isNaN(receiverId) && receiverId > 0) {
        socket.emit('stop_typing', { receiverId: receiverId });
      }
    });
  }

  messaging.compose = {
    bindComposer: bindComposer
  };
})();
