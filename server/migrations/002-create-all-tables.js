'use strict';

/**
 * Migration 007 — Create all remaining model tables
 *
 * Tables created:
 *   posts, connections, messages, jobs, likes, comments,
 *   notifications, groups, group_members, listings,
 *   threads, replies, reels, saved_posts, sponsorships, media
 *
 * The users and password_reset_tokens tables are handled by earlier migrations.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── posts ──
    await queryInterface.createTable('posts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      image: { type: Sequelize.STRING(500), allowNull: true },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      likesCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      commentsCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      repostsCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── connections ──
    await queryInterface.createTable('connections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      followerId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      followingId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      status: { type: Sequelize.ENUM('active', 'pending', 'blocked'), defaultValue: 'active' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('connections', {
      fields: ['followerId', 'followingId'],
      type: 'unique',
      name: 'connections_follower_following_unique'
    });

    // ── messages ──
    await queryInterface.createTable('messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      senderId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      receiverId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      read: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── jobs ──
    await queryInterface.createTable('jobs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      clubId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      location: { type: Sequelize.STRING(255), allowNull: true },
      type: { type: Sequelize.ENUM('full-time', 'part-time', 'contract', 'internship'), defaultValue: 'full-time' },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── likes ──
    await queryInterface.createTable('likes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      postId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('likes', {
      fields: ['userId', 'postId'],
      type: 'unique',
      name: 'likes_user_post_unique'
    });

    // ── comments ──
    await queryInterface.createTable('comments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      postId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE'
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── notifications ──
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      recipientId: { type: Sequelize.INTEGER, allowNull: false },
      senderId: { type: Sequelize.INTEGER, allowNull: true },
      type: { type: Sequelize.STRING(50), allowNull: false },
      text: { type: Sequelize.TEXT, allowNull: false },
      href: { type: Sequelize.TEXT, allowNull: true },
      isRead: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── groups ──
    await queryInterface.createTable('groups', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      coverUrl: { type: Sequelize.STRING(500), allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      memberCount: { type: Sequelize.INTEGER, defaultValue: 1 },
      isPrivate: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── group_members ──
    await queryInterface.createTable('group_members', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      groupId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'groups', key: 'id' }, onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      role: { type: Sequelize.ENUM('admin', 'moderator', 'member'), defaultValue: 'member' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('group_members', {
      fields: ['groupId', 'userId'],
      type: 'unique',
      name: 'group_members_group_user_unique'
    });

    // ── listings ──
    await queryInterface.createTable('listings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sellerId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      currency: { type: Sequelize.STRING(5), defaultValue: 'EUR' },
      category: { type: Sequelize.STRING(100), allowNull: true },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      listingType: { type: Sequelize.ENUM('product', 'service', 'job', 'sponsorship'), allowNull: true },
      imageUrls: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'sold', 'paused', 'deleted'), defaultValue: 'active' },
      viewCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── threads ──
    await queryInterface.createTable('threads', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      groupId: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'groups', key: 'id' }, onDelete: 'SET NULL'
      },
      title: { type: Sequelize.STRING(300), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      category: { type: Sequelize.STRING(100), defaultValue: 'General' },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      isPinned: { type: Sequelize.BOOLEAN, defaultValue: false },
      isLocked: { type: Sequelize.BOOLEAN, defaultValue: false },
      viewCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      replyCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── replies ──
    await queryInterface.createTable('replies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      threadId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'threads', key: 'id' }, onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      likesCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── reels ──
    await queryInterface.createTable('reels', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      videoUrl: { type: Sequelize.STRING(500), allowNull: false },
      thumbnailUrl: { type: Sequelize.STRING(500), allowNull: true },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      duration: { type: Sequelize.INTEGER, allowNull: true },
      viewCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      likesCount: { type: Sequelize.INTEGER, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── saved_posts ──
    await queryInterface.createTable('saved_posts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      postId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('saved_posts', {
      fields: ['userId', 'postId'],
      type: 'unique',
      name: 'saved_posts_user_post_unique'
    });

    // ── sponsorships ──
    await queryInterface.createTable('sponsorships', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      mode: { type: Sequelize.ENUM('offer', 'request', 'secure'), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      sport: { type: Sequelize.STRING(100), allowNull: true },
      sponsorType: { type: Sequelize.STRING(50), allowNull: true },
      targetAudience: { type: Sequelize.STRING(50), allowNull: true },
      location: { type: Sequelize.STRING(100), allowNull: true },
      timeline: { type: Sequelize.STRING(100), allowNull: true },
      summary: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'closed', 'draft'), defaultValue: 'active' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── media ──
    await queryInterface.createTable('media', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      url: { type: Sequelize.STRING(500), allowNull: false },
      storageProvider: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'local' },
      publicId: { type: Sequelize.STRING(255), allowNull: true },
      originalName: { type: Sequelize.STRING(255), allowNull: false },
      mimeType: { type: Sequelize.STRING(100), allowNull: false },
      size: { type: Sequelize.INTEGER, allowNull: false },
      caption: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // ── Indexes (from Section 5C of the production readiness guide) ──
    await queryInterface.addIndex('posts', ['userId']);
    await queryInterface.addIndex('messages', ['senderId']);
    await queryInterface.addIndex('messages', ['receiverId']);
    await queryInterface.addIndex('notifications', ['recipientId', 'isRead']);
    await queryInterface.addIndex('listings', ['sellerId', 'status']);
    await queryInterface.addIndex('threads', ['userId']);
    await queryInterface.addIndex('threads', ['groupId']);
    await queryInterface.addIndex('replies', ['threadId']);
    await queryInterface.addIndex('media', ['userId']);
  },

  async down(queryInterface) {
    // Drop in reverse dependency order
    await queryInterface.dropTable('media');
    await queryInterface.dropTable('saved_posts');
    await queryInterface.dropTable('replies');
    await queryInterface.dropTable('reels');
    await queryInterface.dropTable('sponsorships');
    await queryInterface.dropTable('threads');
    await queryInterface.dropTable('listings');
    await queryInterface.dropTable('group_members');
    await queryInterface.dropTable('groups');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('comments');
    await queryInterface.dropTable('likes');
    await queryInterface.dropTable('jobs');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('connections');
    await queryInterface.dropTable('posts');
  }
};
