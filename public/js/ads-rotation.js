// ============================================================
// SPOPEER ADS ROTATION (frontend placeholders)
// Static slot placement + rotation on platform actions
// ============================================================

(function () {
  'use strict';

  var creatives = [
    {
      id: 'test-ad-01', kicker: 'Sponsored', title: 'Test Ad 01 - Performance Cleats', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/001f3f/ffffff?text=Ad+01', href: 'https://example.com/test-ad-01', weight: 1
    },
    {
      id: 'test-ad-02', kicker: 'Partner', title: 'Test Ad 02 - Training Tracker', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/1a6bff/ffffff?text=Ad+02', href: 'https://example.com/test-ad-02', weight: 1
    },
    {
      id: 'test-ad-03', kicker: 'Sponsored', title: 'Test Ad 03 - Team Jerseys', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/0f8f5f/ffffff?text=Ad+03', href: 'https://example.com/test-ad-03', weight: 1
    },
    {
      id: 'test-ad-04', kicker: 'Promotion', title: 'Test Ad 04 - Athlete Recovery Kit', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/7c3aed/ffffff?text=Ad+04', href: 'https://example.com/test-ad-04', weight: 1
    },
    {
      id: 'test-ad-05', kicker: 'Partner', title: 'Test Ad 05 - Team Bus Deals', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/c2410c/ffffff?text=Ad+05', href: 'https://example.com/test-ad-05', weight: 1
    },
    {
      id: 'test-ad-06', kicker: 'Sponsored', title: 'Test Ad 06 - Sports Nutrition Box', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/164e63/ffffff?text=Ad+06', href: 'https://example.com/test-ad-06', weight: 1
    },
    {
      id: 'test-ad-07', kicker: 'Partner', title: 'Test Ad 07 - Goalkeeper Gloves', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/166534/ffffff?text=Ad+07', href: 'https://example.com/test-ad-07', weight: 1
    },
    {
      id: 'test-ad-08', kicker: 'Promotion', title: 'Test Ad 08 - Match Video Tools', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/9a3412/ffffff?text=Ad+08', href: 'https://example.com/test-ad-08', weight: 1
    },
    {
      id: 'test-ad-09', kicker: 'Sponsored', title: 'Test Ad 09 - Agility Ladders', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/1e3a8a/ffffff?text=Ad+09', href: 'https://example.com/test-ad-09', weight: 1
    },
    {
      id: 'test-ad-10', kicker: 'Partner', title: 'Test Ad 10 - Event Tickets', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/4a044e/ffffff?text=Ad+10', href: 'https://example.com/test-ad-10', weight: 1
    },
    {
      id: 'test-ad-11', kicker: 'Sponsored', title: 'Test Ad 11 - Team Analytics App', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/0f766e/ffffff?text=Ad+11', href: 'https://example.com/test-ad-11', weight: 1
    },
    {
      id: 'test-ad-12', kicker: 'Promotion', title: 'Test Ad 12 - Physio Appointments', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/be123c/ffffff?text=Ad+12', href: 'https://example.com/test-ad-12', weight: 1
    },
    {
      id: 'test-ad-13', kicker: 'Partner', title: 'Test Ad 13 - Smart Water Bottles', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/14532d/ffffff?text=Ad+13', href: 'https://example.com/test-ad-13', weight: 1
    },
    {
      id: 'test-ad-14', kicker: 'Sponsored', title: 'Test Ad 14 - Coaching Webinar', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/7f1d1d/ffffff?text=Ad+14', href: 'https://example.com/test-ad-14', weight: 1
    },
    {
      id: 'test-ad-15', kicker: 'Promotion', title: 'Test Ad 15 - Recovery Bands', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/78350f/ffffff?text=Ad+15', href: 'https://example.com/test-ad-15', weight: 1
    },
    {
      id: 'test-ad-16', kicker: 'Partner', title: 'Test Ad 16 - Team Insurance', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/2e1065/ffffff?text=Ad+16', href: 'https://example.com/test-ad-16', weight: 1
    },
    {
      id: 'test-ad-17', kicker: 'Sponsored', title: 'Test Ad 17 - Indoor Turf Rental', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/365314/ffffff?text=Ad+17', href: 'https://example.com/test-ad-17', weight: 1
    },
    {
      id: 'test-ad-18', kicker: 'Promotion', title: 'Test Ad 18 - Match Day Meals', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/312e81/ffffff?text=Ad+18', href: 'https://example.com/test-ad-18', weight: 1
    },
    {
      id: 'test-ad-19', kicker: 'Partner', title: 'Test Ad 19 - Gym Memberships', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/134e4a/ffffff?text=Ad+19', href: 'https://example.com/test-ad-19', weight: 1
    },
    {
      id: 'test-ad-20', kicker: 'Sponsored', title: 'Test Ad 20 - Tournament Hosting', text: 'Fake campaign for rotation testing.', cta: 'Open Ad', media: 'https://placehold.co/240x240/172554/ffffff?text=Ad+20', href: 'https://example.com/test-ad-20', weight: 1
    }
  ];

  var slotState = {};
  var lastRotateAt = 0;
  var rightRailRotateTimer = null;
  var RIGHT_RAIL_ROTATE_MS = 5000;

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

  function isRightRailSlot(slotId) {
    return slotId.indexOf('right-rail-') === 0;
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
        creativeId: null,
        sequenceIndex: 0
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

    var rotationLabel = isRightRailSlot(getSlotId(slot))
      ? 'Rotates every 5 seconds'
      : 'Rotates on activity';

    slot.innerHTML =
      '<div class="ad-slot-body">' +
        '<a class="ad-slot-media-link" href="' + escapeHtml(creative.href || '#') + '" target="_blank" rel="noopener noreferrer" aria-label="Open sponsored content">' +
          '<div class="ad-slot-media" style="background-image:url(\'' + escapeHtml(creative.media) + '\')"></div>' +
        '</a>' +
        '<div class="ad-slot-copy">' +
          '<span class="ad-slot-kicker"><span class="ad-slot-dot"></span>' + escapeHtml(creative.kicker) + '</span>' +
          '<h4 class="ad-slot-title"><a href="' + escapeHtml(creative.href || '#') + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(creative.title) + '</a></h4>' +
          '<p class="ad-slot-text">' + escapeHtml(creative.text) + '</p>' +
          '<a class="ad-slot-cta" href="' + escapeHtml(creative.href || '#') + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(creative.cta) + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="ad-slot-footer"><span>Ad placement</span><span>' + rotationLabel + '</span></div>';

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
        if (isRightRailSlot(state.slotId)) {
          state.sequenceIndex = Math.max(0, Number(state.sequenceIndex || 0)) % creatives.length;
          creative = creatives[state.sequenceIndex];
        } else {
          creative = pickWeightedCreative({}, usedIds);
        }
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
      var state = slotState[slotId];
      if (isRightRailSlot(slotId)) {
        state.sequenceIndex = (Number(state.sequenceIndex || 0) + 1) % creatives.length;
        state.creativeId = creatives[state.sequenceIndex].id;
      } else {
        rotateSlot(state, usedIds);
      }
    });

    renderAllSlots();
  }

  function rotateRightRailSlots() {
    if (!creatives.length) return;

    var changed = false;
    Object.keys(slotState).forEach(function (slotId) {
      if (!isRightRailSlot(slotId)) return;
      var state = slotState[slotId];
      state.sequenceIndex = (Number(state.sequenceIndex || 0) + 1) % creatives.length;
      state.creativeId = creatives[state.sequenceIndex].id;
      changed = true;
    });

    if (changed) {
      renderAllSlots();
    }
  }

  function startRightRailRotation() {
    if (rightRailRotateTimer) {
      clearInterval(rightRailRotateTimer);
      rightRailRotateTimer = null;
    }

    var hasRightRailSlot = getSlots().some(function (slot) {
      return isRightRailSlot(getSlotId(slot));
    });

    if (!hasRightRailSlot) return;

    rightRailRotateTimer = setInterval(rotateRightRailSlots, RIGHT_RAIL_ROTATE_MS);
  }

  function rotateOnAction() {
    var now = Date.now();
    if (now - lastRotateAt < 250) return;
    lastRotateAt = now;

    var usedIds = {};
    var changed = false;

    Object.keys(slotState).forEach(function (slotId) {
      if (isRightRailSlot(slotId)) {
        return;
      }

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
    startRightRailRotation();
  }

  window.SpopeerAds = {
    refreshSlots: refreshSlots,
    rotateNow: rotateNow
  };

  document.addEventListener('DOMContentLoaded', function () {
    refreshSlots();
    bindActionRotation();
  });
})();
