// Updated
/**
 * Email Service
 * Sends Spopeer emails through domain SMTP.
 */

const nodemailer = require('nodemailer');

const isProduction = process.env.NODE_ENV === 'production';

const APP_NAME = 'Spopeer';
const BRAND_COLOR = '#001233';
const FOOTER_TEXT = `&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`;

const isEmailConfigured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

function assertEmailReady() {
  if (isProduction && !isEmailConfigured) {
    console.error('FATAL: SMTP email is not configured in production.');
    throw new Error('SMTP email is not configured in production');
  }

  if (!isEmailConfigured) {
    console.warn('⚠️ SMTP email not configured — emails will be logged in development.');
  }
}

function getTransporter() {
  if (!isEmailConfigured) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
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
      throw new Error('SMTP email is not configured.');
    }

    console.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(html);
    return { success: true, dev: true };
  }

  try {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `${APP_NAME} <info@spopeer.com>`,
      to,
      replyTo: replyTo || process.env.EMAIL_REPLY_TO || process.env.SMTP_USER,
      subject,
      html
    });

    return {
      success: true,
      id: info.messageId
    };
  } catch (error) {
    console.error('SMTP email send error:', error);
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
    <h2 style="margin:0 0 16px;color:#333;">Reset your password</h2>
    <p style="color:#555;line-height:1.6;">We received a request to reset your Spopeer password.</p>
    <div style="text-align:center;margin:28px 0;">${buttonHtml(resetUrl, 'Reset Password')}</div>
    <p style="color:#999;font-size:13px;">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
  `);

  return sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
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

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  isEmailConfigured,
  assertEmailReady
};

