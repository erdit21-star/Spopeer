'use strict';

/**
 * Phase 6 migration:
 * Migration 007 stores ad_campaigns.format as VARCHAR, not PostgreSQL ENUM.
 * Older installations may have an enum with this name, so extend it only
 * when it actually exists. New installations need no schema change here.
 */
module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM pg_type
      WHERE typname = 'enum_ad_campaigns_format'
      LIMIT 1
    `);

    if (!rows.length) {
      return;
    }

    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_ad_campaigns_format" ADD VALUE IF NOT EXISTS \'marketplace\';'
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_ad_campaigns_format" ADD VALUE IF NOT EXISTS \'event\';'
    );
  },

  async down() {
    // PostgreSQL enum values cannot be removed safely in a reversible migration.
  }
};
