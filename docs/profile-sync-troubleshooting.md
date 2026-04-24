# Profile Sync Troubleshooting Guide

This document explains how to diagnose and fix common problems with profile data sync between the edit-profile page and the public profile page.

---

## Architecture Overview

```
edit-profile.html
  └── saveSection()
        ├── ProfileSchema.validate() — guards bad payloads
        ├── ProfileNormalizer.withProfileTimestamp() — stamps _profileUpdatedAt
        ├── POST /api/profiles — persists to server
        └── dispatchEvent('profileUpdated') — notifies local tabs

ProfileSyncService (profile-sync-service.js)
  └── listens to 'profileUpdated' → broadcasts 'profileSyncUpdated'

public-profile.html  (logic in public/js/public-profile.js)
  └── listens to 'profileSyncUpdated'
        ├── matchesViewedProfile() — guards wrong-profile updates
        ├── isIncomingNewer() — guards stale updates
        └── updateUI() + applyCardStyle() — re-renders card
```

---

## Common Problems

### 1. Side card shows stale data after saving the profile

**Symptom:** Edit-profile saves successfully but the public profile still shows old values.

**Causes & fixes:**

| Cause | Diagnosis | Fix |
|---|---|---|
| `profileSyncUpdated` event not reaching the page | Open DevTools → Console, type `window.dispatchEvent(new CustomEvent('profileSyncUpdated', { detail: { profile: JSON.parse(localStorage.getItem('spopeer_user')), timestamp: Date.now() } }))` and check if the card updates | Ensure `ProfileSyncService.init()` is called on public-profile.html load |
| `_profileUpdatedAt` missing from saved payload | In Console: `JSON.parse(localStorage.getItem('spopeer_user'))._profileUpdatedAt` — if undefined, timestamp is not being set | Verify `normalizeProfileForSave()` is called in `saveSection()` |
| Stale timestamp guard rejecting the update | Look for `"Ignored stale profile update"` in the browser console | Clear localStorage: `localStorage.removeItem('spopeer_user')` then re-save profile |
| Wrong-profile guard rejecting the update | Look for `"Ignored update for different profile"` in console | Verify `userId` URL param matches the logged-in user's `id` or `email` |

---

### 2. "Stale update" toast appears when navigating to own profile

**Symptom:** A black toast badge appears saying "Update ignored: older than current data".

**Cause:** The `_profileUpdatedAt` in the sync event is older than the timestamp already applied on page load.

**Fix:** This is usually benign — it means the page loaded fresh data after the last sync. If it fires repeatedly, clear the stale timestamp by logging out and back in, or by deleting `localStorage.getItem('spopeer_user')._profileUpdatedAt`.

---

### 3. Role-specific fields are not showing on the card

**Symptom:** A coach sees "Sport" and "Location" but not "Specialty" or "Style".

**Causes & fixes:**

| Cause | Diagnosis | Fix |
|---|---|---|
| `userType` field is missing or set to `athlete` | Console: `JSON.parse(localStorage.getItem('spopeer_user')).userType` | Re-save profile with correct role selection |
| Field hidden by privacy settings | Check `visibility` field in stored user object | Go to Settings → Privacy and set the field to "Public" |
| Field not saved (wrong key name) | Check what key the edit-profile page saves under | ProfileNormalizer handles aliases — check `public/js/profile-normalizer.js` |

---

### 4. Card variant is wrong (shows card-stack when sports-card was selected)

**Symptom:** Profile consistently loads the wrong card variant.

**Diagnosis:**
```javascript
console.log(JSON.parse(localStorage.getItem('spopeer_user')).profileCardStyle);
```

**Fix:** If the field is missing, save the profile again with the card style selector visible. If it's present but not applied, check `applyCardStyle()` in `public/js/public-profile.js`.

---

### 5. Identifier mismatch (update rejected for "different profile")

**Symptom:** Console shows `"Ignored update for different profile"` when editing own profile.

**Cause:** The `userId` URL parameter does not match `id`, `userId`, `email`, or `userEmail` in the stored profile.

**Debug:**
```javascript
// In public-profile.html DevTools console:
const userId = new URLSearchParams(location.search).get('userId');
const profile = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
const ids = [profile.id, profile.userId, profile.email, profile.userEmail]
  .filter(Boolean).map(v => String(v).toLowerCase());
console.log('URL userId:', userId, '| Profile identifiers:', ids);
console.log('Match:', ids.includes(String(userId).toLowerCase()));
```

**Fix:** Navigate to the profile using the numeric `?userId=123` parameter (your user ID) or your registered email address.

---

### 6. Profile data not updating via `/api/auth/me` fallback

**Symptom:** Own profile loads from localStorage but shows old data even after re-login.

**Fix:**
1. Open DevTools → Application → Local Storage
2. Delete `spopeer_user`
3. Reload the page — it will fetch fresh data from `/api/auth/me`

---

## Debug Logging

Profile sync logs debug messages to the browser console when:

- An update is applied: `[Spopeer][ProfileSync] Applied update ts=...`
- An update is rejected (wrong profile): `[Spopeer][ProfileSync] Ignored update for different profile`
- An update is rejected (stale): `[Spopeer][ProfileSync] Ignored stale profile update`

To see all sync events in real time:
```javascript
window.addEventListener('profileSyncUpdated', e => console.log('SYNC EVENT', e.detail));
window.addEventListener('profileUpdated', e => console.log('PROFILE SAVED', e.detail));
window.addEventListener('spopeer:analytics', e => console.log('ANALYTICS', e.detail));
```

---

## Analytics Events

The following custom events are dispatched on `window` (via `spopeer:analytics`):

| Event | Fired when |
|---|---|
| `profile:view` | Profile page loads and renders successfully |
| `profile:view:blocked` | Profile is private — blocked from rendering |
| `profile:card:variant` | A card variant (card-stack/minimal-list/sports-card) is rendered |
| `profile:fields:hidden` | Some fields are hidden from visitors due to privacy settings |
| `profile:sync:applied` | A sync update was accepted and applied |
| `profile:sync:stale_ignored` | A sync update was rejected as stale |
| `profile:sync:rejected` | A sync update was rejected for a different reason (wrong profile) |

---

## localStorage Keys Reference

| Key | Contents |
|---|---|
| `spopeer_user` | Authenticated user's profile object (canonical) |
| `spopeer_settings` | User settings (privacy, notifications, etc.) |
| `spopeer_loggedIn` | `"true"` when a session exists |
| `spopeer_profile_cache_<email>` | Cached profile data for a specific user |
| `_profileLastUpdated_` | Timestamp of last profile save |
| `_spopeer_migrated_v` | localStorage migration version number |

---

## Running Tests

```bash
# Unit tests for ProfileNormalizer
cd server && npx jest tests/profile-normalizer.test.js

# Contract tests for /api/users/:id and /api/profiles
cd server && npx jest tests/integration/profile-api.contract.test.js

# E2E sync tests (requires Playwright)
npx playwright install chromium
npx playwright test e2e/profile-card-sync.spec.js

# Visual regression snapshots (update baselines)
npx playwright test e2e/profile-card-snapshots.spec.js --update-snapshots
```
