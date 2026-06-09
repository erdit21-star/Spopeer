// Updated
/**
 * Privacy Settings Routes
 * GET  /api/privacy/settings           - Get current user's privacy settings
 * PUT  /api/privacy/settings           - Replace all privacy settings
 * PATCH /api/privacy/settings          - Partially update privacy settings
 */
const express = require('express');
const router = express.Router();
const { UserPrivacySettings } = require('../models');
const { authenticate } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const ALLOWED_VISIBILITY = ['public', 'logged_in', 'followers', 'private'];
const ALLOWED_PERMISSION = ['everyone', 'followers', 'none'];

function validateSettings(body) {
  const errors = [];
  const checks = [
    { key: 'profileVisibility', allowed: ALLOWED_VISIBILITY },
    { key: 'followersVisibility', allowed: ALLOWED_VISIBILITY },
    { key: 'followingVisibility', allowed: ALLOWED_VISIBILITY },
    { key: 'emailVisibility', allowed: ALLOWED_VISIBILITY },
    { key: 'phoneVisibility', allowed: ALLOWED_VISIBILITY },
    { key: 'dobVisibility', allowed: ALLOWED_VISIBILITY },
    { key: 'messagePermission', allowed: ALLOWED_PERMISSION },
    { key: 'commentPermission', allowed: ALLOWED_PERMISSION }
  ];
  for (const { key, allowed } of checks) {
    if (body[key] !== undefined && !allowed.includes(body[key])) {
      errors.push(`${key} must be one of: ${allowed.join(', ')}`);
    }
  }
  return errors;
}

// ─── GET SETTINGS ───
router.get('/settings', authenticate, async (req, res) => {
  try {
    let settings = await UserPrivacySettings.findOne({ where: { userId: req.userId } });
    if (!settings) {
      // Return defaults without persisting
      settings = {
        userId: req.userId,
        profileVisibility: 'public',
        messagePermission: 'everyone',
        commentPermission: 'everyone',
        followersVisibility: 'public',
        followingVisibility: 'public',
        emailVisibility: 'private',
        phoneVisibility: 'private',
        dobVisibility: 'private'
      };
    }
    ok(res, settings);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch privacy settings.');
  }
});

// ─── PUT (full replace) SETTINGS ───
router.put('/settings', authenticate, async (req, res) => {
  try {
    const errors = validateSettings(req.body);
    if (errors.length) return fail(res, 400, 'VALIDATION', errors.join(' | '));

    const [settings] = await UserPrivacySettings.findOrCreate({
      where: { userId: req.userId },
      defaults: { userId: req.userId }
    });

    const fields = [
      'profileVisibility', 'messagePermission', 'commentPermission',
      'followersVisibility', 'followingVisibility',
      'emailVisibility', 'phoneVisibility', 'dobVisibility'
    ];

    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    await settings.update(updates);
    ok(res, settings);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update privacy settings.');
  }
});

// ─── PATCH (partial update) SETTINGS ───
router.patch('/settings', authenticate, async (req, res) => {
  try {
    const errors = validateSettings(req.body);
    if (errors.length) return fail(res, 400, 'VALIDATION', errors.join(' | '));

    const [settings] = await UserPrivacySettings.findOrCreate({
      where: { userId: req.userId },
      defaults: { userId: req.userId }
    });

    const fields = [
      'profileVisibility', 'messagePermission', 'commentPermission',
      'followersVisibility', 'followingVisibility',
      'emailVisibility', 'phoneVisibility', 'dobVisibility'
    ];

    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (Object.keys(updates).length === 0) return fail(res, 400, 'VALIDATION', 'No valid fields provided.');

    await settings.update(updates);
    ok(res, settings);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update privacy settings.');
  }
});

module.exports = router;
