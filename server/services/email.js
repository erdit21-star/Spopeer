// Updated
/**
 * Email Service
 * Sends Spopeer emails through Resend.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isEmailConfigured = !!process.env.RESEND_API_KEY;
const crypto = require('crypto');

const APP_NAME = 'Spopeer';
const BRAND_COLOR = '#001233';
const FOOTER_TEXT = `&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`;
const EMAIL_PREF_SECRET = process.env.EMAIL_PREF_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev-email-pref-secret';

function assertEmailReady() {
  if (isProduction && !isEmailConfigured) {
    console.error('FATAL: RESEND_API_KEY not set in production.');
    throw new Error('Email provider Resend is not configured in production');
  }

  if (!isEmailConfigured) {
    console.warn('⚠️ RESEND_API_KEY not set — emails will be logged in development.');
  }
}

function wrapTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;">${APP_NAME}</h1>
</td></tr>
<tr><td style="padding:32px;">${content}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eee;text-align:center;">
<p style="margin:0;color:#999;font-size:12px;">${FOOTER_TEXT}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buttonHtml(href, label) {
  return `<a href="${href}" style="display:inline-block;padding:14px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>`;
}

async function sendEmail({ to, subject, html, replyTo }) {
  if (!isEmailConfigured) {
    if (isProduction) {
      throw new Error('Resend email is not configured.');
    }

    console.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(html);
    return { success: true, dev: true };
  }

  try {
    const body = {
      from: process.env.EMAIL_FROM || `${APP_NAME} <info@spopeer.com>`,
      to,
      subject,
      html
    };

    if (replyTo || process.env.EMAIL_REPLY_TO) {
      body.reply_to = replyTo || process.env.EMAIL_REPLY_TO;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Resend email send failed');
    }

    return {
      success: true,
      id: data.id
    };
  } catch (error) {
    console.error('Resend email send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/verify?token=${token}`;

  const html = wrapTemplate(`
    <h2 style="margin:0 0 16px;color:#333;">Welcome to ${APP_NAME}!</h2>
    <p style="color:#555;line-height:1.6;">Thanks for signing up. Please verify your email address.</p>
    <div style="text-align:center;margin:28px 0;">${buttonHtml(verifyUrl, 'Verify Email')}</div>
    <p style="color:#999;font-size:13px;">If you didn't create an account, you can ignore this email.</p>
  `);

  return sendEmail({
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html
  });
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/pages/auth/reset-password.html?token=${token}`;

  const html = wrapTemplate(`
    <h2 style="margin:0 0 12px;color:#001233;font-size:26px;">Reset your Spopeer password</h2>

    <p style="color:#444;line-height:1.7;font-size:15px;">
      We received a request to reset the password for your Spopeer account.
    </p>

    <p style="color:#444;line-height:1.7;font-size:15px;">
      Click the button below to create a new password. This link will expire in <strong>30 minutes</strong>.
    </p>

    <div style="text-align:center;margin:32px 0;">
      ${buttonHtml(resetUrl, 'Create New Password')}
    </div>

    <p style="color:#777;line-height:1.7;font-size:13px;">
      If the button does not work, copy and paste this link into your browser:
    </p>

    <p style="word-break:break-all;background:#f4f6f8;padding:12px;border-radius:8px;color:#001233;font-size:13px;">
      ${resetUrl}
    </p>

    <p style="color:#999;font-size:13px;line-height:1.6;margin-top:24px;">
      If you did not request a password reset, you can safely ignore this email.
    </p>
  `);

  return sendEmail({
    to: email,
    subject: `Reset your Spopeer password`,
    html
  });
}

async function sendWelcomeEmail(email, firstName) {
  const loginUrl = `${process.env.APP_URL || 'http://localhost:5000'}/index.html`;

  const html = wrapTemplate(`
    <h2 style="margin:0 0 16px;color:#333;">Welcome${firstName ? `, ${firstName}` : ''}!</h2>
    <p style="color:#555;line-height:1.6;">Your Spopeer account is ready. Start connecting with athletes, coaches, clubs and sports professionals.</p>
    <div style="text-align:center;margin:28px 0;">${buttonHtml(loginUrl, 'Open Spopeer')}</div>
  `);

  return sendEmail({
    to: email,
    subject: `Welcome to ${APP_NAME}!`,
    html
  });
}

async function sendSecurityAlertEmail(email, alertType, details) {
  const html = wrapTemplate(`
    <h2 style="margin:0 0 16px;color:#333;">Security Alert</h2>
    <p style="color:#555;line-height:1.6;">We detected a <strong>${alertType}</strong> on your Spopeer account.</p>
    ${details ? `<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0;color:#555;font-size:14px;">${details}</p></div>` : ''}
    <p style="color:#999;font-size:13px;">Time: ${new Date().toUTCString()}</p>
  `);

  return sendEmail({
    to: email,
    subject: `${APP_NAME} Security Alert: ${alertType}`,
    html
  });
}

function createEmailPreferenceToken(email, action = 'unsubscribe') {
  const payload = {
    email: String(email || '').trim().toLowerCase(),
    action,
    iat: Date.now()
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', EMAIL_PREF_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyEmailPreferenceToken(token, expectedAction = 'unsubscribe', maxAgeMs = 365 * 24 * 60 * 60 * 1000) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [encoded, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', EMAIL_PREF_SECRET).update(encoded).digest('base64url');

  const provided = Buffer.from(signature || '', 'utf8');
  const expected = Buffer.from(expectedSig, 'utf8');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload || payload.action !== expectedAction || !payload.email || !payload.iat) {
      return null;
    }

    if (Date.now() - Number(payload.iat) > maxAgeMs) {
      return null;
    }

    return {
      email: String(payload.email).trim().toLowerCase(),
      action: payload.action
    };
  } catch (_err) {
    return null;
  }
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  createEmailPreferenceToken,
  verifyEmailPreferenceToken,
  isEmailConfigured,
  assertEmailReady
};

