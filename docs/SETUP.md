# Setup & Run (Local)

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- PostgreSQL 16+

## Local run

1. Copy `server/.env.example` to `server/.env` and fill in your credentials
2. Start PostgreSQL (or use `docker-compose up db`)
3. Install dependencies:
   ```bash
   npm run install:all
   ```
4. Run database migrations:
   ```bash
   cd server && npm run migrate
   ```
5. Seed optional demo data:
   ```bash
   cd server && npm run seed
   ```
6. Start the app:
   ```bash
   npm run dev
   ```
7. Open `http://localhost:5000`

## Docker (alternative)

```bash
docker-compose up
```

This starts both PostgreSQL and the app. Open `http://localhost:5000`.

## Required environment variables

See `server/.env.example` for the full list grouped by category:
- **App**: `PORT`, `NODE_ENV`, `APP_URL`, `FRONTEND_URL`
- **Database**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **Auth**: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Uploads**: `UPLOAD_DIR`, `MAX_FILE_SIZE`
- **Cloudinary**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Email**: `RESEND_API_KEY`, `EMAIL_FROM`

## Verification

```bash
npm run verify
```

This runs syntax check, lint, and tests in sequence.

## Notes

- Never commit `server/.env` — it is excluded by `.gitignore`.
- Configure `RAILWAY_TOKEN` in GitHub repository Secrets to enable auto-deploy.

