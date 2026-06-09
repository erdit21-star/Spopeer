(function () {
  'use strict';

  async function api(path, method, body) {
    const res = await fetch(path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json.error && json.error.message) || 'Request failed');
    return json.data || json;
  }

  function wire(container) {
    if (!container) return;

    const blockBtn = container.querySelector('[data-mod-action="block"]');
    const reportBtn = container.querySelector('[data-mod-action="report"]');
    const targetInput = container.querySelector('[data-mod-target]');
    const reasonSelect = container.querySelector('[data-mod-reason]');
    const noteInput = container.querySelector('[data-mod-note]');

    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {
        const userId = Number(targetInput && targetInput.value);
        if (!userId) return alert('Enter a valid user ID to block.');
        try {
          await api(`/api/moderation/block/${userId}`, 'POST');
          alert('User blocked.');
        } catch (e) {
          alert(e.message || 'Block failed.');
        }
      });
    }

    if (reportBtn) {
      reportBtn.addEventListener('click', async () => {
        const targetId = Number(targetInput && targetInput.value);
        if (!targetId) return alert('Enter a valid target ID to report.');
        const reason = (reasonSelect && reasonSelect.value) || 'other';
        const description = (noteInput && noteInput.value || '').trim();

        try {
          await api('/api/moderation/report', 'POST', {
            targetType: 'user',
            targetId,
            reason,
            description
          });
          alert('Report submitted.');
        } catch (e) {
          alert(e.message || 'Report failed.');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    wire(document.querySelector('[data-moderation-quick-actions]'));
  });

  window.ModerationUI = { wire };
})();
