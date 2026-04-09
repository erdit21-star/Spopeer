# GitHub to Render Deployment Flow

Use this release flow for safe, incremental production deployments.

## Render Service Settings
- Root directory: project root
- Build command: `npm install && cd server && npm install`
- Start command: `cd server && npx sequelize-cli db:migrate && node server.js`
- Health check path: `/api/ready`
- Environment: `NODE_ENV=production`

## Required Environment Variables
- `JWT_SECRET`
- `DATABASE_URL` (or `DB_HOST` + DB credentials)
- `APP_URL`
- `FRONTEND_URL`
- `RESEND_API_KEY`

Recommended:
- `REDIS_URL` (enables distributed cache/rate-limit store)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `SENTRY_DSN`

## Release Steps (Per Phase/PR)
1. Create a focused branch (one phase or one bullet point).
2. Run local checks:
   - `npm run lint`
   - `cd server && npm test`
3. Open PR and confirm CI is green.
4. Merge to default branch.
5. Verify Render deploy logs:
   - migrations run successfully
   - app starts and passes readiness checks
6. Post-deploy smoke checks:
   - `GET /api/health`
   - `GET /api/ready`
   - auth flow (login/refresh/logout)
   - one create/read path for posts/events
7. Monitor metrics/logs for 10-15 minutes:
   - `/api/metrics`
   - error logs / Sentry events

## Rollback
- Re-deploy previous successful commit from Render dashboard.
- If schema migration caused breakage, follow `docs/ROLLBACK.md`.
