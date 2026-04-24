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

      // ── v1: rename old user-data key if present ──────────────────────────
      if (ver < 1) {
        var oldKey = 'currentUser'; // legacy key used before v0.9
        var raw = localStorage.getItem(oldKey);
        if (raw && !localStorage.getItem('spopeer_user')) {
          try {
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              localStorage.setItem('spopeer_user', raw);
              localStorage.removeItem(oldKey);
              console.info('[Spopeer][Migration] Migrated "currentUser" → "spopeer_user"');
            }
          } catch (e) { /* ignore parse errors */ }
        }

        // Also rename 'user' legacy key
        var oldUser = localStorage.getItem('user');
        if (oldUser && !localStorage.getItem('spopeer_user')) {
          try {
            var parsedUser = JSON.parse(oldUser);
            if (parsedUser && typeof parsedUser === 'object' && parsedUser.email) {
              localStorage.setItem('spopeer_user', oldUser);
              localStorage.removeItem('user');
              console.info('[Spopeer][Migration] Migrated "user" → "spopeer_user"');
            }
          } catch (e) { /* ignore */ }
        }
      }

      // ── v2: normalise field aliases inside spopeer_user ──────────────────
      if (ver < 2) {
        var userRaw = localStorage.getItem('spopeer_user');
        if (userRaw) {
          try {
            var userData = JSON.parse(userRaw);
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
                localStorage.setItem('spopeer_user', JSON.stringify(userData));
                console.info('[Spopeer][Migration] Normalised field aliases in spopeer_user');
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
