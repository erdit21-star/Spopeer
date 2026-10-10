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
const { escapeHtml } = require('../utils/htmlEscape');
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

    // Validate input before writing it to the incident log.
    if (!incidentType || !severity || !description || !detectedAt) {
      return handleValidationError(res, req, 'incidentType, severity, description, and detectedAt are required.');
    }

    const validIncidentTypes = [
      'data_exposure', 'unauthorized_access', 'malware',
      'ransomware', 'phishing', 'ddos', 'credential_stuffing', 'other'
    ];
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validIncidentTypes.includes(incidentType)) {
      return handleValidationError(res, req, 'Invalid incident type.');
    }
    if (!validSeverities.includes(severity)) {
      return handleValidationError(res, req, 'Invalid severity.');
    }
    if (typeof description !== 'string' || !description.trim() || description.length > 10000) {
      return handleValidationError(res, req, 'description must be a non-empty string of at most 10000 characters.');
    }
    const detectedDate = new Date(detectedAt);
    if (!Number.isFinite(detectedDate.getTime())) {
      return handleValidationError(res, req, 'detectedAt must be a valid date.');
    }
    if (affectedDataTypes != null && (!Array.isArray(affectedDataTypes) || affectedDataTypes.length > 20 ||
        affectedDataTypes.some((item) => typeof item !== 'string' || item.length > 80))) {
      return handleValidationError(res, req, 'affectedDataTypes must be an array of up to 20 strings.');
    }
    const affectedCount = affectedUserCount == null ? 0 : Number(affectedUserCount);
    if (!Number.isInteger(affectedCount) || affectedCount < 0 || affectedCount > 100000000) {
      return handleValidationError(res, req, 'affectedUserCount must be a non-negative integer.');
    }

    const breach = await BreachIncident.create({
      incidentType,
      severity,
      description: description.trim(),
      affectedDataTypes: affectedDataTypes || [],
      detectedAt: detectedDate,
      affectedUserCount: affectedCount,
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
    const validStatuses = ['detected', 'investigating', 'contained', 'resolved'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (status && !validStatuses.includes(status)) {
      return handleValidationError(res, req, 'Invalid status filter.');
    }
    if (severity && !validSeverities.includes(severity)) {
      return handleValidationError(res, req, 'Invalid severity filter.');
    }
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
    const validStatuses = ['detected', 'investigating', 'contained', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return handleValidationError(res, req, 'Invalid breach status.');
    }
    if (status) updates.status = status;
    for (const [field, value] of [['containedAt', containedAt], ['reportedAt', reportedAt]]) {
      if (value !== undefined && value !== null && value !== '') {
        const parsed = new Date(value);
        if (!Number.isFinite(parsed.getTime())) {
          return handleValidationError(res, req, field + ' must be a valid date.');
        }
        updates[field] = parsed;
      }
    }
    if (remediationSteps !== undefined) {
      if (typeof remediationSteps !== 'string' || remediationSteps.length > 10000) {
        return handleValidationError(res, req, 'remediationSteps must be a string of at most 10000 characters.');
      }
      updates.remediationSteps = remediationSteps;
    }
    if (externalId !== undefined) {
      if (typeof externalId !== 'string' || externalId.length > 255) {
        return handleValidationError(res, req, 'externalId must be a string of at most 255 characters.');
      }
      updates.externalId = externalId;
    }

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

    if (!Number.isInteger(Number(incidentId)) || Number(incidentId) <= 0) {
      return handleValidationError(res, req, 'incidentId must be a positive integer.');
    }
    if (userIds !== undefined && (!Array.isArray(userIds) || userIds.length > 10000 ||
        userIds.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0))) {
      return handleValidationError(res, req, 'userIds must be an array of up to 10000 positive integer IDs.');
    }
    if (customMessage !== undefined && (typeof customMessage !== 'string' || customMessage.length > 5000)) {
      return handleValidationError(res, req, 'customMessage must be a string of at most 5000 characters.');
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
    const severityLabel = escapeHtml(breach.severity.toUpperCase());
    const affectedTypes = Array.isArray(breach.affectedDataTypes)
      ? breach.affectedDataTypes.map(escapeHtml).join(', ')
      : 'account information';
    const incidentTypeText = escapeHtml(breach.incidentType);
    const detectedAtText = escapeHtml(new Date(breach.detectedAt).toUTCString());
    const descriptionText = escapeHtml(breach.description);
    const remediationStepsText = breach.remediationSteps ? escapeHtml(breach.remediationSteps) : '';
    const customMessageText = customMessage ? escapeHtml(customMessage) : '';
    const appUrl = escapeHtml(process.env.APP_URL || 'https://spopeer.com');

    const notificationPromises = usersToNotify.map(user => {
      const details = [
        '<p><strong>Incident Type:</strong> ' + incidentTypeText + '</p>',
        '<p><strong>Severity:</strong> ' + severityLabel + '</p>',
        '<p><strong>Affected Data:</strong> ' + affectedTypes + '</p>',
        '<p><strong>Detection Date:</strong> ' + detectedAtText + '</p>',
        '<p>' + descriptionText + '</p>',
        remediationStepsText ? '<p><strong>What We\'re Doing:</strong> ' + remediationStepsText + '</p>' : '',
        customMessageText ? '<p><strong>Additional Information:</strong> ' + customMessageText + '</p>' : '',
        '<p><a href="' + appUrl + '/security-center" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:white;text-decoration:none;border-radius:6px;">View More Details</a></p>'
      ].join('\n');

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
