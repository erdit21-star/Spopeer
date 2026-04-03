# Production Checklist

Complete all items before allowing real user traffic.

## Security
- [ ] `server/.env` removed from repo and archives
- [ ] All secrets rotated (JWT_SECRET, DB passwords, API keys)
- [ ] Auth uses HttpOnly cookies (not localStorage tokens)
- [ ] CSP headers reviewed and tested
- [ ] Rate limits verified on all endpoints
- [ ] Authorization checks tested (role-based access)
- [ ] CORS configured for production domain only

## Email
- [ ] RESEND_API_KEY set in production environment
- [ ] Verification email works end-to-end
- [ ] Password reset email works end-to-end
- [ ] Email failures are logged and visible
- [ ] EMAIL_FROM set to verified domain

## Database
- [ ] Migrations pass on fresh database
- [ ] Migrations pass on existing database
- [ ] Backups enabled (daily minimum)
- [ ] Restore tested at least once
- [ ] Indexes reviewed for hot queries
- [ ] Connection pooling configured

## Testing
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] Staging E2E tests pass (Playwright)
- [ ] Upload tests pass (file size + type limits)
- [ ] Auth tests pass (signup/login/reset/verify)

## Operations
- [ ] `/api/health` endpoint working
- [ ] `/api/ready` endpoint working
- [ ] Structured JSON logs enabled
- [ ] Request timing logged (method, path, status, duration)
- [ ] Error monitoring configured (Sentry/similar)
- [ ] Alerts configured for 5xx rate spikes
- [ ] Graceful shutdown tested

## Release
- [ ] CI pipeline green
- [ ] Staging deploy passes
- [ ] Rollback plan documented (see ROLLBACK.md)
- [ ] Limited rollout / canary planned
- [ ] Team notified of release

## Environment Variables (Production)
Required:
- `NODE_ENV=production`
- `JWT_SECRET` (strong random, ≥64 chars)
- `DATABASE_URL` (postgres:// connection string)
- `RESEND_API_KEY` (Resend email service)
- `APP_URL` (public URL of the app)
- `FRONTEND_URL` (for CORS)

Optional:
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `EMAIL_FROM` (defaults to noreply@spopeer.com)
- `PORT` (defaults to 5000)
