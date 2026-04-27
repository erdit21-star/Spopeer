'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'googleId', {
      type: Sequelize.STRING(128),
      allowNull: true,
      unique: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'googleId');
  }
};
