/**
 * Schema Audit Script
 *
 * Validates that all tables and columns required for production
 * are present in the connected database. Exits with code 1 on failure.
 *
 * Usage:
 *   cd server
 *   node scripts/schema-audit.js
 *
 * Set DATABASE_URL (or DATABASE_DIRECT_URL / DB_HOST) before running.
 */
'use strict';

require('../config/env');
const { sequelize } = require('../config/database');

// ─── REQUIRED SCHEMA ───────────────────────────────────────────────────────
const REQUIRED = [
  {
    table: 'users',
    columns: [
      'id', 'email', 'password', 'role', 'isActive',
      'emailVerified', 'emailVerifyToken', 'emailVerifyExpiresAt',
      'privacyPolicyAcceptedAt', 'termsOfServiceAcceptedAt', 'marketingConsentAt',
      'firstName', 'lastName', 'username', 'avatarUrl', 'sport'
    ]
  },
  {
    table: 'password_reset_tokens',
    columns: ['id', 'userId', 'tokenHash', 'expiresAt', 'usedAt']
  },
  {
    table: 'refresh_sessions',
    columns: ['id', 'userId', 'tokenHash', 'expiresAt', 'revokedAt', 'userAgent', 'ipAddress']
  },
  {
    table: 'posts',
    columns: ['id', 'userId', 'content', 'mediaUrl', 'visibility', 'createdAt', 'updatedAt']
  },
  {
    table: 'messages',
    columns: ['id', 'senderId', 'receiverId', 'content', 'createdAt', 'readAt']
  }
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
function pass(msg) { console.log(`  ✔  ${msg}`); }
function warn(msg) { console.warn(`  ⚠  ${msg}`); }
function fail(msg) { console.error(`  ✖  ${msg}`); }

async function describeTableSafe(qi, table) {
  try {
    return await qi.describeTable(table);
  } catch (err) {
    return null; // table does not exist
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  let exitCode = 0;
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Spopeer Schema Audit');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await sequelize.authenticate();
    pass('Database connection established.');
  } catch (err) {
    fail(`Cannot connect to database: ${err.message}`);
    process.exit(1);
  }

  const qi = sequelize.getQueryInterface();

  for (const { table, columns } of REQUIRED) {
    console.log(`\nTable: ${table}`);
    const desc = await describeTableSafe(qi, table);

    if (!desc) {
      fail(`Table '${table}' does not exist! Run migrations: npm run migrate`);
      exitCode = 1;
      continue;
    }

    const existingColumns = Object.keys(desc);
    const missing = columns.filter((col) => !existingColumns.includes(col));

    if (missing.length === 0) {
      pass(`All required columns present (${columns.length} checked).`);
    } else {
      missing.forEach((col) => {
        fail(`Missing column: ${table}.${col}`);
      });
      exitCode = 1;
    }
  }

  // ─── INDEXES (advisory only — warn but don't fail) ────────────────────────
  console.log('\n─── Advisory: Key Indexes ───────────────────────────────');
  const advisoryIndexes = [
    { table: 'users', column: 'email' },
    { table: 'users', column: 'username' },
    { table: 'posts', column: 'userId' },
    { table: 'messages', column: 'senderId' },
    { table: 'messages', column: 'receiverId' },
    { table: 'refresh_sessions', column: 'userId' },
    { table: 'refresh_sessions', column: 'tokenHash' }
  ];

  for (const { table, column } of advisoryIndexes) {
    try {
      const indexes = await qi.showIndex(table);
      const hasIndex = indexes.some((idx) =>
        (idx.fields || []).some((f) => (f.attribute || f) === column)
      );
      if (hasIndex) {
        pass(`Index on ${table}.${column}`);
      } else {
        warn(`No index on ${table}.${column} — consider adding one for performance.`);
      }
    } catch {
      warn(`Could not check indexes for ${table}.`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  if (exitCode === 0) {
    console.log('  Schema audit PASSED.\n');
  } else {
    console.error('  Schema audit FAILED. Run migrations and re-check.\n');
  }

  await sequelize.close();
  process.exit(exitCode);
})();
