(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function createPollingController(options) {
    var pollInterval = null;
    var intervalMs = Number(options && options.intervalMs) || 5000;

    function start() {
      if (pollInterval) return;
      pollInterval = setInterval(function () {
        if (!options || typeof options.shouldPoll !== 'function' || !options.shouldPoll()) {
          return;
        }
        Promise.resolve(options.poll && options.poll()).catch(function () {});
      }, intervalMs);
    }

    function stop() {
      if (!pollInterval) return;
      clearInterval(pollInterval);
      pollInterval = null;
    }

    return {
      start: start,
      stop: stop
    };
  }

  function attachInboxSocketHandlers(socket, handlers) {
    if (!socket || !handlers) return;

    socket.on('new_message', function (msg) {
      if (typeof handlers.onNewMessage === 'function') handlers.onNewMessage(msg);
    });

    socket.on('user_typing', function (payload) {
      if (typeof handlers.onUserTyping === 'function') handlers.onUserTyping(payload);
    });

    socket.on('user_stop_typing', function (payload) {
      if (typeof handlers.onUserStopTyping === 'function') handlers.onUserStopTyping(payload);
    });

    socket.on('conversation_read', function (payload) {
      if (typeof handlers.onConversationRead === 'function') handlers.onConversationRead(payload);
    });

    socket.on('messages_read', function (payload) {
      if (typeof handlers.onMessagesRead === 'function') handlers.onMessagesRead(payload);
    });

    socket.on('message_deleted', function (payload) {
      if (typeof handlers.onMessageDeleted === 'function') handlers.onMessageDeleted(payload);
    });

    socket.on('connect', function () {
      if (typeof handlers.onConnect === 'function') handlers.onConnect();
    });

    socket.on('disconnect', function () {
      if (typeof handlers.onDisconnect === 'function') handlers.onDisconnect();
    });

    socket.on('connect_error', function (err) {
      if (typeof handlers.onConnectError === 'function') handlers.onConnectError(err);
    });

    socket.on('user_online', function (payload) {
      if (typeof handlers.onUserOnline === 'function') handlers.onUserOnline(payload);
    });

    socket.on('user_offline', function (payload) {
      if (typeof handlers.onUserOffline === 'function') handlers.onUserOffline(payload);
    });
  }

  messaging.socket = {
    createPollingController: createPollingController,
    attachInboxSocketHandlers: attachInboxSocketHandlers
  };
})();
