// ============================================================
// SPOPEER REAL ADS DELIVERY
// Phase 2: reads approved campaigns from the backend.
// ============================================================

(function () {
  'use strict';

  var slots = [];
  var campaigns = [];
  var loaded = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function getSlots() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-sponsored-slot]'));
  }

  function slotFormat(slot) {
    var id = String(slot.getAttribute('data-sponsored-slot') || '');
    if (id.indexOf('right-rail-') === 0) return 'sidebar';
    if (id.indexOf('marketplace-') === 0) return 'marketplace';
    if (id.indexOf('event-') === 0 || id.indexOf('events-') === 0) return 'event';
    return 'feed';
  }

  function hide(slot) {
    slot.hidden = true;
    slot.setAttribute('aria-hidden', 'true');
    slot.innerHTML = '';
  }

  function render(slot, campaign) {
    if (!campaign) return hide(slot);

    var destination = campaign.destinationUrl || '#';
    var media = campaign.creativeUrl || '';
    if (!media || !destination || destination === '#') return hide(slot);

    slot.hidden = false;
    slot.removeAttribute('aria-hidden');
    slot.setAttribute('data-campaign-id', campaign.id);

    slot.innerHTML =
      '<div class="sponsored-slot-body">' +
        '<a class="sponsored-slot-media-link" href="' + esc(destination) + '" target="_blank" rel="noopener noreferrer" data-ad-click="' + esc(campaign.id) + '" aria-label="Open sponsored content">' +
          '<div class="sponsored-slot-media" style="background-image:url(\'' + esc(media) + '\')"></div>' +
        '</a>' +
        '<div class="sponsored-slot-copy">' +
          '<span class="sponsored-slot-kicker"><span class="sponsored-slot-dot"></span>Sponsored</span>' +
          '<h4 class="sponsored-slot-title"><a href="' + esc(destination) + '" target="_blank" rel="noopener noreferrer" data-ad-click="' + esc(campaign.id) + '">' + esc(campaign.headline) + '</a></h4>' +
          (campaign.body ? '<p class="sponsored-slot-text">' + esc(campaign.body) + '</p>' : '') +
          '<a class="sponsored-slot-cta" href="' + esc(destination) + '" target="_blank" rel="noopener noreferrer" data-ad-click="' + esc(campaign.id) + '">' + esc(campaign.cta || 'Learn More') + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="sponsored-slot-footer"><span>Sponsored</span><span>' + esc(campaign.name || '') + '</span></div>';

    recordEvent(campaign.id, 'impression');
  }

  function recordEvent(id, event) {
    if (!id || !window.SpopeerAPI || typeof window.SpopeerAPI.adsEvent !== 'function') return;
    window.SpopeerAPI.adsEvent(id, event).catch(function () {});
  }

  function choose(format, used) {
    var candidates = campaigns.filter(function (campaign) {
      return campaign.format === format && !used[campaign.id];
    });
    if (!candidates.length) {
      candidates = campaigns.filter(function (campaign) { return !used[campaign.id]; });
    }
    if (!candidates.length) candidates = campaigns;
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  }

  async function refreshSlots() {
    slots = getSlots();
    if (!slots.length) return;

    try {
      var response = await fetch('/api/ads/active', { credentials: 'include' });
      if (!response.ok) throw new Error('Ad delivery request failed');
      var payload = await response.json();
      campaigns = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
    } catch (error) {
      campaigns = [];
    }

    var used = {};
    slots.forEach(function (slot) {
      var campaign = choose(slotFormat(slot), used);
      if (campaign) used[campaign.id] = true;
      render(slot, campaign);
    });
    loaded = true;
  }

  function bindClicks() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('[data-ad-click]') : null;
      if (!target) return;
      var id = target.getAttribute('data-ad-click');
      recordEvent(id, 'click');
    }, true);
  }

  window.SpopeerAds = {
    enabled: true,
    refreshSlots: refreshSlots,
    rotateNow: refreshSlots
  };

  document.addEventListener('DOMContentLoaded', function () {
    bindClicks();
    refreshSlots();
  });
})();
