'use strict';

/**
 * Migration 003: Patch legacy users table
 *
 * If the database was originally created with the old 001-create-users migration
 * (UUID id, passwordHash column, minimal columns), this migration:
 *   1. Adds all missing columns expected by the current User model
 *   2. Copies passwordHash → password for existing rows
 *   3. Backfills required NOT NULL fields with safe defaults
 *
 * Safe to run on databases that already have the new schema — every ALTER uses
 * IF NOT EXISTS on PostgreSQL.
 *
 * Run with: node server/migrations/003-patch-legacy-users.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize } = require('../models');

const COLUMNS = [
  // Core auth / identity
  { name: 'password',          sql: 'VARCHAR(255)' },
  { name: 'firstName',         sql: "VARCHAR(100) DEFAULT 'User'" },
  { name: 'lastName',          sql: "VARCHAR(100) DEFAULT 'Account'" },
  { name: 'role',              sql: "VARCHAR(50) DEFAULT 'athlete'" },
  { name: 'isActive',          sql: 'BOOLEAN DEFAULT true' },
  { name: 'lastLogin',         sql: 'TIMESTAMP NULL' },

  // Profile basics
  { name: 'sport',             sql: 'VARCHAR(100)' },
  { name: 'profession',        sql: 'VARCHAR(200)' },
  { name: 'bio',               sql: 'TEXT' },
  { name: 'location',          sql: 'VARCHAR(255)' },
  { name: 'avatarUrl',         sql: 'VARCHAR(500)' },
  { name: 'coverPhotoUrl',     sql: 'VARCHAR(500)' },

  // Counters
  { name: 'followersCount',    sql: 'INTEGER DEFAULT 0' },
  { name: 'followingCount',    sql: 'INTEGER DEFAULT 0' },
  { name: 'postsCount',        sql: 'INTEGER DEFAULT 0' },

  // Account flags
  { name: 'verified',          sql: 'BOOLEAN DEFAULT false' },
  { name: 'subscription',      sql: "VARCHAR(20) DEFAULT 'free'" },

  // Extended profile (from migration 002)
  { name: 'displayName',       sql: 'VARCHAR(150)' },
  { name: 'username',          sql: 'VARCHAR(100) UNIQUE' },
  { name: 'dateOfBirth',       sql: 'DATE' },
  { name: 'gender',            sql: 'VARCHAR(50)' },
  { name: 'nationality',       sql: 'VARCHAR(100)' },
  { name: 'contactEmail',      sql: 'VARCHAR(255)' },
  { name: 'contactPhone',      sql: 'VARCHAR(100)' },
  { name: 'contactAddress',    sql: 'TEXT' },
  { name: 'primarySport',      sql: 'VARCHAR(100)' },
  { name: 'playingLevel',      sql: 'VARCHAR(100)' },
  { name: 'position',          sql: 'VARCHAR(100)' },
  { name: 'currentTeam',       sql: 'VARCHAR(150)' },
  { name: 'achievements',      sql: 'TEXT' },
  { name: 'stats',             sql: "JSONB DEFAULT '{}'" },
  { name: 'mediaLinks',        sql: "JSONB DEFAULT '{}'" },
  { name: 'profileVisibility', sql: "VARCHAR(50) DEFAULT 'public'" },
  { name: 'sharingPreferences',sql: "JSONB DEFAULT '{}'" },
  { name: 'visibility',        sql: "JSONB DEFAULT '{}'" },
  { name: 'extendedProfile',   sql: "JSONB DEFAULT '{}'" },
  { name: 'privacyPublic',     sql: 'BOOLEAN DEFAULT true' },

  // Email verification (from migration 005)
  { name: 'emailVerified',     sql: 'BOOLEAN DEFAULT false' },
  { name: 'emailVerifyToken',  sql: 'VARCHAR(128)' }
];

async function up() {
  const qi = sequelize.getQueryInterface();

  // Step 1: Add missing columns
  console.log('\n── Step 1: Add missing columns ──');
  for (const col of COLUMNS) {
    try {
      await qi.sequelize.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS "${col.name}" ${col.sql};`
      );
      console.log(`  ✓ ${col.name}`);
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log(`  · ${col.name} (exists)`);
      } else {
        console.error(`  ✗ ${col.name}:`, err.message);
      }
    }
  }

  // Step 2: Copy passwordHash → password for legacy rows
  console.log('\n── Step 2: Copy passwordHash → password ──');
  try {
    // Check if passwordHash column exists
    const [cols] = await qi.sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'passwordHash';`
    );
    if (cols.length > 0) {
      const [, meta] = await qi.sequelize.query(
        `UPDATE users SET password = "passwordHash"
         WHERE password IS NULL AND "passwordHash" IS NOT NULL;`
      );
      console.log(`  ✓ Copied ${meta && meta.rowCount != null ? meta.rowCount : '?'} rows`);
    } else {
      console.log('  · passwordHash column not found (already on new schema)');
    }
  } catch (err) {
    console.error('  ✗ passwordHash copy:', err.message);
  }

  // Step 3: Backfill required fields
  console.log('\n── Step 3: Backfill required fields ──');
  const backfills = [
    [`UPDATE users SET "firstName" = 'User' WHERE "firstName" IS NULL;`, 'firstName'],
    [`UPDATE users SET "lastName" = 'Account' WHERE "lastName" IS NULL;`, 'lastName'],
    [`UPDATE users SET role = 'athlete' WHERE role IS NULL;`, 'role'],
    [`UPDATE users SET "isActive" = true WHERE "isActive" IS NULL;`, 'isActive'],
    [`UPDATE users SET "displayName" = COALESCE("firstName", 'User') || ' ' || COALESCE("lastName", 'Account') WHERE "displayName" IS NULL;`, 'displayName'],
    [`UPDATE users SET "emailVerified" = true WHERE "emailVerified" IS NULL;`, 'emailVerified (legacy users)']
  ];
  for (const [sql, label] of backfills) {
    try {
      const [, meta] = await qi.sequelize.query(sql);
      console.log(`  ✓ ${label}: ${meta && meta.rowCount != null ? meta.rowCount : '?'} rows`);
    } catch (err) {
      console.error(`  ✗ ${label}:`, err.message);
    }
  }

  console.log('\n✅ Legacy patch complete.\n');
}

(async () => {
  try {
    console.log('Patching legacy users table…');
    await up();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
