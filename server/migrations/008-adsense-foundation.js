'use strict';

/**
 * Phase 6 migration:
 * Existing installations may already have the ad format enum created by
 * migration 007. Add the Phase 4 marketplace/event formats safely.
 */
module.exports = {
  async up(queryInterface) {
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
