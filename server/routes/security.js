/**
 * Security & Breach Notification Routes
 * Phase 4.7: Breach Notification
 * 
 * POST   /api/security/report-breach     - Admin: Report a security breach
 * GET    /api/security/breaches          - Admin: List breach incidents
 * PUT    /api/security/breaches/:id      - Admin: Update breach incident
 * POST   /api/security/notify-breach     - Admin: Send breach notifications to affected users
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { BreachIncident, User } = require('../models');
const { ok, created, fail } = require('../utils/response');
const { csrfProtection } = require('../middleware/csrf');
const { sendSecurityAlertEmail } = require('../services/email');
const { handleError, handleValidationError, handleNotFoundError, handleForbiddenError } = require('../utils/errorHandler');

// Middleware to require admin access
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return handleForbiddenError(res, req, 'Admin access required.');
  }
  next();
};

// ─── REPORT BREACH ───
router.post('/report-breach', authenticate, csrfProtection(), adminOnly, async (req, res) => {
  try {
    const {
      incidentType,
      severity,
      description,
      affectedDataTypes,
      detectedAt,
      affectedUserCount
    } = req.body;

    // Validate required fields
    if (!incidentType || !severity || !description || !detectedAt) {
      return handleValidationError(res, req, 'incidentType, severity, description, and detectedAt are required.');
    }

    const validIncidentTypes = [
      'data_exposure', 'unauthorized_access', 'malware',
      'ransomware', 'phishing', 'ddos', 'credential_stuffing', 'other'
    ];
    const validSeverities = ['low', 'medium', 'high', 'critical'];

    if (!validIncidentTypes.includes(incidentType)) {
      return handleValidationError(res, req, `Invalid incidentType: ${validIncidentTypes.join(', ')}`);
    }
    if (!validSeverities.includes(severity)) {
      return handleValidationError(res, req, `Invalid severity: ${validSeverities.join(', ')}`);
    }

    const breach = await BreachIncident.create({
      incidentType,
      severity,
      description,
      affectedDataTypes: affectedDataTypes || [],
      detectedAt: new Date(detectedAt),
      affectedUserCount: affectedUserCount || 0,
      status: 'detected'
    });

    return created(res, {
      message: 'Breach incident reported.',
      incident: breach
    });
  } catch (error) {
    return handleError(res, req, error, 'report_breach_error', {
      code: 'SERVER_ERROR',
      message: 'Failed to report breach.'
    });
  }
});

// ─── LIST BREACH INCIDENTS (ADMIN) ───
router.get('/breaches', authenticate, adminOnly, async (req, res) => {
  try {
    const { status, severity } = req.query;
    const where = {};

    if (status) where.status = status;
    if (severity) where.severity = severity;

    const incidents = await BreachIncident.findAll({
      where,
      order: [['detectedAt', 'DESC']],
      limit: 100
    });

    return ok(res, {
      incidents,
      total: incidents.length
    });
  } catch (error) {
    return handleError(res, req, error, 'list_breaches_error', {
      code: 'SERVER_ERROR',
      message: 'Failed to retrieve breach incidents.'
    });
  }
});

// ─── UPDATE BREACH INCIDENT (ADMIN) ───
router.put('/breaches/:id', authenticate, csrfProtection(), adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, containedAt, reportedAt, remediationSteps, externalId } = req.body;

    const breach = await BreachIncident.findByPk(id);
    if (!breach) {
      return handleNotFoundError(res, req, 'Breach incident');
    }

    const updates = {};
    if (status) updates.status = status;
    if (containedAt) updates.containedAt = new Date(containedAt);
    if (reportedAt) updates.reportedAt = new Date(reportedAt);
    if (remediationSteps) updates.remediationSteps = remediationSteps;
    if (externalId) updates.externalId = externalId;

    await breach.update(updates);

    return ok(res, {
      message: 'Breach incident updated.',
      incident: breach
    });
  } catch (error) {
    return handleError(res, req, error, 'update_breach_error', {
      code: 'SERVER_ERROR',
      message: 'Failed to update breach incident.'
    });
  }
});

// ─── NOTIFY USERS OF BREACH (ADMIN) ───
router.post('/notify-breach', authenticate, csrfProtection(), adminOnly, async (req, res) => {
  try {
    const { incidentId, userIds, customMessage } = req.body;

    if (!incidentId) {
      return handleValidationError(res, req, 'incidentId is required.');
    }

    const breach = await BreachIncident.findByPk(incidentId);
    if (!breach) {
      return handleNotFoundError(res, req, 'Breach incident');
    }

    // Determine which users to notify
    let usersToNotify;
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Notify specific users
      usersToNotify = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'email', 'firstName']
      });
    } else {
      // Notify all active users (for widespread breaches)
      usersToNotify = await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'email', 'firstName'],
        limit: 10000 // Safety limit
      });
    }

    if (usersToNotify.length === 0) {
      return handleValidationError(res, req, 'No users found to notify.');
    }

    // Send breach notification emails (fire-and-forget)
    const severityLabel = breach.severity.toUpperCase();
    const affectedTypes = (breach.affectedDataTypes || []).join(', ') || 'account information';

    const notificationPromises = usersToNotify.map(user => {
      const details = `
        <p><strong>Incident Type:</strong> ${breach.incidentType}</p>
        <p><strong>Severity:</strong> ${severityLabel}</p>
        <p><strong>Affected Data:</strong> ${affectedTypes}</p>
        <p><strong>Detection Date:</strong> ${new Date(breach.detectedAt).toUTCString()}</p>
        <p>${breach.description}</p>
        ${breach.remediationSteps ? `<p><strong>What We're Doing:</strong> ${breach.remediationSteps}</p>` : ''}
        ${customMessage ? `<p><strong>Additional Information:</strong> ${customMessage}</p>` : ''}
        <p><a href="${process.env.APP_URL || 'https://spopeer.com'}/security-center" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:white;text-decoration:none;border-radius:6px;">View More Details</a></p>
      `;

      return sendSecurityAlertEmail(
        user.email,
        `Security Incident: ${severityLabel}`,
        details
      ).catch(err => {
        console.error(`[BREACH-NOTIFICATION] Email error for ${user.email}:`, err);
      });
    });

    // Wait for all notifications (with timeout)
    await Promise.race([
      Promise.all(notificationPromises),
      new Promise(resolve => setTimeout(resolve, 30000)) // 30 second timeout
    ]);

    // Update breach record
    await breach.update({
      notificationsSentAt: new Date()
    });

    return ok(res, {
      message: `Breach notification sent to ${usersToNotify.length} users.`,
      affectedCount: usersToNotify.length,
      incidentId: breach.id
    });
  } catch (error) {
    return handleError(res, req, error, 'notify_breach_error', {
      code: 'SERVER_ERROR',
      message: 'Failed to send breach notifications.'
    });
  }
});

module.exports = router;
