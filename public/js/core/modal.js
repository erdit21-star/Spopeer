// Updated
/**
 * Spopeer Shared Modal
 *
 * Lightweight modal factory. Works with any page — no framework required.
 *
 * Usage:
 *   // Open a simple message modal
 *   SpopeerModal.open({ title: 'Confirm', body: 'Are you sure?', onConfirm: () => {} });
 *
 *   // Open with custom HTML
 *   SpopeerModal.open({ title: 'Edit', html: '<form>...</form>' });
 *
 *   // Close programmatically
 *   SpopeerModal.close();
 */
(function () {
  'use strict';

  var OVERLAY_CLASS = 'sp-modal-overlay';
  var MODAL_CLASS   = 'sp-modal';

  function injectStyles() {
    if (document.getElementById('sp-modal-styles')) return;
    var style = document.createElement('style');
    style.id = 'sp-modal-styles';
    style.textContent = [
      '.' + OVERLAY_CLASS + '{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;animation:sp-modal-fade .2s ease}',
      '.' + MODAL_CLASS + '{background:#fff;border-radius:14px;max-width:480px;width:90%;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.25);animation:sp-modal-scale .2s ease}',
      '.sp-modal-title{font-size:18px;font-weight:700;margin-bottom:12px}',
      '.sp-modal-body{font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px}',
      '.sp-modal-actions{display:flex;justify-content:flex-end;gap:10px}',
      '.sp-modal-btn{padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600;transition:.15s}',
      '.sp-modal-btn-primary{background:#001f3f;color:#fff}',
      '.sp-modal-btn-primary:hover{background:#001a33}',
      '.sp-modal-btn-cancel{background:#f3f4f6;color:#374151}',
      '.sp-modal-btn-cancel:hover{background:#e5e7eb}',
      '@keyframes sp-modal-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes sp-modal-scale{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function close() {
    var overlay = document.querySelector('.' + OVERLAY_CLASS);
    if (overlay) overlay.remove();
  }

  function open(opts) {
    injectStyles();
    close(); // close previous

    var overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;

    var modal = document.createElement('div');
    modal.className = MODAL_CLASS;

    // Title
    if (opts.title) {
      var h = document.createElement('div');
      h.className = 'sp-modal-title';
      h.textContent = opts.title;
      modal.appendChild(h);
    }

    // Body
    var body = document.createElement('div');
    body.className = 'sp-modal-body';
    if (opts.html) {
      body.innerHTML = opts.html;
    } else if (opts.body) {
      body.textContent = opts.body;
    }
    modal.appendChild(body);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'sp-modal-actions';

    if (opts.onConfirm) {
      var cancel = document.createElement('button');
      cancel.className = 'sp-modal-btn sp-modal-btn-cancel';
      cancel.textContent = opts.cancelText || 'Cancel';
      cancel.addEventListener('click', close);
      actions.appendChild(cancel);

      var confirm = document.createElement('button');
      confirm.className = 'sp-modal-btn sp-modal-btn-primary';
      confirm.textContent = opts.confirmText || 'Confirm';
      confirm.addEventListener('click', function () {
        opts.onConfirm();
        close();
      });
      actions.appendChild(confirm);
    } else {
      var ok = document.createElement('button');
      ok.className = 'sp-modal-btn sp-modal-btn-primary';
      ok.textContent = opts.confirmText || 'OK';
      ok.addEventListener('click', close);
      actions.appendChild(ok);
    }
    modal.appendChild(actions);

    overlay.appendChild(modal);

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.body.appendChild(overlay);
    return { close: close, modal: modal };
  }

  window.SpopeerModal = { open: open, close: close };
})();
