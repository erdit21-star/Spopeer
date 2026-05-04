'use strict';

/**
 * Small production-safe database repair helpers.
 *
 * This is intentionally narrow. It does not replace migrations; it only repairs
 * schema drift that is already blocking live requests on Render/Supabase.
 */

async function columnExists(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
        AND column_name = :columnName
      LIMIT 1
    `,
    { replacements: { tableName, columnName } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensurePostColumns(sequelize) {
  const repairs = [];

  if (!(await columnExists(sequelize, 'posts', 'type'))) {
    await sequelize.query(`ALTER TABLE "posts" ADD COLUMN "type" VARCHAR(30) NOT NULL DEFAULT 'post';`);
    repairs.push('posts.type');
  }

  if (!(await columnExists(sequelize, 'posts', 'pollOptions'))) {
    await sequelize.query(`ALTER TABLE "posts" ADD COLUMN "pollOptions" JSONB DEFAULT NULL;`);
    repairs.push('posts.pollOptions');
  }

  if (!(await columnExists(sequelize, 'posts', 'pollVotes'))) {
    await sequelize.query(`ALTER TABLE "posts" ADD COLUMN "pollVotes" JSONB DEFAULT NULL;`);
    repairs.push('posts.pollVotes');
  }

  if (repairs.length) {
    console.warn('[DB_REPAIR] Added missing columns:', repairs.join(', '));
  } else {
    console.log('[DB_REPAIR] posts table columns ok');
  }

  return repairs;
}

async function runDatabaseRepairs(sequelize) {
  try {
    await ensurePostColumns(sequelize);
  } catch (error) {
    console.error('[DB_REPAIR] Failed:', error && error.message ? error.message : error);
    throw error;
  }
}

module.exports = {
  runDatabaseRepairs,
  ensurePostColumns
};
