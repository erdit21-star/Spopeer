/**
 * Migration 006: Add supplementary indexes for performance
 *
 * Covers tables/columns missed by migration 002:
 *   - users.username (search by handle)
 *   - sponsorships.userId (sponsor lookup)
 *   - sponsorships.status (active filter)
 *   - connections.followerId (who-am-I-following query)
 *   - connections.status (active filter)
 *   - likes.postId + likes.userId (feed engagement)
 *   - reels.userId (reel author)
 *
 * Safe to re-run — uses IF NOT EXISTS via addIndex().
 */
'use strict';

module.exports = {
  async up(queryInterface) {
    // Helper: swallow "already exists" so the migration is re-runnable
    async function safeIndex(table, columns, options) {
      try {
        await queryInterface.addIndex(table, columns, options);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) return;
        throw err;
      }
    }

    // --- users ---
    await safeIndex('users', ['username'], {
      unique: true,
      name: 'idx_users_username_unique',
    });

    // --- sponsorships ---
    await safeIndex('sponsorships', ['userId'], {
      name: 'idx_sponsorships_userId',
    });
    await safeIndex('sponsorships', ['status'], {
      name: 'idx_sponsorships_status',
    });
    await safeIndex('sponsorships', ['sport'], {
      name: 'idx_sponsorships_sport',
    });

    // --- connections ---
    await safeIndex('connections', ['followerId'], {
      name: 'idx_connections_followerId',
    });
    await safeIndex('connections', ['status'], {
      name: 'idx_connections_status',
    });

    // --- likes ---
    await safeIndex('likes', ['postId'], {
      name: 'idx_likes_postId',
    });
    await safeIndex('likes', ['userId', 'postId'], {
      unique: true,
      name: 'idx_likes_user_post_unique',
    });

    // --- reels ---
    await safeIndex('reels', ['userId'], {
      name: 'idx_reels_userId',
    });
  },

  async down(queryInterface) {
    const indexes = [
      ['users', 'idx_users_username_unique'],
      ['sponsorships', 'idx_sponsorships_userId'],
      ['sponsorships', 'idx_sponsorships_status'],
      ['sponsorships', 'idx_sponsorships_sport'],
      ['connections', 'idx_connections_followerId'],
      ['connections', 'idx_connections_status'],
      ['likes', 'idx_likes_postId'],
      ['likes', 'idx_likes_user_post_unique'],
      ['reels', 'idx_reels_userId'],
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
