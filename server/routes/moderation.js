// Updated
/**
 * Moderation Routes
 * POST   /api/moderation/report         - Report content/user
 * POST   /api/moderation/block/:userId  - Block a user
 * DELETE /api/moderation/block/:userId  - Unblock a user
 * GET    /api/moderation/blocks         - List blocked users
 * GET    /api/moderation/reports        - Admin: list reports
 * PUT    /api/moderation/reports/:id    - Admin: review a report
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { Report, Block, User, AdminAuditLog } = require('../models');
const { validate, createReportSchema } = require('../utils/schemas');
const { ok, created, fail } = require('../utils/response');

// ─── REPORT CONTENT / USER ───
router.post('/report', authenticate, validate(createReportSchema), async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.validated;

    // Prevent self-report
    if (targetType === 'user' && targetId === req.userId) {
      return fail(res, 400, 'SELF_REPORT', 'You cannot report yourself.');
    }

    const report = await Report.create({
      reporterId: req.userId,
      targetType,
      targetId,
      reason,
      description: description || null
    });

    return created(res, { id: report.id, status: report.status });
  } catch (error) {
    console.error('Report error:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to submit report.');
  }
});

// ─── BLOCK USER ───
router.post('/block/:userId', authenticate, async (req, res) => {
  try {
    const blockedId = parseInt(req.params.userId);
    if (blockedId === req.userId) {
      return fail(res, 400, 'SELF_BLOCK', 'You cannot block yourself.');
    }

    const [block, wasCreated] = await Block.findOrCreate({
      where: { blockerId: req.userId, blockedId },
      defaults: { blockerId: req.userId, blockedId }
    });

    if (!wasCreated) {
      return ok(res, { message: 'User already blocked.' });
    }

    return created(res, { id: block.id, message: 'User blocked.' });
  } catch (error) {
    console.error('Block error:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to block user.');
  }
});

// ─── UNBLOCK USER ───
router.delete('/block/:userId', authenticate, async (req, res) => {
  try {
    const blockedId = parseInt(req.params.userId);
    const deleted = await Block.destroy({
      where: { blockerId: req.userId, blockedId }
    });

    if (!deleted) {
      return fail(res, 404, 'NOT_FOUND', 'Block not found.');
    }

    return ok(res, { message: 'User unblocked.' });
  } catch (error) {
    console.error('Unblock error:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to unblock user.');
  }
});

// ─── LIST BLOCKED USERS ───
router.get('/blocks', authenticate, async (req, res) => {
  try {
    const blocks = await Block.findAll({
      where: { blockerId: req.userId },
      include: [{ model: User, as: 'blocked', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']]
    });

    return ok(res, blocks);
  } catch (error) {
    console.error('List blocks error:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch blocked users.');
  }
});

// ─── ADMIN: LIST REPORTS ───
router.get('/reports', authenticate, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await Report.findAndCountAll({
      where: status !== 'all' ? { status } : {},
      include: [{ model: User, as: 'reporter', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return ok(res, rows, { pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    console.error('List reports error:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch reports.');
  }
});

// ─── ADMIN: REVIEW REPORT ───
router.put('/reports/:id', authenticate, requireAdmin, async (req, res) => {
  try {

    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return fail(res, 404, 'NOT_FOUND', 'Report not found.');
    }

    const { status, resolution } = req.body;
    const allowedStatuses = ['reviewed', 'resolved', 'dismissed'];
    if (!allowedStatuses.includes(status)) {
      return fail(res, 400, 'INVALID_STATUS', `Status must be one of: ${allowedStatuses.join(', ')}`);
    }

    await report.update({
      status,
      resolution: resolution || null,
      reviewedBy: req.userId,
      reviewedAt: new Date()
    });

    // Audit log
    await AdminAuditLog.create({
      adminId: req.userId,
      action: `report_${status}`,
      targetType: 'report',
      targetId: report.id,
      details: resolution || null,
      ipAddress: req.ip
    });

    return ok(res, report);
  } catch (error) {
    console.error('Review report error:', error);
    return fail(res, 500, 'SERVER_ERROR', 'Failed to update report.');
  }
});

module.exports = router;
