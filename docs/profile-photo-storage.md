# Profile Photo Storage (Avatar and Cover)

This document defines where user photos are stored when uploaded from profile-related UIs.

## Upload Endpoints

- Avatar upload: `POST /api/users/avatar`
- Cover upload: `POST /api/users/cover`

Both routes are implemented in `server/routes/users.js`.

## Persistence Logic

Upload persistence is centralized in `server/middleware/upload.js` using `persistFile(file, folder, userId)`.

### Production

- Provider: Cloudinary (required)
- Cloud folder names:
  - Avatars: `spopeer/avatars`
  - Covers: `spopeer/covers`
- Returned URL (secure) is saved into user profile fields:
  - Avatar -> `avatarUrl`
  - Cover -> `coverPhotoUrl`

If Cloudinary is not configured in production, upload is rejected with `CLOUDINARY_NOT_CONFIGURED`.

### Local/Development Fallback

- Provider: local disk fallback (when Cloudinary is not configured)
- Local folder root: `server/uploads`
- Public static route: `/uploads`
- Effective file paths:
  - Avatar files: `server/uploads/avatars/...`
  - Cover files: `server/uploads/covers/...`
- Served URLs:
  - `/uploads/avatars/<filename>`
  - `/uploads/covers/<filename>`

Static mount is configured in `server/app.js` via:

`app.use('/uploads', express.static(path.join(__dirname, 'uploads')));`

## Frontend Call Sites

- API methods in `public/js/api.js`:
  - `uploadAvatar(file)` -> `/api/users/avatar`
  - `uploadCover(file)` -> `/api/users/cover`
- Feed card (sidebar) avatar upload is wired in `public/feed.html`.
- Cover upload flow is handled by `ProfileSyncService` in `public/js/profile-sync-service.js`.

## Source of Truth Fields

- User avatar URL field: `avatarUrl`
- User cover URL field: `coverPhotoUrl`

All profile UIs should read these normalized fields first.
