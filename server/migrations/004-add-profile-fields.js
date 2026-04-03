'use strict';

/**
 * Migration 004: Add extended profile fields to users table.
 */

const COLUMNS = [
  { name: 'displayName',        sql: 'VARCHAR(150)' },
  { name: 'username',           sql: 'VARCHAR(100) UNIQUE' },
  { name: 'dateOfBirth',        sql: 'DATE' },
  { name: 'gender',             sql: 'VARCHAR(50)' },
  { name: 'nationality',        sql: 'VARCHAR(100)' },
  { name: 'contactEmail',       sql: 'VARCHAR(255)' },
  { name: 'contactPhone',       sql: 'VARCHAR(100)' },
  { name: 'contactAddress',     sql: 'TEXT' },
  { name: 'primarySport',       sql: 'VARCHAR(100)' },
  { name: 'playingLevel',       sql: 'VARCHAR(100)' },
  { name: 'position',           sql: 'VARCHAR(100)' },
  { name: 'currentTeam',        sql: 'VARCHAR(150)' },
  { name: 'achievements',       sql: 'TEXT' },
  { name: 'stats',              sql: "JSONB DEFAULT '{}'" },
  { name: 'mediaLinks',         sql: "JSONB DEFAULT '{}'" },
  { name: 'profileVisibility',  sql: "VARCHAR(50) NOT NULL DEFAULT 'public'" },
  { name: 'sharingPreferences', sql: "JSONB DEFAULT '{}'" },
  { name: 'visibility',         sql: "JSONB DEFAULT '{}'" },
  { name: 'privacyPublic',      sql: "BOOLEAN NOT NULL DEFAULT true" },
  { name: 'extendedProfile',   sql: "JSONB DEFAULT '{}'" }
];

module.exports = {
  async up(queryInterface) {
    for (const col of COLUMNS) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE users ADD COLUMN IF NOT EXISTS "${col.name}" ${col.sql};`
        );
        console.log(`  ✓ ${col.name}`);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(`  · ${col.name} (already exists)`);
        } else {
          console.error(`  ✗ ${col.name}:`, err.message);
        }
      }
    }
  },

  async down() {
    // Intentionally left empty — additive migration, safe to skip rollback
  }
};
