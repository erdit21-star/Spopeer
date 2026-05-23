(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function isDeletedMessage(msg) {
    if (!msg) return false;
    if (msg.deletedAt) return true;
    var text = String(msg.body || msg.text || msg.content || '').trim();
    return text === '[Message deleted]';
  }

  function upsertMessage(list, msg) {
    if (!Array.isArray(list) || !msg) return list || [];
    var id = msg.id ? String(msg.id) : '';
    if (!id) {
      list.push(msg);
      return list;
    }

    var idx = list.findIndex(function (m) { return String(m && m.id || '') === id; });
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], msg);
    } else {
      list.push(msg);
    }
    return list;
  }

  function markMessageDeleted(list, messageId, deletedAt) {
    if (!Array.isArray(list)) return list || [];
    var id = String(messageId || '');
    if (!id) return list;

    var idx = list.findIndex(function (m) { return String(m && m.id || '') === id; });
    if (idx < 0) return list;

    list[idx] = Object.assign({}, list[idx], {
      body: '[Message deleted]',
      content: '[Message deleted]',
      text: '[Message deleted]',
      deletedAt: deletedAt || new Date().toISOString()
    });
    return list;
  }

  function mergeOlderMessages(currentList, olderList) {
    var current = Array.isArray(currentList) ? currentList : [];
    var older = Array.isArray(olderList) ? olderList : [];
    var seen = new Set(current.map(function (m) { return String(m && m.id || ''); }));

    var deduped = older.filter(function (m) {
      var id = String(m && m.id || '');
      if (!id) return true;
      return !seen.has(id);
    });

    return deduped.concat(current);
  }

  messaging.state = {
    isDeletedMessage: isDeletedMessage,
    upsertMessage: upsertMessage,
    markMessageDeleted: markMessageDeleted,
    mergeOlderMessages: mergeOlderMessages
  };
})();
