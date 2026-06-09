'use strict';

/**
 * MVP Gap Completion Migration
 * Adds:
 *  - posts.visibility, groupId, link preview fields, status, moderation fields, hashtags, sharesCount, deletedAt
 *  - post_media table
 *  - post_shares table
 *  - user_privacy_settings table
 *  - group_members.status, invitedBy, joinedAt (role enum extended)
 *  - groups.privacy, status, ownerId, avatarUrl, rules
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── posts: add new columns ───
    const postCols = await queryInterface.describeTable('posts').catch(() => null);

    if (postCols) {
      const addIfMissing = async (col, def) => {
        if (!postCols[col]) await queryInterface.addColumn('posts', col, def);
      };

      await addIfMissing('visibility', {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'public'
      });
      await addIfMissing('groupId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'groups', key: 'id' },
        onDelete: 'SET NULL'
      });
      await addIfMissing('linkUrl',          { type: Sequelize.TEXT,        allowNull: true });
      await addIfMissing('linkTitle',        { type: Sequelize.STRING(255), allowNull: true });
      await addIfMissing('linkDescription',  { type: Sequelize.TEXT,        allowNull: true });
      await addIfMissing('linkImage',        { type: Sequelize.TEXT,        allowNull: true });
      await addIfMissing('hashtags',         { type: Sequelize.JSONB,       allowNull: true });
      await addIfMissing('sharesCount',      { type: Sequelize.INTEGER,     defaultValue: 0, allowNull: false });
      await addIfMissing('status',           { type: Sequelize.STRING(30),  allowNull: false, defaultValue: 'active' });
      await addIfMissing('hiddenReason',     { type: Sequelize.TEXT,        allowNull: true });
      await addIfMissing('moderatedBy',      { type: Sequelize.INTEGER,     allowNull: true });
      await addIfMissing('moderatedAt',      { type: Sequelize.DATE,        allowNull: true });
      await addIfMissing('deletedAt',        { type: Sequelize.DATE,        allowNull: true });
    }

    // ─── post_media table ───
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('post_media')) {
      await queryInterface.createTable('post_media', {
        id:         { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        postId:     { type: Sequelize.INTEGER, allowNull: false, references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE' },
        userId:     { type: Sequelize.INTEGER, allowNull: false },
        url:        { type: Sequelize.STRING(500), allowNull: false },
        publicId:   { type: Sequelize.STRING(255), allowNull: true },
        mediaType:  { type: Sequelize.STRING(20),  allowNull: false, defaultValue: 'image' },
        mimeType:   { type: Sequelize.STRING(100), allowNull: true },
        sizeBytes:  { type: Sequelize.INTEGER,     allowNull: true },
        width:      { type: Sequelize.INTEGER,     allowNull: true },
        height:     { type: Sequelize.INTEGER,     allowNull: true },
        duration:   { type: Sequelize.FLOAT,       allowNull: true },
        sortOrder:  { type: Sequelize.INTEGER,     defaultValue: 0 },
        createdAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
      });
      await queryInterface.addIndex('post_media', ['postId']);
    }

    // ─── post_shares table ───
    if (!tables.includes('post_shares')) {
      await queryInterface.createTable('post_shares', {
        id:         { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        postId:     { type: Sequelize.INTEGER, allowNull: false, references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE' },
        userId:     { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        shareType:  { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'repost' },
        caption:    { type: Sequelize.TEXT, allowNull: true },
        createdAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
      });
      await queryInterface.addIndex('post_shares', ['postId', 'userId', 'shareType'], { unique: true });
    }

    // ─── user_privacy_settings table ───
    if (!tables.includes('user_privacy_settings')) {
      await queryInterface.createTable('user_privacy_settings', {
        id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        userId:               { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        profileVisibility:    { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'public' },
        messagePermission:    { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'everyone' },
        commentPermission:    { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'everyone' },
        followersVisibility:  { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'public' },
        followingVisibility:  { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'public' },
        emailVisibility:      { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'private' },
        phoneVisibility:      { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'private' },
        dobVisibility:        { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'private' },
        createdAt:            { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt:            { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
      });
    }

    // ─── groups: add new columns ───
    const groupCols = await queryInterface.describeTable('groups').catch(() => null);
    if (groupCols) {
      const addIfMissingG = async (col, def) => {
        if (!groupCols[col]) await queryInterface.addColumn('groups', col, def);
      };
      await addIfMissingG('privacy',   { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'public' });
      await addIfMissingG('status',    { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'active' });
      await addIfMissingG('ownerId',   { type: Sequelize.INTEGER,    allowNull: true });
      await addIfMissingG('avatarUrl', { type: Sequelize.STRING(500),allowNull: true });
      await addIfMissingG('rules',     { type: Sequelize.TEXT,       allowNull: true });
    }

    // ─── group_members: add new columns ───
    const gmCols = await queryInterface.describeTable('group_members').catch(() => null);
    if (gmCols) {
      const addIfMissingGM = async (col, def) => {
        if (!gmCols[col]) await queryInterface.addColumn('group_members', col, def);
      };
      await addIfMissingGM('status',    { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'active' });
      await addIfMissingGM('invitedBy', { type: Sequelize.INTEGER,    allowNull: true });
      await addIfMissingGM('joinedAt',  { type: Sequelize.DATE,       allowNull: true });

      // Extend role enum to include 'owner' if it doesn't already exist.
      // Postgres requires adding the value to the enum type.
      try {
        await queryInterface.sequelize.query(
          `DO $$ BEGIN
            ALTER TYPE "enum_group_members_role" ADD VALUE IF NOT EXISTS 'owner';
          EXCEPTION WHEN others THEN NULL;
          END $$;`
        );
      } catch (_) {
        // Enum might not exist as named type in older setups — ignore.
      }
    }
  },

  async down(queryInterface) {
    // Best-effort rollback of new tables only
    await queryInterface.dropTable('post_shares').catch(() => {});
    await queryInterface.dropTable('post_media').catch(() => {});
    await queryInterface.dropTable('user_privacy_settings').catch(() => {});
    // Column removals omitted to avoid data loss risk
  }
};
