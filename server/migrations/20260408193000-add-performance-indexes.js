'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('posts', ['createdAt'], {
      name: 'idx_posts_created_at'
    }).catch(() => {});

    await queryInterface.addIndex('posts', ['likesCount', 'commentsCount'], {
      name: 'idx_posts_popularity'
    }).catch(() => {});

    await queryInterface.addIndex('users', ['role', 'sport', 'isActive'], {
      name: 'idx_users_role_sport_active'
    }).catch(() => {});

    await queryInterface.addIndex('users', ['location'], {
      name: 'idx_users_location'
    }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('posts', 'idx_posts_created_at').catch(() => {});
    await queryInterface.removeIndex('posts', 'idx_posts_popularity').catch(() => {});
    await queryInterface.removeIndex('users', 'idx_users_role_sport_active').catch(() => {});
    await queryInterface.removeIndex('users', 'idx_users_location').catch(() => {});
  }
};
