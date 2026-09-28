/**
 * public/js/profile-migration.js
 * Runs on page load to backfill / normalise legacy localStorage keys
 * to the canonical shape expected by ProfileNormalizer.
 *
 * Safe to include on any page — guards against missing APIs and
 * never throws errors that could break the page.
 */
(function () {
  'use strict';

  var MIGRATION_VERSION_KEY = '_spopeer_migrated_v';
  var CURRENT_VERSION = 2;

  function run() {
    try {
      var ver = parseInt(localStorage.getItem(MIGRATION_VERSION_KEY) || '0', 10) || 0;
      if (ver >= CURRENT_VERSION) return; // already migrated

      // CurrentUserStore owns legacy user-key migration. This file only
      // normalises legacy field aliases after the canonical user is available.

      // ── v2: normalise field aliases inside spopeer_user ──────────────────
      if (ver < 2) {
        var userData = null;
        if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
          userData = window.CurrentUserStore.getCurrentUser() || null;
        }
        if (userData) {
          try {
            if (userData && typeof userData === 'object') {
              var changed = false;

              // sport → primarySport
              if (userData.sport && !userData.primarySport) {
                userData.primarySport = userData.sport;
                changed = true;
              }
              // primarySport → sport
              if (userData.primarySport && !userData.sport) {
                userData.sport = userData.primarySport;
                changed = true;
              }
              // sportsLevel → playingLevel
              if (userData.sportsLevel && !userData.playingLevel) {
                userData.playingLevel = userData.sportsLevel;
                changed = true;
              }
              // sportsYears / profExperience → experience
              if (!userData.experience) {
                var expRaw = userData.sportsYears || userData.profExperience ||
                             userData.yearsOfExperience || userData.yearsOfCoaching;
                if (expRaw !== undefined && expRaw !== null && expRaw !== '') {
                  userData.experience = expRaw;
                  changed = true;
                }
              }
              // contactEmail → profEmail / clubEmail fallback
              if (userData.contactEmail) {
                if (!userData.profEmail) { userData.profEmail = userData.contactEmail; changed = true; }
                if (!userData.clubEmail)  { userData.clubEmail  = userData.contactEmail; changed = true; }
              }
              // website → clubWebsite for clubs
              if (userData.website && !userData.clubWebsite && userData.userType === 'club') {
                userData.clubWebsite = userData.website;
                changed = true;
              }
              // Remove stale profile cache entries older than 24 h
              var cachePrefix = 'spopeer_profile_cache_';
              var cutoff = Date.now() - 86400000; // 24 h
              Object.keys(localStorage).forEach(function (k) {
                if (k.indexOf(cachePrefix) === 0) {
                  try {
                    var cached = JSON.parse(localStorage.getItem(k) || '{}');
                    if (cached._profileUpdatedAt && cached._profileUpdatedAt < cutoff) {
                      localStorage.removeItem(k);
                      console.info('[Spopeer][Migration] Removed stale profile cache: ' + k);
                    }
                  } catch (e) { /* ignore */ }
                }
              });

              if (changed) {
                if (window.CurrentUserStore && typeof window.CurrentUserStore.setCurrentUser === 'function') {
                  window.CurrentUserStore.setCurrentUser(userData);
                  console.info('[Spopeer][Migration] Normalised legacy profile field aliases');
                }
              }
            }
          } catch (e) { /* ignore */ }
        }
      }

      localStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_VERSION));
    } catch (e) {
      // Migration must never break the page
      console.warn('[Spopeer][Migration] Error during localStorage migration:', e);
    }
  }

  // Run immediately (synchronous, fast)
  run();
})();
