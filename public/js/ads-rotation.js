// ============================================================
// SPOPEER ADS FOUNDATION
// Phase 1: real-ad-ready placement layer.
// No fake/test creatives are rendered.
// ============================================================

(function () {
  'use strict';

  var ADS_ENABLED = false;
  var slotState = {};

  function getSlots() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-sponsored-slot]'));
  }

  function getSlotId(slot) {
    return String((slot && slot.getAttribute('data-sponsored-slot')) || '').trim();
  }

  function hideSlot(slot) {
    if (!slot) return;
    slot.hidden = true;
    slot.setAttribute('aria-hidden', 'true');
    slot.innerHTML = '';
  }

  function clearSlot(slot) {
    if (!slot) return;
    slot.hidden = false;
    slot.removeAttribute('aria-hidden');
  }

  function refreshSlots() {
    var slots = getSlots();

    slots.forEach(function (slot) {
      var slotId = getSlotId(slot);
      if (!slotId) {
        hideSlot(slot);
        return;
      }

      slotState[slotId] = {
        slotId: slotId,
        ready: ADS_ENABLED
      };

      // Phase 1 intentionally keeps all ad placements empty until a
      // real campaign source or approved ad provider is connected.
      if (!ADS_ENABLED) {
        hideSlot(slot);
      } else {
        clearSlot(slot);
      }
    });
  }

  function rotateNow() {
    // Reserved for Phase 2+ when real campaigns are supplied by the backend.
    refreshSlots();
  }

  window.SpopeerAds = {
    enabled: ADS_ENABLED,
    refreshSlots: refreshSlots,
    rotateNow: rotateNow
  };

  document.addEventListener('DOMContentLoaded', refreshSlots);
})();
