# Backup & Restore

## Automated Backups (Render)
Render's managed PostgreSQL includes automatic daily backups.
- Retained for 7 days (free tier) or 30 days (paid)
- Accessible via Render dashboard → Database → Backups

## Manual Backup

### Using pg_dump
```bash
# Full database dump
pg_dump $DATABASE_URL --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Schema only
pg_dump $DATABASE_URL --schema-only --file=schema_backup.sql

# Data only
pg_dump $DATABASE_URL --data-only --file=data_backup.sql
```

### Using Render CLI (if available)
```bash
render postgres backup create --database your-db-id
```

## Restore

### From pg_dump file
```bash
# Restore to a database (CAUTION: overwrites existing data)
pg_restore --clean --if-exists --no-owner --dbname=$DATABASE_URL backup.dump

# Restore schema only
psql $DATABASE_URL < schema_backup.sql
```

### From Render backup
1. Go to Render dashboard → Database → Backups
2. Select the backup to restore
3. Click "Restore"
4. Wait for the database to restart

## Backup Schedule (Recommended)
- **Daily**: Automated via Render or a cron job
- **Before migrations**: Manual backup before running `db:migrate`
- **Before major releases**: Manual backup with version tag
- **Weekly**: Download and store a copy off-platform

## Testing Restores
1. Create a test database instance
2. Restore the latest backup to it
3. Run `npx sequelize-cli db:migrate` to verify schema
4. Spot-check key tables (users, posts)
5. Document the test date and result

## Data Retention
- Keep at least 30 days of daily backups
- Keep monthly backups for 1 year
- Encrypt backups at rest and in transit
