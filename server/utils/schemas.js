// Updated
/**
 * Zod Validation Schemas
 * Centralized request body validation for all write routes.
 *
 * Usage:
 *   const { signupSchema } = require('../utils/schemas');
 *   const result = signupSchema.safeParse(req.body);
 *   if (!result.success) return fail(res, 400, 'VALIDATION', result.error.issues[0].message);
 */
const { z } = require('zod');
const { PUBLIC_USER_ROLES } = require('./constants');

// ─── AUTH ───

const signupSchema = z.object({
  email: z.string().email('Invalid email address.').max(254),
  password: z.string().min(10, 'Password must be at least 10 characters.').max(128),
  firstName: z.string().min(1, 'First name is required.').max(100),
  lastName: z.string().min(1, 'Last name is required.').max(100),
  role: z.enum(PUBLIC_USER_ROLES).optional(),
  sport: z.string().max(100).optional(),
  profession: z.string().max(200).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address.').max(254),
  password: z.string().min(1, 'Password is required.').max(128)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(10, 'New password must be at least 10 characters.').max(128)
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required.').max(254)
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required.'),
  password: z.string().min(10, 'Password must be at least 10 characters.').max(128)
});

// ─── PROFILE ───

const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().max(150).optional(),
  username: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  sport: z.string().max(100).optional(),
  primarySport: z.string().max(100).optional(),
  profession: z.string().max(200).optional(),
  gender: z.string().max(50).optional(),
  nationality: z.string().max(100).optional(),
  contactEmail: z.string().email().max(255).optional().or(z.literal('')),
  contactPhone: z.string().max(100).optional(),
  playingLevel: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  currentTeam: z.string().max(150).optional(),
  profileVisibility: z.enum(['public', 'private', 'connections']).optional(),
  privacyPublic: z.boolean().optional()
}).passthrough();

// ─── POSTS ───

const createPostSchema = z.object({
  content: z.string().min(1, 'Post content is required.').max(5000),
  sport: z.string().max(100).optional(),
  image: z.string().max(500).optional()
});

// ─── MESSAGES ───

const sendMessageSchema = z.object({
  receiverId: z.number().int().positive('Valid receiver ID is required.'),
  content: z.string().min(1, 'Message content is required.').max(2000)
});

// ─── MARKETPLACE ───

const createListingSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(5000).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().max(5).optional(),
  category: z.string().max(100).optional(),
  sport: z.string().max(100).optional(),
  listingType: z.enum(['product', 'service', 'job', 'sponsorship']).optional()
});

// ─── EVENTS ───

const createEventSchema = z.object({
  title: z.string().min(1, 'Event title is required.').max(200),
  description: z.string().max(5000).optional(),
  type: z.string().max(100).optional(),
  sport: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
  date: z.string().optional(),
  invitees: z.string().max(2000).optional()
});

// ─── REELS ───

const createReelSchema = z.object({
  title: z.string().min(1, 'Reel title is required.').max(200),
  description: z.string().max(5000).optional(),
  videoUrl: z.string().url().max(500),
  sport: z.string().max(100).optional()
});

// ─── FORUMS ───

const createThreadSchema = z.object({
  title: z.string().min(1, 'Thread title is required.').max(300),
  body: z.string().min(1, 'Thread body is required.').max(10000),
  category: z.string().max(100).optional(),
  sport: z.string().max(100).optional(),
  groupId: z.number().int().positive().optional()
});

const createReplySchema = z.object({
  body: z.string().min(1, 'Reply body is required.').max(5000)
});

// ─── SPONSORSHIPS ───

const createSponsorshipSchema = z.object({
  mode: z.enum(['offer', 'request', 'secure']),
  title: z.string().min(1, 'Sponsorship title is required.').max(200),
  sport: z.string().max(100).optional(),
  sponsorType: z.string().max(50).optional(),
  targetAudience: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  timeline: z.string().max(100).optional(),
  summary: z.string().max(5000).optional()
});

// ─── REPORTS ───

const createReportSchema = z.object({
  targetType: z.enum(['user', 'post', 'listing', 'message', 'comment', 'reel']),
  targetId: z.number().int().positive('Valid target ID is required.'),
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'scam', 'other']),
  description: z.string().max(2000).optional()
});

// ─── ADMIN ───

const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'ban', 'warn', 'dismiss']),
  notes: z.string().max(2000).optional()
});

// ─── HELPER: validate middleware ───

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstIssue.message,
          field: firstIssue.path.join('.')
        }
      });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
  createPostSchema,
  sendMessageSchema,
  createListingSchema,
  createEventSchema,
  createReelSchema,
  createThreadSchema,
  createReplySchema,
  createSponsorshipSchema,
  createReportSchema,
  adminActionSchema,
  validate
};
