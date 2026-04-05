<!-- Updated  -->
# Staging Release Rehearsal Checklist

Use this checklist before every production deploy. Run against the **staging** environment.

## 1. Pre-deploy

- [ ] All CI checks pass (lint, unit tests, real-DB tests, smoke boot)
- [ ] Migrations list is correct: `npx sequelize-cli db:migrate:status`
- [ ] Environment variables set on staging: `JWT_SECRET`, `DATABASE_URL`, `SENTRY_DSN`, `RESEND_API_KEY`, `FRONTEND_URL`
- [ ] Backup staging database: `pg_dump $DATABASE_URL > backup-$(date +%F).sql`

## 2. Deploy + Migrate

- [ ] Deploy new code to staging
- [ ] Run migrations: `npx sequelize-cli db:migrate`
- [ ] Verify migration output — no errors, all migrations applied
- [ ] Verify `refresh_sessions` table exists: `\dt refresh_sessions` in psql

## 3. Auth flows

- [ ] **Signup**: Create new account → user row in DB, `isActive: true`, `emailVerified: false`
- [ ] **Verification email**: Check inbox (or logs) for verification email delivery
- [ ] **Login**: Log in with new account → receives `access_token` + `refresh_token` cookies
- [ ] **GET /api/auth/me**: Returns user data with valid cookie
- [ ] **Token refresh**: POST `/api/auth/refresh` → new cookies issued, old session revoked in DB
- [ ] **Logout**: POST `/api/auth/logout` → cookies cleared, `RefreshSession.revokedAt` set
- [ ] **Change password**: Changes hash in DB, revokes all sessions, old password rejected
- [ ] **Forgot password**: Sends reset email, returns 200 for both known and unknown emails
- [ ] **Reset password**: Token consumed, password changed, all sessions revoked

## 4. Core features

- [ ] **View feed / posts**: GET `/api/posts` returns data
- [ ] **Create post**: POST `/api/posts` with auth → post appears in feed
- [ ] **Profile view**: GET `/api/users/:id` returns user profile
- [ ] **Profile update**: PUT `/api/users/:id` with auth → bio/avatar updated
- [ ] **Upload**: Upload an image → stored successfully (Cloudinary or local)
- [ ] **Search**: GET `/api/search?q=...` returns relevant results

## 5. Observability

- [ ] **Health**: GET `/api/health` → `{ success: true, data: { status: 'ok' } }`
- [ ] **Readiness**: GET `/api/ready` → `{ success: true, data: { checks: { database: 'ok', secrets: 'ok' } } }`
- [ ] **Sentry**: Trigger a test error → appears in Sentry dashboard
- [ ] **Structured logs**: Check log output for JSON structured request logs
- [ ] **5xx monitoring**: Confirm alerting is set up for error spikes

## 6. Rollback verification

- [ ] Roll back the deploy to previous version
- [ ] Undo migration: `npx sequelize-cli db:migrate:undo --name 010-create-refresh-sessions.js`
- [ ] Verify app still runs on previous code
- [ ] Re-deploy the new version and re-run migrations
- [ ] Confirm everything works again

## 7. Database restore verification

- [ ] Restore from the backup taken in step 1:
  ```
  psql $DATABASE_URL < backup-YYYY-MM-DD.sql
  ```
- [ ] Verify data integrity after restore
- [ ] Re-run migrations if needed

## 8. Sign-off

- [ ] All items above checked
- [ ] Date: ___________
- [ ] Signed off by: ___________

---

**After staging passes**: merge to production, run the same migration + smoke test sequence.
