// Updated
/**
 * Content Filter Service
 * Provides banned-word detection and spam-link filtering.
 *
 * Usage:
 *   const { checkContent } = require('../services/contentFilter');
 *   const { blocked, reason } = checkContent(text);
 *   if (blocked) return fail(res, 400, 'CONTENT_POLICY', reason);
 *
 * To add or remove terms update the BANNED_WORDS array below.
 * A future admin endpoint can manage this list dynamically via a DB table.
 */

// ─── Configurable banned-word list ───────────────────────────────────────────
// Keep as lower-case tokens; multi-word phrases are also supported.
const BANNED_WORDS = [
  // Harassment / self-harm encouragement
  'kys', 'kill yourself', 'go die', 'end your life',
  // Abuse / threats
  'i will kill you', 'i will hurt you', 'rape threat', 'bomb threat', 'school shooter',
  // Fraud / scam hooks
  'guaranteed profit', 'double your money', 'send crypto now', 'investment secret', 'risk free returns',
  // Explicit spam patterns
  'buy followers', 'cheap followers', 'dm for promo', 'click this to win',
  // Exploitative / abusive terms
  'doxxing', 'leaked nudes', 'revenge porn', 'child abuse material'
];

// Domains commonly used for spam / phishing (lower-case, no protocol)
const SPAM_LINK_PATTERNS = [
  /bit\.ly\/[a-zA-Z0-9]{5,}/,
  /tinyurl\.com\//,
  /ow\.ly\//,
  /rb\.gy\//,
  /cutt\.ly\//,
  /t\.co\//, // Twitter shortener — only flag in non-tweet contexts
  /grabify\.link\//,
  /iplogger\./,
  /discord\.(gg|com\/invite)\//,
  /telegram\.(me|dog)\//,
  /wa\.me\//,
  /onlyfans\.com\//,
  /cashapp\./,
  /venmo\./,
  /paypal\.me\//,
  /free\s+money/i,
  /win\s+an\s+iphone/i,
  /earn\s+\$?\d+\s+per\s+day/i,
  /limited\s+time\s+offer/i,
  /http:\/\//i // force https-only links in restricted contexts
];

// Max length guards (characters)
const MAX_POST_LENGTH    = 5000;
const MAX_COMMENT_LENGTH = 2000;
const MAX_MESSAGE_LENGTH = 4000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalise text for comparison: lower-case, collapse whitespace.
 */
function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check a piece of text against content policy.
 * @param {string} text
 * @param {{ maxLength?: number, allowLinks?: boolean }} [opts]
 * @returns {{ blocked: boolean, reason?: string }}
 */
function checkContent(text, opts = {}) {
  if (!text) return { blocked: false };

  const { maxLength, allowLinks = true } = opts;

  const raw  = String(text);
  const norm = normalise(raw);

  // Length check
  const cap = maxLength || MAX_POST_LENGTH;
  if (raw.length > cap) {
    return { blocked: true, reason: `Content exceeds maximum length of ${cap} characters.` };
  }

  // Banned-word check
  for (const word of BANNED_WORDS) {
    if (norm.includes(word)) {
      return { blocked: true, reason: 'Your message contains content that violates our community guidelines.' };
    }
  }

  // Spam-link check (optional)
  if (!allowLinks) {
    for (const pattern of SPAM_LINK_PATTERNS) {
      if (pattern.test(raw)) {
        return { blocked: true, reason: 'Shortened or spam links are not allowed here.' };
      }
    }
  }

  return { blocked: false };
}

/**
 * Convenience wrappers with preset limits.
 */
function checkPost(text)    { return checkContent(text, { maxLength: MAX_POST_LENGTH }); }
function checkComment(text) { return checkContent(text, { maxLength: MAX_COMMENT_LENGTH }); }
function checkMessage(text) { return checkContent(text, { maxLength: MAX_MESSAGE_LENGTH, allowLinks: false }); }

module.exports = { checkContent, checkPost, checkComment, checkMessage };
