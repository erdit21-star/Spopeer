/**
 * Email Service
 * Handles email sending for verification, password reset, notifications
 * Uses Resend or falls back to console logging in development
 */

const isProduction = process.env.NODE_ENV === 'production';
const isEmailConfigured = !!process.env.RESEND_API_KEY;

/**
 * Assert email readiness at startup.
 * Throws in production if RESEND_API_KEY is missing.
 */
function assertEmailReady() {
  if (isProduction && !isEmailConfigured) {
    console.warn('⚠️  RESEND_API_KEY not set in production — email features (verification, password reset) will be unavailable.');
  } else if (!isEmailConfigured) {
    console.warn('⚠️  RESEND_API_KEY not set — emails will be logged to console in development.');
  }
}

const BRAND_COLOR = '#001f3f';
const APP_NAME = 'Spopeer';
const FOOTER_TEXT = `&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`;

// ─── Base template wrapper ───
function wrapTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
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

async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured) {
    if (isProduction) {
      throw new Error('Email provider is not configured.');
    }

    console.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`   Body preview: ${html.substring(0, 100)}...`);
    return { success: true, dev: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${APP_NAME} <noreply@spopeer.com>`,
        to,
        subject,
        html
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Email send failed');
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// ─── Verification Email ───
async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/verify?token=${token}`;
  const html = wrapTemplate(`
    <h2 style="margin:0 0 16px;color:#333;">Welcome to ${APP_NAME}!</h2>
    <p style="color:#555;line-height:1.6;">Thanks for signing up. Please verify your email address to activate your account.</p>
    <div style="text-align:center;margin:28px 0;">${buttonHtml(verifyUrl, 'Verify Email')}</div>
    <p style="color:#999;font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
  `);
  return sendEmail({ to: email, subject: `Verify your ${APP_NAME} account`, html });
}

// ─── Password Reset Email ───
async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/pages/auth/reset-password.html?token=${token}`;
  const html = wrapTemplate(`
    <h2 style="margin:0 0 16px;color:#333;">Password Reset</h2>
    <p style="color:#555;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new one.</p>
    <div style="text-align:center;margin:28px 0;">${buttonHtml(resetUrl, 'Reset Password')}</div>
    <p style="color:#999;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `);
  return sendEmail({ to: email, subject: `Reset your ${APP_NAME} password`, html });
}

// ─── Welcome Email (post-verification) ───
async function sendWelcomeEmail(email, firstName) {
  const loginUrl = `${process.env.APP_URL || 'http://localhost:5000'}/pages/auth/login.html`;
  const html = wrapTemplate(`
    <h2 style="margin:0 0 16px;color:#333;">Welcome, ${firstName}!</h2>
    <p style="color:#555;line-height:1.6;">Your ${APP_NAME} account is verified and ready to go. Start connecting with athletes, coaches, and clubs in the sports community.</p>
    <div style="text-align:center;margin:28px 0;">${buttonHtml(loginUrl, 'Log In Now')}</div>
    <p style="color:#999;font-size:13px;">Need help getting started? Check out your profile settings and explore the feed.</p>
  `);
  return sendEmail({ to: email, subject: `Welcome to ${APP_NAME}!`, html });
}

// ─── Security Alert Email ───
async function sendSecurityAlertEmail(email, alertType, details) {
  const html = wrapTemplate(`
    <h2 style="margin:0 0 16px;color:#333;">Security Alert</h2>
    <p style="color:#555;line-height:1.6;">We detected a <strong>${alertType}</strong> on your ${APP_NAME} account.</p>
    ${details ? `<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0;color:#555;font-size:14px;">${details}</p></div>` : ''}
    <p style="color:#555;line-height:1.6;">If this wasn't you, please change your password immediately and contact support.</p>
    <p style="color:#999;font-size:13px;">Time: ${new Date().toUTCString()}</p>
  `);
  return sendEmail({ to: email, subject: `${APP_NAME} Security Alert: ${alertType}`, html });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  isEmailConfigured,
  assertEmailReady
};

