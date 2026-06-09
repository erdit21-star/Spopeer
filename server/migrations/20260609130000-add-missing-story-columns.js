'use strict';

/**
 * Add columns to the stories table that were added to the Story model
 * but not yet reflected in the database schema.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('stories').catch(() => null);
    if (!cols) return;

    const addIfMissing = async (col, def) => {
      if (!cols[col]) await queryInterface.addColumn('stories', col, def);
    };

    await addIfMissing('isArchived', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addIfMissing('likesCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addIfMissing('commentsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addIfMissing('viewsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addIfMissing('thumbnailUrl', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
    await addIfMissing('isLive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addIfMissing('metrics', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });
  },

  async down(queryInterface) {
    for (const col of ['isArchived', 'likesCount', 'commentsCount', 'viewsCount', 'thumbnailUrl', 'isLive', 'metrics']) {
      await queryInterface.removeColumn('stories', col).catch(() => {});
    }
  }
};
