/**
 * Migration 011: Add performance indexes on users table.
 *
 * Covers columns frequently used in WHERE / ORDER BY queries:
 *   - email    (login, forgot-password — unique already defined by model, add explicit)
 *   - role     (search, admin filters)
 *   - isActive (soft-delete filter)
 *   - sport    (search, filtering)
 *
 * Safe to re-run — swallows "already exists" errors.
 */
'use strict';

module.exports = {
  async up(queryInterface) {
    async function safeIndex(table, columns, options) {
      try {
        await queryInterface.addIndex(table, columns, options);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) return;
        throw err;
      }
    }

    await safeIndex('users', ['email'], {
      unique: true,
      name: 'idx_users_email_unique',
    });
    await safeIndex('users', ['role'], {
      name: 'idx_users_role',
    });
    await safeIndex('users', ['isActive'], {
      name: 'idx_users_isActive',
    });
    await safeIndex('users', ['sport'], {
      name: 'idx_users_sport',
    });
    await safeIndex('users', ['isActive', 'role'], {
      name: 'idx_users_active_role',
    });
  },

  async down(queryInterface) {
    const indexes = [
      ['users', 'idx_users_email_unique'],
      ['users', 'idx_users_role'],
      ['users', 'idx_users_isActive'],
      ['users', 'idx_users_sport'],
      ['users', 'idx_users_active_role'],
    ];

    for (const [table, name] of indexes) {
      try {
        await queryInterface.removeIndex(table, name);
      } catch {
        // ignore if already removed
      }
    }
  },
};
