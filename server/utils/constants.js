// Updated
module.exports = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  APP_NAME: 'Spopeer',

  USER_ROLES: [
    'athlete',
    'coach',
    'club',
    'supportive_professional',
    'admin'
  ],

  PUBLIC_USER_ROLES: [
    'athlete',
    'coach',
    'club',
    'supportive_professional'
  ],

  LEGACY_ROLE_ALIASES: {
    'supportive-profession': 'supportive_professional',
    'supportive professional': 'supportive_professional',
    'pro': 'supportive_professional'
  }
};

