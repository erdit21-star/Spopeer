'use strict';

/**
 * Defense-in-depth for the Express + Sequelize architecture.
 *
 * The browser must use the Express API, not Supabase's public table API.
 * Enable RLS and remove direct table/sequence privileges from Supabase
 * anon/authenticated roles. The database owner used by Sequelize continues
 * to manage the schema and data; no permissive RLS policies are created.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        tbl record;
      BEGIN
        FOR tbl IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
        LOOP
          EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
        END LOOP;
      END
      $$;
    `);

    await queryInterface.sequelize.query(
      'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated'
    );
    await queryInterface.sequelize.query(
      'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated'
    );
    await queryInterface.sequelize.query(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated'
    );
    await queryInterface.sequelize.query(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated'
    );
  },

  // Intentionally do not reverse this hardening: doing so would reopen direct
  // public API access to private account, message, session, and moderation data.
  async down() {
    return undefined;
  }
};
