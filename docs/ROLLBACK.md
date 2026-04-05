<!-- Updated  -->
# Rollback Procedure

## Quick Rollback (Render)
1. Go to Render dashboard → your service → Deploys
2. Click on the previous successful deploy
3. Click "Rollback to this deploy"
4. Wait for the service to restart

## Git-based Rollback
```bash
# Find the last known good commit
git log --oneline -10

# Reset to previous commit (don't push yet)
git revert HEAD --no-edit

# Or revert to a specific commit
git revert <commit-hash> --no-edit

# Push the revert
git push origin main
```

## Database Migration Rollback
```bash
# Undo last migration
cd server
npx sequelize-cli db:migrate:undo

# Undo all migrations (CAUTION: drops all tables)
npx sequelize-cli db:migrate:undo:all

# Undo to a specific migration
npx sequelize-cli db:migrate:undo:all --to 002-create-all-tables.js
```

## Emergency Procedures

### App won't start
1. Check Render logs for the error
2. Verify all environment variables are set
3. Test database connectivity
4. Rollback to last working deploy

### Database issues
1. Do NOT run `db:migrate:undo:all` in production without a backup
2. Check if the latest migration can be safely reverted
3. If data loss is a risk, restore from backup instead

### Auth issues after update
1. If JWT_SECRET changed, all existing sessions are invalid
2. Users will need to log in again
3. If cookie settings changed, clear browser cookies

## Prevention
- Always test migrations on staging first
- Tag releases: `git tag v1.x.x`
- Keep backup of database before major changes
- Monitor error rate after each deploy
