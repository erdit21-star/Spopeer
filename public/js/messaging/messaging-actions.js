(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function bindMessageActions(options) {
    var opts = options || {};
    var messagesEl = document.getElementById(opts.messagesId || 'messages');
    var menuEl = document.getElementById(opts.menuId || 'messageContextMenu');
    var deleteBtn = document.getElementById(opts.deleteActionId || 'deleteMessageAction');
    var attachBtn = document.getElementById(opts.attachBtnId || 'attachFileBtn');
    var attachmentInput = document.getElementById(opts.attachmentInputId || 'chatAttachmentInput');

    var deleteMenuMessageId = '';

    if (messagesEl) {
      messagesEl.addEventListener('click', function (e) {
        var target = e.target;
        if (target && target.id === 'loadOlderBtn') {
          e.preventDefault();
          if (typeof opts.onLoadOlder === 'function') {
            opts.onLoadOlder();
          }
          return;
        }
        if (menuEl) menuEl.style.display = 'none';
      });

      messagesEl.addEventListener('contextmenu', function (e) {
        var bubble = e.target && e.target.closest('.msg-row.mine[data-deletable="1"] .bubble');
        if (!bubble) return;

        e.preventDefault();
        var row = bubble.closest('.msg-row');
        var messageId = row && row.dataset ? row.dataset.messageId : '';
        if (!messageId || !menuEl) return;

        deleteMenuMessageId = String(messageId);
        menuEl.style.display = 'block';
        menuEl.style.left = e.clientX + 'px';
        menuEl.style.top = e.clientY + 'px';
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async function () {
        var messageId = deleteMenuMessageId;
        if (menuEl) menuEl.style.display = 'none';
        deleteMenuMessageId = '';
        if (!messageId) return;

        if (!window.confirm('Delete this message?')) return;

        try {
          if (typeof opts.onDeleteMessage === 'function') {
            await opts.onDeleteMessage(messageId);
          }
        } catch (e) {
          if (typeof opts.onDeleteError === 'function') {
            opts.onDeleteError(e);
          }
        }
      });
    }

    document.addEventListener('click', function (e) {
      if (!menuEl || menuEl.style.display === 'none') return;
      if (!menuEl.contains(e.target)) {
        menuEl.style.display = 'none';
        deleteMenuMessageId = '';
      }
    });

    if (attachBtn && attachmentInput) {
      attachBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var hasConversation = typeof opts.hasConversation === 'function' ? !!opts.hasConversation() : true;
        if (!hasConversation) {
          if (typeof opts.onMissingConversation === 'function') {
            opts.onMissingConversation();
          }
          return;
        }
        attachmentInput.click();
      });

      attachmentInput.addEventListener('change', async function () {
        var file = attachmentInput.files && attachmentInput.files[0];
        if (!file) return;

        try {
          if (typeof opts.onAttachmentSelected === 'function') {
            await opts.onAttachmentSelected(file);
          }
        } catch (e) {
          if (typeof opts.onAttachmentError === 'function') {
            opts.onAttachmentError(e);
          }
        } finally {
          attachmentInput.value = '';
        }
      });
    }
  }

  messaging.actions = {
    bindMessageActions: bindMessageActions
  };
})();
