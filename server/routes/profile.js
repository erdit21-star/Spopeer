const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { pickAllowedUpdates, normalizeUser } = require('../utils/profileUtils');
const { getEffectivePlan } = require('../utils/subscription-plans');

const allowedCardStylesByType = {
  athlete: ['athlete_neon', 'athlete_elite'],
  coach: ['coach_tactical'],
  club: ['club_legacy'],
  professional: ['professional_premium'],
  supportive_professional: ['professional_premium']
};

// GET /api/profile/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: { exclude: ['password'] } });
    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] get_me failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

// PATCH /api/profile/me
router.patch('/me', authenticate, async (req, res) => {
  try {
    const updates = pickAllowedUpdates(req.body);
    if (!Object.keys(updates).length) {
      return fail(res, 400, 'VALIDATION', 'No valid profile fields were provided.');
    }

    if (updates.username) {
      const existing = await User.findOne({ where: { username: updates.username } });
      if (existing && existing.id !== req.userId) {
        return fail(res, 409, 'CONFLICT', 'Username is already taken.');
      }
    }

    const user = await User.findByPk(req.userId);
    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    await user.update(updates);
    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] patch_me failed:', {
      userId: req.userId,
      path: req.originalUrl,
      method: req.method,
      message: error && error.message,
      stack: error && error.stack
    });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to update profile.');
  }
});

// GET /api/profile/subscription-plans
router.get('/subscription-plans', authenticate, async (req, res) => {
  try {
    const effective = getEffectivePlan(req.user);
    return ok(res, {
      role: effective.role,
      currentPlanCode: effective.code,
      currentPlanLabel: effective.label,
      currentTier: effective.tier,
      plans: effective.plans
    });
  } catch (error) {
    console.error('[PROFILE] get_subscription_plans failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch subscription plans.');
  }
});

// PATCH /api/profile/subscription
router.patch('/subscription', authenticate, async (req, res) => {
  try {
    const requestedPlanCode = String(req.body.planCode || '').trim().toUpperCase();
    if (!requestedPlanCode) {
      return fail(res, 400, 'VALIDATION', 'planCode is required.');
    }

    const resolved = getEffectivePlan(req.user, requestedPlanCode);
    if (!resolved.isValidRequest) {
      return fail(res, 400, 'VALIDATION', 'Selected plan is not available for your user type.');
    }

    const currentExtendedProfile = req.user.extendedProfile && typeof req.user.extendedProfile === 'object'
      ? req.user.extendedProfile
      : {};

    const nextExtendedProfile = {
      ...currentExtendedProfile,
      subscriptionPlanCode: resolved.code,
      subscriptionUpdatedAt: new Date().toISOString()
    };

    await req.user.update({
      subscription: resolved.coarseSubscription,
      extendedProfile: nextExtendedProfile
    });

    return ok(res, {
      user: normalizeUser(req.user),
      plan: {
        code: resolved.code,
        label: resolved.label,
        tier: resolved.tier,
        features: resolved.features
      }
    }, { message: 'Subscription updated.' });
  } catch (error) {
    console.error('[PROFILE] patch_subscription failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to update subscription.');
  }
});

// PATCH /api/profile/me/card-style
router.patch('/me/card-style', authenticate, async (req, res) => {
  try {
    const cardStyle = String(req.body.cardStyle || '').trim();
    if (!cardStyle) {
      return fail(res, 400, 'VALIDATION', 'cardStyle is required.');
    }

    const user = await User.findByPk(req.userId);
    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Profile not found.');
    }

    const userType = String(user.userType || user.role || 'athlete').toLowerCase();
    const allowedStyles = allowedCardStylesByType[userType] || allowedCardStylesByType.athlete;

    if (!allowedStyles.includes(cardStyle)) {
      return fail(res, 400, 'VALIDATION', 'This card style is not allowed for your profile type.');
    }

    await user.update({
      cardStyle,
      ogImageUrl: null,
      ogImageUpdatedAt: null
    });

    return ok(res, { cardStyle }, { message: 'Card style saved.' });
  } catch (error) {
    console.error('[PROFILE] patch_card_style failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to save card style.');
  }
});

// GET /api/profile/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const idParam = String(req.params.id || '').trim();
    if (!idParam) {
      return fail(res, 400, 'VALIDATION', 'Profile id is required.');
    }

    let user;
    if (/^\d+$/.test(idParam)) {
      user = await User.findByPk(Number(idParam), { attributes: { exclude: ['password'] } });
    } else {
      user = await User.findOne({
        where: { username: idParam },
        attributes: { exclude: ['password'] }
      });
      if (!user) {
        user = await User.findOne({
          where: { email: idParam.toLowerCase() },
          attributes: { exclude: ['password'] }
        });
      }
    }

    if (!user || !user.isActive) {
      return fail(res, 404, 'NOT_FOUND', 'Profile not found.');
    }

    const sameUser = req.user && Number(req.user.id) === Number(user.id);
    if (!sameUser && user.privacyPublic === false) {
      return ok(res, { message: 'This profile is private.' });
    }

    return ok(res, { user: normalizeUser(user) });
  } catch (error) {
    console.error('[PROFILE] get_by_id failed:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
  }
});

module.exports = router;
