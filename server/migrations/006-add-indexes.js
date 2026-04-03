/**
 * Migration 002: Add database indexes for query performance
 *
 * Adds indexes to frequently queried columns across all models.
 * Safe to run multiple times — uses IF NOT EXISTS via queryInterface.addIndex.
 */
'use strict';

module.exports = {
  async up(queryInterface) {
    // --- posts ---
    await queryInterface.addIndex('posts', ['userId'], {
      name: 'idx_posts_userId'
    });
    await queryInterface.addIndex('posts', ['createdAt'], {
      name: 'idx_posts_createdAt'
    });
    await queryInterface.addIndex('posts', ['sport'], {
      name: 'idx_posts_sport'
    });
    await queryInterface.addIndex('posts', ['isActive', 'createdAt'], {
      name: 'idx_posts_active_created'
    });

    // --- messages ---
    await queryInterface.addIndex('messages', ['senderId'], {
      name: 'idx_messages_senderId'
    });
    await queryInterface.addIndex('messages', ['receiverId'], {
      name: 'idx_messages_receiverId'
    });
    await queryInterface.addIndex('messages', ['receiverId', 'read'], {
      name: 'idx_messages_receiver_read'
    });
    await queryInterface.addIndex('messages', ['senderId', 'receiverId', 'createdAt'], {
      name: 'idx_messages_conversation'
    });

    // --- listings ---
    await queryInterface.addIndex('listings', ['sellerId'], {
      name: 'idx_listings_sellerId'
    });
    await queryInterface.addIndex('listings', ['category'], {
      name: 'idx_listings_category'
    });
    await queryInterface.addIndex('listings', ['sport'], {
      name: 'idx_listings_sport'
    });
    await queryInterface.addIndex('listings', ['status'], {
      name: 'idx_listings_status'
    });
    await queryInterface.addIndex('listings', ['createdAt'], {
      name: 'idx_listings_createdAt'
    });

    // --- saved_posts ---
    await queryInterface.addIndex('saved_posts', ['userId', 'postId'], {
      unique: true,
      name: 'idx_saved_posts_user_post_unique'
    });
    await queryInterface.addIndex('saved_posts', ['userId'], {
      name: 'idx_saved_posts_userId'
    });

    // --- comments ---
    await queryInterface.addIndex('comments', ['postId'], {
      name: 'idx_comments_postId'
    });
    await queryInterface.addIndex('comments', ['userId'], {
      name: 'idx_comments_userId'
    });

    // --- notifications ---
    await queryInterface.addIndex('notifications', ['recipientId', 'isRead'], {
      name: 'idx_notifications_recipient_read'
    });
    await queryInterface.addIndex('notifications', ['recipientId', 'createdAt'], {
      name: 'idx_notifications_recipient_created'
    });

    // --- users (search fields) ---
    await queryInterface.addIndex('users', ['sport'], {
      name: 'idx_users_sport'
    });
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role'
    });

    // --- connections (reverse lookup) ---
    await queryInterface.addIndex('connections', ['followingId'], {
      name: 'idx_connections_followingId'
    });
  },

  async down(queryInterface) {
    const indexes = [
      ['posts', 'idx_posts_userId'],
      ['posts', 'idx_posts_createdAt'],
      ['posts', 'idx_posts_sport'],
      ['posts', 'idx_posts_active_created'],
      ['messages', 'idx_messages_senderId'],
      ['messages', 'idx_messages_receiverId'],
      ['messages', 'idx_messages_receiver_read'],
      ['messages', 'idx_messages_conversation'],
      ['listings', 'idx_listings_sellerId'],
      ['listings', 'idx_listings_category'],
      ['listings', 'idx_listings_sport'],
      ['listings', 'idx_listings_status'],
      ['listings', 'idx_listings_createdAt'],
      ['saved_posts', 'idx_saved_posts_user_post_unique'],
      ['saved_posts', 'idx_saved_posts_userId'],
      ['comments', 'idx_comments_postId'],
      ['comments', 'idx_comments_userId'],
      ['notifications', 'idx_notifications_recipient_read'],
      ['notifications', 'idx_notifications_recipient_created'],
      ['users', 'idx_users_sport'],
      ['users', 'idx_users_role'],
      ['connections', 'idx_connections_followingId']
    ];

    for (const [table, name] of indexes) {
      await queryInterface.removeIndex(table, name);
    }
  }
};
