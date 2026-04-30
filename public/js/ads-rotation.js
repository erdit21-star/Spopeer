// ============================================================
// SPOPEER ADS ROTATION (frontend placeholders)
// Static slot placement + rotation on platform actions
// ============================================================

(function () {
  'use strict';

  var creatives = [
    {
      id: 'fuel-plan',
      kicker: 'Sponsored',
      title: 'Boost Match Readiness With Elite Sport Nutrition',
      text: 'Personalized plans for athletes, teams, and high-performance programs.',
      cta: 'Learn More',
      media: 'https://placehold.co/240x240/001f3f/ffffff?text=Fuel+Plan',
      weight: 5
    },
    {
      id: 'wearables',
      kicker: 'Partner',
      title: 'Smart Wearables For Real-Time Performance Tracking',
      text: 'Monitor pace, heart rate, load, and recovery in one dashboard.',
      cta: 'View Devices',
      media: 'https://placehold.co/240x240/1a6bff/ffffff?text=Wearables',
      weight: 4
    },
    {
      id: 'skills-camp',
      kicker: 'Sponsored',
      title: 'Join The Summer Skills Camp Registration Window',
      text: 'Limited spots for youth, academy, and elite prep sessions.',
      cta: 'Reserve Spot',
      media: 'https://placehold.co/240x240/0f8f5f/ffffff?text=Skills+Camp',
      weight: 3
    },
    {
      id: 'physio',
      kicker: 'Promotion',
      title: 'Sports Physio Slots Open For Next Week',
      text: 'Book assessment and recovery sessions with certified specialists.',
      cta: 'Book Session',
      media: 'https://placehold.co/240x240/7c3aed/ffffff?text=Recovery',
      weight: 2
    },
    {
      id: 'team-travel',
      kicker: 'Partner',
      title: 'Team Travel Deals For Tournaments & Camps',
      text: 'Group booking offers tailored for clubs and event organizers.',
      cta: 'Explore Offers',
      media: 'https://placehold.co/240x240/c2410c/ffffff?text=Team+Travel',
      weight: 2
    }
  ];

  var slotState = {};
  var lastRotateAt = 0;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getSlots() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-ad-slot]'));
  }

  function getSlotId(slot) {
    return String((slot && slot.getAttribute('data-ad-slot')) || '').trim();
  }

  function getSlotCadence(slotId) {
    if (slotId.indexOf('right-rail-') === 0) return 4;
    if (slotId.indexOf('feed-inline-') === 0) return 2;
    return 3;
  }

  function pickWeightedCreative(excludeIds, usedIds) {
    var excluded = excludeIds || {};
    var currentlyUsed = usedIds || {};

    var candidates = creatives.filter(function (creative) {
      return !excluded[creative.id] && !currentlyUsed[creative.id];
    });

    if (!candidates.length) {
      candidates = creatives.filter(function (creative) {
        return !excluded[creative.id];
      });
    }

    if (!candidates.length) {
      candidates = creatives.slice();
    }

    var totalWeight = candidates.reduce(function (sum, creative) {
      return sum + Math.max(1, Number(creative.weight || 1));
    }, 0);

    var target = Math.random() * totalWeight;
    var running = 0;
    for (var i = 0; i < candidates.length; i += 1) {
      running += Math.max(1, Number(candidates[i].weight || 1));
      if (target <= running) return candidates[i];
    }

    return candidates[0] || creatives[0];
  }

  function ensureSlotState(slot) {
    var slotId = getSlotId(slot);
    if (!slotId) return null;

    if (!slotState[slotId]) {
      slotState[slotId] = {
        slotId: slotId,
        cadence: getSlotCadence(slotId),
        actionsSinceRotate: 0,
        creativeId: null
      };
    }

    return slotState[slotId];
  }

  function getCreativeById(creativeId) {
    return creatives.find(function (creative) { return creative.id === creativeId; }) || null;
  }

  function renderSlot(slot, creative) {
    if (!slot || !creative) return;

    var currentCreativeId = slot.getAttribute('data-creative-id');
    if (currentCreativeId === creative.id && slot.innerHTML.trim()) {
      return;
    }

    slot.innerHTML =
      '<div class="ad-slot-body">' +
        '<div class="ad-slot-media" style="background-image:url(\'' + escapeHtml(creative.media) + '\')"></div>' +
        '<div class="ad-slot-copy">' +
          '<span class="ad-slot-kicker"><span class="ad-slot-dot"></span>' + escapeHtml(creative.kicker) + '</span>' +
          '<h4 class="ad-slot-title">' + escapeHtml(creative.title) + '</h4>' +
          '<p class="ad-slot-text">' + escapeHtml(creative.text) + '</p>' +
          '<button class="ad-slot-cta" type="button">' + escapeHtml(creative.cta) + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="ad-slot-footer"><span>Ad placement</span><span>Rotates on activity</span></div>';

    slot.setAttribute('data-creative-id', creative.id);
  }

  function renderAllSlots() {
    var slots = getSlots();
    if (!slots.length) return;

    var usedIds = {};

    slots.forEach(function (slot) {
      var state = ensureSlotState(slot);
      if (!state) return;

      var creative = getCreativeById(state.creativeId);
      if (!creative) {
        creative = pickWeightedCreative({}, usedIds);
        state.creativeId = creative && creative.id;
      }

      if (creative) usedIds[creative.id] = true;
      renderSlot(slot, creative);
    });
  }

  function rotateSlot(state, usedIds) {
    if (!state) return;

    var exclude = {};
    if (state.creativeId) exclude[state.creativeId] = true;
    var nextCreative = pickWeightedCreative(exclude, usedIds);
    if (!nextCreative) return;

    state.creativeId = nextCreative.id;
    state.actionsSinceRotate = 0;
    usedIds[nextCreative.id] = true;
  }

  function rotateNow() {
    if (!creatives.length) return;

    var usedIds = {};
    Object.keys(slotState).forEach(function (slotId) {
      rotateSlot(slotState[slotId], usedIds);
    });

    renderAllSlots();
  }

  function rotateOnAction() {
    var now = Date.now();
    if (now - lastRotateAt < 250) return;
    lastRotateAt = now;

    var usedIds = {};
    var changed = false;

    Object.keys(slotState).forEach(function (slotId) {
      var state = slotState[slotId];
      state.actionsSinceRotate += 1;

      if (state.actionsSinceRotate >= state.cadence) {
        rotateSlot(state, usedIds);
        changed = true;
      } else if (state.creativeId) {
        usedIds[state.creativeId] = true;
      }
    });

    if (changed) {
      renderAllSlots();
    }
  }

  function bindActionRotation() {
    document.addEventListener('click', rotateOnAction, true);
    document.addEventListener('submit', rotateOnAction, true);
    document.addEventListener('change', rotateOnAction, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        rotateOnAction();
      }
    }, true);
  }

  function refreshSlots() {
    var activeSlotIds = {};
    getSlots().forEach(function (slot) {
      var slotId = getSlotId(slot);
      if (!slotId) return;
      activeSlotIds[slotId] = true;
      ensureSlotState(slot);
    });

    Object.keys(slotState).forEach(function (slotId) {
      if (!activeSlotIds[slotId]) {
        delete slotState[slotId];
      }
    });

    renderAllSlots();
  }

  window.SpopeerAds = {
    refreshSlots: refreshSlots,
    rotateNow: rotateNow
  };

  document.addEventListener('DOMContentLoaded', function () {
    renderAllSlots();
    bindActionRotation();
  });
})();
