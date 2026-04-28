/**
 * public/js/profile-schema.js
 * Client-side schema validation for profile save payloads.
 * Used by edit-profile.html before saving sections to the server.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.ProfileSchema = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  // Fields that are always string type
  var STRING_FIELDS = [
    'firstName', 'lastName', 'displayName', 'username', 'bio', 'location',
    'city', 'country', 'phone', 'sport', 'primarySport', 'position',
    'currentTeam', 'playingLevel', 'sportsLevel', 'highestLevel',
    'highestLevelAchieved', 'availability', 'upcomingEvents', 'achievements',
    'certifications', 'specialization', 'specializationField',
    'coachingStyle', 'philosophy', 'coachingPhilosophy', 'education',
    'coachEducation', 'profEducation', 'foundedYear', 'teamsAndDivisions',
    'clubType', 'facilities', 'clubWebsite', 'website', 'youthPrograms',
    'companyName', 'professionalTitle', 'services', 'credentials',
    'availabilityHours', 'clientele', 'preferredContact', 'communicationTools',
    'trainingDays', 'trainingHours', 'trainingLocation', 'trainingRoutine',
    'trainingPlans', 'playerDevelopment', 'techniques',
    'teamManagement', 'rosterManagement', 'playerSelection', 'teamsCoached',
    'competitionHistory', 'teamInfo', 'injuryHistory', 'currentInjuries',
    'medicalHistory', 'nutritionDiet', 'coachingStaff', 'managementStaff',
    'clubPhilosophy', 'talentRecruitment', 'scholarships', 'communityOutreach',
    'socialResponsibility', 'charitablePartnerships', 'trainingFields',
    'gymFacilities', 'lockerRooms', 'otherFacilities', 'equipmentList',
    'maintenanceSchedule', 'clubLicensing', 'clubCompliance', 'clientReviews',
    'professionalRefs', 'feeStructure', 'paymentMethods', 'billingInfo',
    'profLicensing', 'profCompliance', 'coachAchievements', 'instagram',
    'youtube', 'linkedin', 'twitterX', 'tiktok',
    'profileCardStyle', 'profileVisibility', 'userType', 'role'
  ];

  // Fields that must be numbers when present
  var NUMERIC_FIELDS = [
    'experience', 'sportsYears', 'profExperience', 'yearsOfExperience',
    'yearsOfCoaching', 'height', 'weight', 'chest', 'waist', 'hips'
  ];

  // Fields that must be booleans when present
  var BOOL_FIELDS = ['privacy_public'];

  // Fields that are entirely blocked from client-submitted payloads
  var SYSTEM_FIELDS = new Set([
    'id', 'userId', 'password', 'passwordHash', 'salt',
    'emailVerified', 'emailVerifyToken', 'passwordResetToken',
    'passwordResetExpires', 'isActive', 'isBanned', 'bannedAt',
    'banReason', 'createdAt', 'updatedAt', 'lastLogin', 'role',
    '_profileUpdatedAt'
  ]);

  // Maximum allowed lengths per field (characters)
  var MAX_LENGTHS = {
    bio: 2000,
    firstName: 100,
    lastName: 100,
    displayName: 150,
    username: 50,
    location: 200,
    city: 100,
    country: 100,
    phone: 30
  };

  var DEFAULT_MAX = 5000;

  /**
   * Validates a profile payload object.
   * Returns { valid: boolean, errors: string[] }.
   */
  function validate(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { valid: false, errors: ['Payload must be a plain object.'] };
    }

    var errors = [];

    Object.keys(payload).forEach(function (key) {
      if (SYSTEM_FIELDS.has(key)) {
        errors.push('Field "' + key + '" is not allowed in client payloads.');
        return;
      }

      var val = payload[key];
      if (val === null || val === undefined || val === '') return;

      if (STRING_FIELDS.indexOf(key) !== -1) {
        if (typeof val !== 'string') {
          errors.push('Field "' + key + '" must be a string.');
        } else {
          var maxLen = MAX_LENGTHS[key] || DEFAULT_MAX;
          if (val.length > maxLen) {
            errors.push('Field "' + key + '" exceeds maximum length of ' + maxLen + '.');
          }
        }
      }

      if (NUMERIC_FIELDS.indexOf(key) !== -1) {
        var num = Number(val);
        if (Number.isNaN(num)) {
          errors.push('Field "' + key + '" must be a number.');
        } else if (num < 0 || num > 200) {
          errors.push('Field "' + key + '" value ' + num + ' is out of range (0-200).');
        }
      }

      if (BOOL_FIELDS.indexOf(key) !== -1) {
        if (typeof val !== 'boolean') {
          errors.push('Field "' + key + '" must be a boolean.');
        }
      }
    });

    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * Strips system fields from a payload before sending to the server.
   * Returns a clean copy.
   */
  function sanitize(payload) {
    if (!payload || typeof payload !== 'object') return {};
    var clean = {};
    Object.keys(payload).forEach(function (key) {
      if (!SYSTEM_FIELDS.has(key)) {
        clean[key] = payload[key];
      }
    });
    return clean;
  }

  return {
    validate: validate,
    sanitize: sanitize,
    SYSTEM_FIELDS: SYSTEM_FIELDS
  };
});
