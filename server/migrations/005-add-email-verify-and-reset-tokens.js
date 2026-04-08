// Updated
'use strict';

/**
 * Migration 005 — Add email verification fields + password_reset_tokens table
 *
 * Adds emailVerified (BOOLEAN) and emailVerifyToken (VARCHAR) columns to users,
 * and creates the password_reset_tokens table for production-safe reset flows.
 */

module.exports = {
  async up(queryInterface) {
    console.log('Running migration 005 — email verification fields + reset tokens table...');

    // ─── Add columns to users (safe — uses IF NOT EXISTS logic via try/catch) ───
    try {
      await queryInterface.addColumn('users', 'emailVerified', {
        type: 'BOOLEAN',
        defaultValue: false
      });
      console.log('  ✅ Added users.emailVerified');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  users.emailVerified already exists, skipping.');
      } else {
        throw e;
      }
    }

    try {
      await queryInterface.addColumn('users', 'emailVerifyToken', {
        type: 'VARCHAR(128)',
        allowNull: true
      });
      console.log('  ✅ Added users.emailVerifyToken');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  users.emailVerifyToken already exists, skipping.');
      } else {
        throw e;
      }
    }

    // ─── Mark all existing users as verified (they signed up before this feature) ───
    await queryInterface.sequelize.query(
      `UPDATE users SET "emailVerified" = true WHERE "emailVerified" IS NULL OR "emailVerified" = false`
    );
    console.log('  ✅ Marked existing users as emailVerified = true');

    // ─── Create password_reset_tokens table ───
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  ✅ Created password_reset_tokens table');

    // ─── Add indexes ───
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens (token);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens (expires_at);
    `);
    console.log('  ✅ Added indexes on password_reset_tokens');

    console.log('Migration 005 complete.\n');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS password_reset_tokens;');
    try { await queryInterface.removeColumn('users', 'emailVerifyToken'); } catch (err) { console.debug('005 down: emailVerifyToken removal skipped', err.message); }
    try { await queryInterface.removeColumn('users', 'emailVerified'); } catch (err) { console.debug('005 down: emailVerified removal skipped', err.message); }
  }
};
