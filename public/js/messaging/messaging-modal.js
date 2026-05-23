(function () {
  var root = (window.Spopeer = window.Spopeer || {});
  var messaging = (root.messaging = root.messaging || {});

  function bindNewMessageModal(options) {
    var opts = options || {};
    var modal = document.getElementById(opts.modalId || 'newMsgModal');
    var openBtn = document.getElementById(opts.openBtnId || 'newMsgBtn');
    var toInput = document.getElementById(opts.toInputId || 'newMsgTo');
    var firstMsgInput = document.getElementById(opts.firstMsgId || 'newMsgFirstMsg');
    var startBtn = document.getElementById(opts.startBtnId || 'startConvBtn');
    var errorDiv = document.getElementById(opts.errorId || 'userSearchError');
    var resultsContainer = document.getElementById(opts.resultsContainerId || 'userSearchResults');
    var resultsList = document.getElementById(opts.resultsListId || 'userSearchList');

    if (!modal || !toInput || !startBtn || !errorDiv || !resultsContainer || !resultsList) return;

    function setError(message) {
      if (!message) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        return;
      }
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    function hideResults() {
      resultsContainer.style.display = 'none';
      resultsList.innerHTML = '';
    }

    function openModal() {
      modal.classList.add('open');
      setError('');
    }

    function closeModal() {
      modal.classList.remove('open');
      setError('');
      hideResults();
    }

    function setSelectedUser(userId) {
      toInput.value = String(userId || '');
      hideResults();
    }

    if (openBtn) {
      openBtn.addEventListener('click', openModal);
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    if (opts.exposeGlobalSelect !== false) {
      window.setSelectedUser = function (userId) {
        setSelectedUser(userId);
      };
    }

    toInput.addEventListener('input', async function () {
      var query = String(toInput.value || '').trim();
      setError('');

      if (query.length < 2) {
        hideResults();
        return;
      }

      try {
        var users = [];
        if (typeof opts.searchUsers === 'function') {
          users = await opts.searchUsers(query);
        }
        if (!Array.isArray(users)) users = [];

        if (!users.length) {
          resultsList.innerHTML = '<div style="padding:12px;color:var(--muted);text-align:center;font-size:13px;">No users found</div>';
          resultsContainer.style.display = 'block';
          return;
        }

        var normalizeUser = typeof opts.normalizeUser === 'function'
          ? opts.normalizeUser
          : function (u) { return u || {}; };
        var escHtml = typeof opts.escHtml === 'function'
          ? opts.escHtml
          : function (text) {
              var div = document.createElement('div');
              div.textContent = String(text || '');
              return div.innerHTML;
            };

        resultsList.innerHTML = users.map(function (u) {
          var user = normalizeUser(u);
          var name = user.displayName || 'User';
          var displayId = user.email || user.id;
          var safeId = escHtml(String(user.id || ''));
          var safeName = escHtml(name);
          var safeDisplayId = escHtml(String(displayId || ''));
          return '<div class="usr-result" data-userid="' + safeId + '" data-username="' + safeName + '" style="padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;transition:.15s;"><div style="font-weight:600;color:var(--ink);font-size:13px;">' + safeName + '</div><div style="font-size:11px;color:var(--muted);">' + safeDisplayId + '</div></div>';
        }).join('');

        resultsContainer.style.display = 'block';
        resultsList.querySelectorAll('.usr-result').forEach(function (item) {
          item.addEventListener('mouseover', function () { this.style.background = 'var(--surface)'; });
          item.addEventListener('mouseout', function () { this.style.background = ''; });
          item.addEventListener('click', function () {
            setSelectedUser(this.dataset.userid);
          });
        });
      } catch (_e) {
        setError('Search failed. Try entering a user ID or email.');
        hideResults();
      }
    });

    startBtn.addEventListener('click', async function () {
      var otherId = String(toInput.value || '').trim();
      var firstMsg = String(firstMsgInput && firstMsgInput.value || '').trim();
      setError('');

      if (!otherId) {
        setError('Please enter or select a user to message');
        if (typeof opts.onWarning === 'function') {
          opts.onWarning('Please select a recipient');
        }
        return;
      }

      if (firstMsg && firstMsg.length > 5000) {
        setError('First message exceeds 5000 characters.');
        if (typeof opts.onWarning === 'function') {
          opts.onWarning('Message is too long (max 5000 characters).');
        }
        return;
      }

      startBtn.disabled = true;
      try {
        var result = { success: false, message: 'Could not create conversation' };
        if (typeof opts.onStartConversation === 'function') {
          result = await opts.onStartConversation({ otherId: otherId, firstMsg: firstMsg }) || result;
        }

        if (!result.success) {
          setError(result.message || 'Could not create conversation');
          if (typeof opts.onErrorToast === 'function') {
            opts.onErrorToast(result.message || 'Could not create conversation');
          }
          return;
        }

        closeModal();
        toInput.value = '';
        if (firstMsgInput) firstMsgInput.value = '';

        if (typeof opts.onSuccess === 'function') {
          opts.onSuccess({ otherId: otherId, conversationId: result.conversationId || '' });
        }
      } catch (e) {
        var msg = e && e.message ? e.message : 'Could not create conversation';
        setError(msg);
        if (typeof opts.onErrorToast === 'function') {
          opts.onErrorToast(msg);
        }
      } finally {
        startBtn.disabled = false;
      }
    });
  }

  messaging.modal = {
    bindNewMessageModal: bindNewMessageModal
  };
})();
