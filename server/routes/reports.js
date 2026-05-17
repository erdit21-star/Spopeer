'use strict';
const express = require('express');
const router  = express.Router();
const { sendEmail } = require('../services/email');
const { createLimiter } = require('../services/rateLimiter');
const { ok, fail } = require('../utils/response');

const CONTACT_RECIPIENT = process.env.CONTACT_TO_EMAIL || 'erditgr@yahoo.gr';

// Rate limit abuse report: 5 per hour per IP
const reportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many report submissions. Please try again later.' }
});

// POST /api/reports/abuse
router.post('/abuse', reportLimiter, async (req, res) => {
  const {
    reporterName,
    reporterEmail,
    reportedUser,
    reportedUrl,
    reason,
    details
  } = req.body || {};

  if (!reporterName || !reporterEmail || !reportedUser || !reason || !details) {
    return fail(res, 400, 'VALIDATION', 'All required fields must be filled in.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
    return fail(res, 400, 'VALIDATION_EMAIL', 'Invalid email address.');
  }

  const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const html = `
    <h2 style="margin:0 0 16px;color:#001f3f;">New Abuse Report</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;font-weight:600;color:#555;width:160px;">Reporter name</td><td style="color:#222;">${escHtml(reporterName)}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Reporter email</td><td><a href="mailto:${escHtml(reporterEmail)}" style="color:#001f3f;">${escHtml(reporterEmail)}</a></td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Reported user</td><td style="color:#222;">${escHtml(reportedUser)}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#555;">Reason</td><td style="color:#222;">${escHtml(reason)}</td></tr>
      ${reportedUrl ? `<tr><td style="padding:8px 0;font-weight:600;color:#555;">Evidence / links</td><td style="color:#222;white-space:pre-wrap;">${escHtml(reportedUrl)}</td></tr>` : ''}
    </table>
    <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
    <h3 style="margin:0 0 10px;color:#333;font-size:15px;">Details</h3>
    <p style="color:#444;line-height:1.7;white-space:pre-wrap;">${escHtml(details)}</p>
    <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
    <p style="font-size:12px;color:#999;">Submitted via Spopeer Report Abuse form</p>
  `;

  try {
    const result = await sendEmail({
      to:      CONTACT_RECIPIENT,
      replyTo: reporterEmail,
      subject: '[Spopeer Abuse Report] New report submitted',
      html
    });
    if (!result.success) {
      console.error('[AbuseReport] Email send failed:', result.error);
      if (process.env.NODE_ENV === 'production') {
        return fail(res, 500, 'EMAIL_SEND_FAILED', 'Failed to submit report. Please try again.');
      }
    }
    return ok(res, { message: 'Your report has been submitted. Thank you for helping keep Spopeer safe.' });
  } catch (err) {
    console.error('[AbuseReport]', err.message);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to submit report. Please try again.');
  }
});

module.exports = router;
