'use strict';

const COLUMNS = [
  { name: 'userType', sql: "VARCHAR(40)" },
  { name: 'cardStyle', sql: "VARCHAR(80)" },
  { name: 'ogImageUrl', sql: 'TEXT' },
  { name: 'ogImageUpdatedAt', sql: 'TIMESTAMPTZ' },
  { name: 'publicSlug', sql: 'VARCHAR(120) UNIQUE' },
  { name: 'clubName', sql: 'VARCHAR(180)' },
  { name: 'country', sql: 'VARCHAR(120)' },
  { name: 'city', sql: 'VARCHAR(120)' },
  { name: 'age', sql: 'INTEGER' },
  { name: 'height', sql: 'VARCHAR(80)' },
  { name: 'weight', sql: 'VARCHAR(80)' },
  { name: 'dominantSide', sql: 'VARCHAR(80)' },
  { name: 'headline', sql: 'VARCHAR(255)' },
  { name: 'profilePhotoUrl', sql: 'TEXT' },
  { name: 'clubLogoUrl', sql: 'TEXT' },
  { name: 'rating', sql: 'DECIMAL(4,2) NOT NULL DEFAULT 0' },
  { name: 'services', sql: "JSONB DEFAULT '[]'" }
];

module.exports = {
  async up(queryInterface) {
    for (const col of COLUMNS) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE users ADD COLUMN IF NOT EXISTS "${col.name}" ${col.sql};`
        );
      } catch (err) {
        if (!(err.message && err.message.includes('already exists'))) {
          throw err;
        }
      }
    }
  },

  async down() {
    // additive migration
  }
};
