(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function escHtml(text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function initFor(id) {
    return String(id || "?").slice(0, 2).toUpperCase();
  }

  function fmtTime(iso) {
    var date = new Date(iso);
    var now = new Date();
    var diff = (now - date) / 1000;
    if (diff < 60) return "now";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (diff < 86400) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function parsePayload(data) {
    if (data && typeof data === "object" && data.success === true && data.data !== undefined) {
      return data.data;
    }
    return data;
  }

  function parseAttachmentPayload(content) {
    var text = String(content || "").trim();
    if (!text.startsWith("ATTACHMENT::")) return null;
    try {
      return JSON.parse(text.slice("ATTACHMENT::".length));
    } catch (_e) {
      return null;
    }
  }

  function buildAttachmentMessage(payload) {
    return "ATTACHMENT::" + JSON.stringify(payload || {});
  }

  function renderBubbleContent(content) {
    var attachment = parseAttachmentPayload(content);
    if (!attachment || !attachment.url) {
      return escHtml(content || "");
    }

    var safeUrl = escHtml(String(attachment.url));
    var safeName = escHtml(String(attachment.name || "Attachment"));
    var safeMime = String(attachment.mimeType || "").toLowerCase();
    if (safeMime.indexOf("image/") === 0) {
      return '<div><img src="' + safeUrl + '" alt="Attachment" style="max-width:220px;border-radius:10px;display:block;margin-bottom:6px"/><a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:inherit;text-decoration:underline">' + safeName + "</a></div>";
    }
    return '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:inherit;text-decoration:underline"><i class="fa-solid fa-paperclip" style="margin-right:6px"></i>' + safeName + "</a>";
  }

  messaging.utils = {
    escHtml: escHtml,
    initFor: initFor,
    fmtTime: fmtTime,
    parsePayload: parsePayload,
    parseAttachmentPayload: parseAttachmentPayload,
    buildAttachmentMessage: buildAttachmentMessage,
    renderBubbleContent: renderBubbleContent
  };
})();
