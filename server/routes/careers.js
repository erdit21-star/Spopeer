'use strict';
const express = require('express');
const router  = express.Router();
const { sendEmail } = require('../services/email');
const { createLimiter } = require('../services/rateLimiter');

const CONTACT_RECIPIENT = process.env.CONTACT_TO_EMAIL || 'erditgr@yahoo.gr';

// Rate limit: 3 career applications per hour per IP
const careersLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Too many applications submitted. Please try again later.' }
});

// POST /api/careers
router.post('/', careersLimiter, async (req, res) => {
  const { name, email, phone, position, resume, portfolio, coverLetter } = req.body || {};

  if (!name || !email || !position || !resume || !coverLetter) {
    return res.status(400).json({ success: false, error: 'Please fill in all required fields.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  const escHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `
    <h2 style="margin:0 0 16px;color:#001f3f;">New Career Application</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;font-weight:600;color:#555;width:140px;">Name</td><td style="color:#222;">${escHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Email</td><td><a href="mailto:${escHtml(email)}" style="color:#001f3f;">${escHtml(email)}</a></td></tr>
      ${phone ? `<tr><td style="padding:8px 0;font-weight:600;color:#555;">Phone</td><td style="color:#222;">${escHtml(phone)}</td></tr>` : ''}
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Position</td><td style="color:#222;">${escHtml(position)}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Resume / CV</td><td style="color:#222;white-space:pre-wrap;">${escHtml(resume)}</td></tr>
      ${portfolio ? `<tr><td style="padding:8px 0;font-weight:600;color:#555;">Portfolio</td><td><a href="${escHtml(portfolio)}" style="color:#001f3f;">${escHtml(portfolio)}</a></td></tr>` : ''}
    </table>
    <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
    <h3 style="margin:0 0 10px;color:#333;font-size:15px;">Cover Letter</h3>
    <p style="color:#444;line-height:1.7;white-space:pre-wrap;">${escHtml(coverLetter)}</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
    <p style="font-size:12px;color:#999;">Submitted via Spopeer Careers page — reply directly to ${escHtml(email)}</p>
  `;

  try {
    const result = await sendEmail({
      to: CONTACT_RECIPIENT,
      replyTo: email,
      subject: '[Spopeer Careers] New application submitted',
      html
    });

    if (!result.success) {
      console.error('[Careers] Email send failed:', result.error);
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ success: false, error: 'Failed to submit application. Please try again.' });
      }
    }

    res.json({ success: true, message: 'Your application has been submitted. We\'ll be in touch soon!' });
  } catch (err) {
    console.error('[Careers] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to submit application. Please try again.' });
  }
});

module.exports = router;
