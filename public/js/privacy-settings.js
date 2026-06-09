/**
 * privacy-settings.js
 * Manages the user privacy settings page.
 *
 * Expected HTML structure (public/pages/dashboard/settings.html or similar):
 *
 *   <form id="privacy-settings-form">
 *     <select name="profileVisibility">…</select>
 *     <select name="messagePermission">…</select>
 *     <select name="commentPermission">…</select>
 *     <select name="followersVisibility">…</select>
 *     <select name="followingVisibility">…</select>
 *     <select name="emailVisibility">…</select>
 *     <button type="submit">Save</button>
 *   </form>
 *   <div id="privacy-save-msg" hidden></div>
 */

(function () {
  'use strict';

  const ENDPOINT = '/api/privacy/settings';

  async function loadSettings(form) {
    try {
      const res = await fetch(ENDPOINT, { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data || json;
      Object.entries(data).forEach(([key, value]) => {
        const el = form.elements[key];
        if (el) el.value = value;
      });
    } catch (_) {
      // Non-fatal: form defaults are acceptable
    }
  }

  async function saveSettings(form, msgEl) {
    const payload = {};
    const fields = [
      'profileVisibility', 'messagePermission', 'commentPermission',
      'followersVisibility', 'followingVisibility',
      'emailVisibility', 'phoneVisibility', 'dobVisibility'
    ];
    fields.forEach(f => {
      const el = form.elements[f];
      if (el) payload[f] = el.value;
    });

    try {
      const res = await fetch(ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json.error && json.error.message) || 'Save failed.');

      if (msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = '✓ Privacy settings saved.';
        msgEl.className = 'privacy-save-success';
        setTimeout(() => { msgEl.hidden = true; }, 3000);
      }
      if (typeof window.showToast === 'function') window.showToast('Privacy settings saved.', 'success');
    } catch (err) {
      if (msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = err.message || 'Could not save settings.';
        msgEl.className = 'privacy-save-error';
      }
    }
  }

  function initPrivacySettings(form) {
    const msgEl = document.getElementById('privacy-save-msg');
    loadSettings(form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      saveSettings(form, msgEl);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('privacy-settings-form');
    if (form) initPrivacySettings(form);
  });

  window.PrivacySettings = { init: initPrivacySettings };
})();
