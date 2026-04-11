const { fail } = require('../utils/response');

// Short-circuit: if no captcha provider is configured, allow requests.
const hasRecaptcha = !!process.env.RECAPTCHA_SECRET;
const hasHcaptcha = !!process.env.HCAPTCHA_SECRET;

async function verifyWithRecaptcha(token) {
  const body = `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`;
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  return res.json();
}

async function verifyWithHcaptcha(token) {
  const body = `secret=${encodeURIComponent(process.env.HCAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`;
  const res = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  return res.json();
}

async function verifyCaptchaMiddleware(req, res, next) {
  if (!hasRecaptcha && !hasHcaptcha) return next();

  const token = req.body?.captchaToken || req.body?.['g-recaptcha-response'] || req.body?.hcaptcha_token;
  if (!token) return fail(res, 400, 'CAPTCHA_REQUIRED', 'CAPTCHA token is required.');

  try {
    let result;
    if (hasRecaptcha) {
      result = await verifyWithRecaptcha(token);
      if (!result || result.success !== true) {
        return fail(res, 400, 'CAPTCHA_FAILED', 'CAPTCHA verification failed.');
      }
    } else if (hasHcaptcha) {
      result = await verifyWithHcaptcha(token);
      if (!result || result.success !== true) {
        return fail(res, 400, 'CAPTCHA_FAILED', 'CAPTCHA verification failed.');
      }
    }
    return next();
  } catch (err) {
    console.error('[CAPTCHA] verification error:', err && err.message);
    return fail(res, 503, 'CAPTCHA_SERVICE_UNAVAILABLE', 'CAPTCHA provider unavailable. Try again later.');
  }
}

module.exports = { verifyCaptchaMiddleware };
