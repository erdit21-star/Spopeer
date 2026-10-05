/* Spopeer Google AdSense foundation — loads only when explicitly configured. */
(function () {
  'use strict';

  var initialized = false;

  function getSlots() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-adsense-slot]'));
  }

  function loadScript(clientId) {
    if (document.querySelector('script[data-spopeer-adsense]')) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.spopeerAdsense = 'true';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(clientId);
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function renderSlots() {
    if (!window.adsbygoogle) return;
    getSlots().forEach(function (slot) {
      if (slot.dataset.adsenseReady === 'true') return;
      var ad = document.createElement('ins');
      ad.className = 'adsbygoogle';
      ad.style.display = 'block';
      ad.style.minHeight = '90px';
      ad.dataset.adClient = slot.dataset.adsenseClient;
      ad.dataset.adSlot = slot.dataset.adsenseSlot;
      ad.dataset.adFormat = 'auto';
      ad.dataset.fullWidthResponsive = 'true';
      slot.appendChild(ad);
      slot.dataset.adsenseReady = 'true';
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        slot.dataset.adsenseReady = 'false';
        slot.innerHTML = '';
        console.debug('[Spopeer AdSense] slot render failed', error);
      }
    });
  }

  async function init() {
    if (initialized) return;
    var slots = getSlots();
    if (!slots.length) return;

    try {
      var response = await fetch('/api/config/public', { credentials: 'same-origin' });
      if (!response.ok) return;
      var payload = await response.json();
      var config = payload && payload.data ? payload.data.adsense : null;
      if (!config || !config.enabled || !config.clientId) return;

      slots.forEach(function (slot) {
        slot.dataset.adsenseClient = config.clientId;
        var key = slot.dataset.adsenseSlotKey || '';
        var configuredSlot = config.slots && config.slots[key];
        if (!slot.dataset.adsenseSlot && configuredSlot) slot.dataset.adsenseSlot = configuredSlot;
        if (!slot.dataset.adsenseSlot) slot.hidden = true;
      });

      slots = getSlots().filter(function (slot) {
        return slot.dataset.adsenseSlot;
      });
      if (!slots.length) return;

      await loadScript(config.clientId);
      initialized = true;
      renderSlots();
    } catch (error) {
      console.debug('[Spopeer AdSense] disabled or unavailable', error);
    }
  }

  window.SpopeerAdSense = { init: init, render: renderSlots };
  document.addEventListener('DOMContentLoaded', init);
})();
