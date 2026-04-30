// ============================================================
// SPOPEER ADS ROTATION (frontend placeholders)
// Static slot placement + rotation on platform actions
// ============================================================

(function () {
  'use strict';

  var creatives = [
    {
      kicker: 'Sponsored',
      title: 'Boost Match Readiness With Elite Sport Nutrition',
      text: 'Personalized plans for athletes, teams, and high-performance programs.',
      cta: 'Learn More',
      media: 'https://placehold.co/240x240/001f3f/ffffff?text=Fuel+Plan'
    },
    {
      kicker: 'Partner',
      title: 'Smart Wearables For Real-Time Performance Tracking',
      text: 'Monitor pace, heart rate, load, and recovery in one dashboard.',
      cta: 'View Devices',
      media: 'https://placehold.co/240x240/1a6bff/ffffff?text=Wearables'
    },
    {
      kicker: 'Sponsored',
      title: 'Join The Summer Skills Camp Registration Window',
      text: 'Limited spots for youth, academy, and elite prep sessions.',
      cta: 'Reserve Spot',
      media: 'https://placehold.co/240x240/0f8f5f/ffffff?text=Skills+Camp'
    },
    {
      kicker: 'Promotion',
      title: 'Sports Physio Slots Open For Next Week',
      text: 'Book assessment and recovery sessions with certified specialists.',
      cta: 'Book Session',
      media: 'https://placehold.co/240x240/7c3aed/ffffff?text=Recovery'
    },
    {
      kicker: 'Partner',
      title: 'Team Travel Deals For Tournaments & Camps',
      text: 'Group booking offers tailored for clubs and event organizers.',
      cta: 'Explore Offers',
      media: 'https://placehold.co/240x240/c2410c/ffffff?text=Team+Travel'
    }
  ];

  var baseIndex = 0;
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

  function renderSlot(slot, creative) {
    if (!slot || !creative) return;

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
  }

  function renderAllSlots() {
    var slots = getSlots();
    if (!slots.length) return;

    slots.forEach(function (slot, index) {
      var creative = creatives[(baseIndex + index) % creatives.length];
      renderSlot(slot, creative);
    });
  }

  function rotateNow() {
    if (!creatives.length) return;
    baseIndex = (baseIndex + 1) % creatives.length;
    renderAllSlots();
  }

  function rotateOnAction() {
    var now = Date.now();
    if (now - lastRotateAt < 250) return;
    lastRotateAt = now;
    rotateNow();
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
