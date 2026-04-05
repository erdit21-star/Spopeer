// Updated
/**
 * SpopeerSports — single sports data loader.
 * Fetches from /data/list-of-sports.txt once, caches in memory.
 * Replaces the ~300-line hardcoded sports array in main.js.
 */
(function () {
  'use strict';

  var cache = null;

  async function getSports() {
    if (cache) return cache;
    var res = await fetch('/data/list-of-sports.txt');
    var text = await res.text();
    cache = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    return cache;
  }

  async function fillSelect(select, placeholder) {
    if (!select) return;
    placeholder = placeholder || 'Select your sport';
    var sports = await getSports();
    select.innerHTML = '<option value="">' + placeholder + '</option>';
    sports.forEach(function (sport) {
      var opt = document.createElement('option');
      opt.value = sport;
      opt.textContent = sport;
      select.appendChild(opt);
    });
  }

  /** Fill all <select class="sport-select"> on the page. */
  async function fillAll() {
    var selects = document.querySelectorAll('select.sport-select');
    for (var i = 0; i < selects.length; i++) {
      await fillSelect(selects[i]);
    }
  }

  window.SpopeerSports = {
    getSports: getSports,
    fillSelect: fillSelect,
    fillAll: fillAll
  };
})();
