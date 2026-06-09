/**
 * group-admin.js
 * Frontend controls for group owner/admin actions:
 *   - Update group settings
 *   - Approve / reject join requests
 *   - Ban / remove members
 *
 * All functions expect a groupId (integer).
 *
 * Usage:
 *   window.GroupAdmin.approveMember(groupId, userId);
 *   window.GroupAdmin.banMember(groupId, userId);
 *   window.GroupAdmin.updateGroup(groupId, { name, description, privacy });
 */

(function () {
  'use strict';

  function apiUrl(path) { return `/api${path}`; }

  async function apiFetch(method, path, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(apiUrl(path), opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json.error && json.error.message) || `Request failed (${res.status})`);
    return json.data || json;
  }

  function notify(msg, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type || 'info');
    } else {
      alert(msg);
    }
  }

  /* ── Group settings update ─────────────────────────────────────────── */

  async function updateGroup(groupId, fields) {
    try {
      const data = await apiFetch('PATCH', `/groups/${groupId}`, fields);
      notify('Group updated.', 'success');
      document.dispatchEvent(new CustomEvent('spopeer:group:updated', { detail: data }));
      return data;
    } catch (err) {
      notify(err.message, 'error');
      throw err;
    }
  }

  /* ── Membership management ─────────────────────────────────────────── */

  async function approveMember(groupId, userId) {
    try {
      await apiFetch('POST', `/groups/${groupId}/approve/${userId}`);
      notify('Member approved.', 'success');
      document.dispatchEvent(new CustomEvent('spopeer:group:member:approved', { detail: { groupId, userId } }));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function rejectMember(groupId, userId) {
    try {
      await apiFetch('POST', `/groups/${groupId}/reject/${userId}`);
      notify('Join request rejected.', 'success');
      document.dispatchEvent(new CustomEvent('spopeer:group:member:rejected', { detail: { groupId, userId } }));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function banMember(groupId, userId) {
    if (!confirm('Ban this member from the group?')) return;
    try {
      await apiFetch('POST', `/groups/${groupId}/ban/${userId}`);
      notify('Member banned.', 'success');
      document.dispatchEvent(new CustomEvent('spopeer:group:member:banned', { detail: { groupId, userId } }));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function removeMember(groupId, userId) {
    if (!confirm('Remove this member from the group?')) return;
    try {
      await apiFetch('DELETE', `/groups/${groupId}/members/${userId}`);
      notify('Member removed.', 'success');
      document.dispatchEvent(new CustomEvent('spopeer:group:member:removed', { detail: { groupId, userId } }));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function inviteMember(groupId, userId) {
    try {
      await apiFetch('POST', `/groups/${groupId}/invite`, { userId });
      notify('Invitation sent.', 'success');
    } catch (err) { notify(err.message, 'error'); }
  }

  /* ── DOM helpers ───────────────────────────────────────────────────── */

  /**
   * Wire up all [data-group-action] buttons in the given container.
   * <button data-group-action="approve" data-group-id="5" data-user-id="12">Approve</button>
   */
  function wireButtons(container) {
    (container || document).querySelectorAll('[data-group-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action  = btn.dataset.groupAction;
        const groupId = parseInt(btn.dataset.groupId, 10);
        const userId  = parseInt(btn.dataset.userId,  10);
        if (!groupId) return;

        switch (action) {
          case 'approve': await approveMember(groupId, userId); break;
          case 'reject':  await rejectMember(groupId, userId);  break;
          case 'ban':     await banMember(groupId, userId);     break;
          case 'remove':  await removeMember(groupId, userId);  break;
          case 'invite':  await inviteMember(groupId, userId);  break;
        }

        // Optionally hide the button row after action
        const row = btn.closest('[data-member-row]');
        if (row && ['approve', 'reject', 'ban', 'remove'].includes(action)) row.remove();
      });
    });
  }

  /* ── Group settings form ──────────────────────────────────────────── */

  function initGroupSettingsForm(form, groupId) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fields = {};
      ['name', 'description', 'sport', 'privacy', 'rules'].forEach(f => {
        if (form.elements[f]) fields[f] = form.elements[f].value;
      });
      await updateGroup(groupId, fields);
    });
  }

  /* ── Auto-init ────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    wireButtons();
    const form = document.getElementById('group-settings-form');
    if (form) {
      const groupId = parseInt(form.dataset.groupId, 10);
      if (groupId) initGroupSettingsForm(form, groupId);
    }
  });

  window.GroupAdmin = {
    updateGroup,
    approveMember, rejectMember, banMember, removeMember, inviteMember,
    wireButtons, initGroupSettingsForm
  };
})();
