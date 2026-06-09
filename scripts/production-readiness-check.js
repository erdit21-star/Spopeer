const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listMigrations() {
  const dir = path.join(root, 'server', 'migrations');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
}

const requiredEnv = [
  'NODE_ENV',
  'APP_URL',
  'FRONTEND_URL',
  'DATABASE_DIRECT_URL',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'CONTACT_TO_EMAIL'
];

const recommendedEnv = [
  'SENTRY_DSN',
  'BACKUP_CRON_SCHEDULE',
  'BACKUP_TARGET',
  'LOG_LEVEL'
];

const renderYaml = read('render.yaml');

function hasEnvKey(yaml, key) {
  return new RegExp(`- key:\\s*${key}(\\n|\\r)`, 'm').test(yaml);
}

let failed = false;

console.log('=== Production Readiness Check ===');
console.log('');

console.log('Required env keys in render.yaml:');
for (const key of requiredEnv) {
  const present = hasEnvKey(renderYaml, key);
  console.log(` - ${present ? 'OK ' : 'MISS'} ${key}`);
  if (!present) failed = true;
}

console.log('');
console.log('Recommended env keys in render.yaml:');
for (const key of recommendedEnv) {
  const present = hasEnvKey(renderYaml, key);
  console.log(` - ${present ? 'OK ' : 'WARN'} ${key}`);
}

console.log('');
const migrations = listMigrations();
console.log(`Migrations found: ${migrations.length}`);
if (migrations.length === 0) {
  console.log(' - MISS No migration files detected');
  failed = true;
} else {
  console.log(` - Latest migration: ${migrations[migrations.length - 1]}`);
}

console.log('');
console.log('Backups / logs / monitoring checklist:');
console.log(' - Ensure Supabase PITR/backups enabled in Supabase dashboard');
console.log(' - Ensure Render log retention/export is configured');
console.log(' - Ensure Sentry DSN is configured for runtime error monitoring');

if (failed) {
  process.exitCode = 1;
}
