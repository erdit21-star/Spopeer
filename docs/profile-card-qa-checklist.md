# Profile Card QA Checklist

Use this checklist before releasing profile-card changes.

## Navigation and Data Source

- [ ] From Home -> Feed -> user chip -> View Profile opens the public profile page for the expected user.
- [ ] Side card values come from the canonical profile payload (API/current profile), not stale localStorage aliases.
- [ ] Updates made in edit-profile are reflected on public-profile without a hard refresh.

## Card Variants

- [ ] `card-stack`, `minimal-list`, and `sports-card` all render with the same core compact data set.
- [ ] Role-aware labels are correct for athlete, coach, club, and supportive professional.
- [ ] Empty values show role-aware placeholders and do not break layout.

## Privacy

- [ ] Fields marked private in `visibility` never show values in side-card variants.
- [ ] Public fields remain visible in all active variants.
- [ ] Own-profile and visitor-profile privacy behavior is correct.

## Sync and Consistency

- [ ] Incoming `profileSyncUpdated` events are ignored when they target a different profile.
- [ ] Older updates are ignored when `_profileUpdatedAt` is older than the last applied timestamp.
- [ ] Logs show enough context to debug ignored updates (identifier mismatch, stale timestamp).

## Regression

- [ ] Viewing another user profile remains stable while current-user profile updates in another tab.
- [ ] Switching card style in edit-profile immediately affects public-profile card selection.
- [ ] No console errors appear during the flow.
