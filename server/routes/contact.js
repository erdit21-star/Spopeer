'use strict';
const express = require('express');
const router  = express.Router();
const { sendEmail } = require('../services/email');
const { createLimiter } = require('../services/rateLimiter');
const { ok, fail } = require('../utils/response');

const CONTACT_RECIPIENT = process.env.CONTACT_TO_EMAIL || 'erditgr@yahoo.gr';

// Rate limit contact form: 5 per hour per IP
const contactLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many contact form submissions. Please try again later.' }
});

router.post('/', contactLimiter, async (req, res) => {
  const { firstName, lastName, email, subject, message, type } = req.body || {};

  if (!firstName || !lastName || !email || !subject || !message) {
    return fail(res, 400, 'VALIDATION', 'All fields are required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail(res, 400, 'VALIDATION_EMAIL', 'Invalid email address.');
  }

  const html = `
    <h2 style="margin:0 0 16px;color:#001f3f;">New Contact Form Submission</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;font-weight:600;color:#555;width:120px;">From</td><td style="color:#222;">${firstName} ${lastName}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Email</td><td><a href="mailto:${email}" style="color:#001f3f;">${email}</a></td></tr>
      ${type ? `<tr><td style="padding:8px 0;font-weight:600;color:#555;">Type</td><td style="color:#222;">${type}</td></tr>` : ''}
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Subject</td><td style="color:#222;">${subject}</td></tr>
    </table>
    <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
    <h3 style="margin:0 0 10px;color:#333;font-size:15px;">Message</h3>
    <p style="color:#444;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
    <p style="font-size:12px;color:#999;">Sent via Spopeer contact form &mdash; reply directly to ${email}</p>
  `;

  try {
    const result = await sendEmail({
      to: CONTACT_RECIPIENT,
      replyTo: email,
      subject: `[Spopeer Contact] ${subject}`,
      html
    });

    if (!result.success && process.env.NODE_ENV === 'production') {
      console.error('[Contact] Email send failed:', result.error);
      return fail(res, 500, 'EMAIL_SEND_FAILED', 'Failed to send message. Please try again.');
    }

    return ok(res, { message: 'Your message has been sent. We\'ll be in touch soon!' });
  } catch (err) {
    console.error('[Contact] Error:', err.message);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to send message. Please try again.');
  }
});

module.exports = router;
