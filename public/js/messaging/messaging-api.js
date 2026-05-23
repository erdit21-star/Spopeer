(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});
  var runtime = messaging.runtime || {};
  var utils = messaging.utils || {};

  function parsePayload(data) {
    if (utils && typeof utils.parsePayload === "function") {
      return utils.parsePayload(data);
    }
    return data;
  }

  function listFromResponse(data) {
    if (runtime && typeof runtime.listFromResponse === "function") {
      return runtime.listFromResponse(data);
    }
    return Array.isArray(data) ? data : [];
  }

  async function listConversations() {
    var raw = await window.SpopeerAPI.listConversations();
    return listFromResponse(raw);
  }

  async function createConversation(otherId) {
    var created = parsePayload(await window.SpopeerAPI.createConversation(String(otherId)));
    return created || null;
  }

  async function getConversation(conversationId, options) {
    var raw = await window.SpopeerAPI.getConversation(conversationId, options || { limit: 50 });
    return parsePayload(raw) || {};
  }

  async function sendConversationMessage(conversationId, text) {
    return window.SpopeerAPI.sendConversationMessage(conversationId, text);
  }

  async function markConversationRead(conversationId) {
    return window.SpopeerAPI.markConversationRead(conversationId);
  }

  async function deleteConversationMessage(messageId) {
    var raw = await window.SpopeerAPI.deleteConversationMessage(messageId);
    return parsePayload(raw) || raw;
  }

  async function searchUsers(params) {
    var raw = await window.SpopeerAPI.searchUsers(params || {});
    return listFromResponse(raw);
  }

  async function uploadChatAttachment(file) {
    var raw = await window.SpopeerAPI.uploadChatAttachment(file);
    return parsePayload(raw) || raw;
  }

  messaging.api = {
    listConversations: listConversations,
    createConversation: createConversation,
    getConversation: getConversation,
    sendConversationMessage: sendConversationMessage,
    markConversationRead: markConversationRead,
    deleteConversationMessage: deleteConversationMessage,
    searchUsers: searchUsers,
    uploadChatAttachment: uploadChatAttachment
  };
})();
