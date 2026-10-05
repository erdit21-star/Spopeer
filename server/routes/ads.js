/**
 * Sponsored advertising campaign API.
 * Phase 2: real persisted campaigns and live-ad delivery.
 */
const express = require('express');
const router = express.Router();
const { Op, fn, col } = require('sequelize');
const { AdCampaign, User, AdminAuditLog } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { uploadAvatar, persistFile, validateUploadedFile, enforceFileSizeLimits } = require('../middleware/upload');
const { sanitizeString, isValidId } = require('../utils/validation');
const { ok, created, fail } = require('../utils/response');

const ALLOWED_FORMATS = new Set(['feed', 'sidebar', 'community', 'search', 'marketplace', 'event']);
const ALLOWED_OBJECTIVES = new Set(['awareness', 'reach', 'event-signups', 'profile-visits', 'marketplace', 'sponsorship']);
const ALLOWED_CTA = new Set(['Join Us', 'Learn More', 'Create Account', 'Register Now', 'View Profile', 'Shop Now', 'Contact Us']);

function clean(value, max) {
  if (value === undefined || value === null) return null;
  return sanitizeString(String(value)).trim().slice(0, max);
}

function campaignPayload(body) {
  const profiles = Array.isArray(body.targetProfiles) ? body.targetProfiles.map(v => clean(v, 50)).filter(Boolean).slice(0, 20) : [];
  const interests = Array.isArray(body.targetInterests) ? body.targetInterests.map(v => clean(v, 60)).filter(Boolean).slice(0, 30) : [];
  return {
    name: clean(body.name, 80),
    objective: clean(body.objective, 40),
    format: clean(body.format, 40),
    targetProfiles: profiles,
    targetSport: clean(body.targetSport, 100),
    targetLocation: clean(body.targetLocation, 120),
    targetAgeRange: clean(body.targetAgeRange, 40),
    targetSkillLevel: clean(body.targetSkillLevel, 60),
    targetInterests: interests,
    headline: clean(body.headline, 80),
    body: clean(body.body, 280),
    cta: clean(body.cta, 40) || 'Learn More',
    destinationUrl: clean(body.destinationUrl, 500),
    dailyBudget: Number(body.dailyBudget),
    startDate: clean(body.startDate, 10),
    endDate: clean(body.endDate, 10),
    billingModel: clean(body.billingModel, 10) || 'cpm'
  };
}

function validateCampaign(data) {
  if (!data.name || !data.headline) return 'Campaign name and headline are required.';
  if (!ALLOWED_OBJECTIVES.has(data.objective)) return 'Invalid campaign objective.';
  if (!ALLOWED_FORMATS.has(data.format)) return 'Invalid ad format.';
  if (!ALLOWED_CTA.has(data.cta)) return 'Invalid call to action.';
  if (!['cpm', 'cpc', 'flat'].includes(data.billingModel)) return 'Invalid billing model.';
  if (!Number.isFinite(data.dailyBudget) || data.dailyBudget < 5 || data.dailyBudget > 10000) return 'Daily budget must be between €5 and €10,000.';
  if (!data.startDate || !data.endDate || data.endDate < data.startDate) return 'A valid start and end date are required.';
  if (!data.destinationUrl) return 'Destination URL is required.';
  try {
    const url = new URL(data.destinationUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return 'Destination URL must use http or https.';
  } catch (_error) {
    return 'Destination URL must be a valid URL.';
  }
  return null;
}

// Public delivery endpoint. Only approved/live campaigns are returned.
router.get('/active', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const campaigns = await AdCampaign.findAll({
      where: {
        status: 'live',
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today }
      },
      attributes: [
        'id', 'name', 'format', 'headline', 'body', 'cta', 'destinationUrl',
        'creativeUrl', 'targetProfiles', 'targetSport', 'targetLocation',
        'impressions', 'clicks'
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    ok(res, campaigns);
  } catch (error) {
    console.error('Active ads error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to load sponsored content.');
  }
});


router.get('/active/:format', async (req, res) => {
  try {
    const format = clean(req.params.format, 30);
    if (!ALLOWED_FORMATS.has(format)) return fail(res, 400, 'VALIDATION', 'Invalid ad placement.');
    const today = new Date().toISOString().slice(0, 10);
    const campaigns = await AdCampaign.findAll({
      where: { status: 'live', format, startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } },
      attributes: ['id','name','format','headline','body','cta','destinationUrl','creativeUrl','targetProfiles','targetSport','targetLocation','impressions','clicks'],
      order: [['createdAt','DESC']],
      limit: 20
    });
    ok(res, campaigns);
  } catch (error) {
    console.error('Placement ads error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to load sponsored content.');
  }
});

// Advertiser dashboard: own campaigns.
router.get('/', authenticate, async (req, res) => {
  try {
    const campaigns = await AdCampaign.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']]
    });
    ok(res, campaigns);
  } catch (error) {
    console.error('Ads list error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to load campaigns.');
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const data = campaignPayload(req.body || {});
    const validationError = validateCampaign(data);
    if (validationError) return fail(res, 400, 'VALIDATION', validationError);

    const campaign = await AdCampaign.create({
      ...data,
      userId: req.userId,
      status: 'review'
    });
    created(res, { campaign });
  } catch (error) {
    console.error('Ads create error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create campaign.');
  }
});

// Upload a campaign image to the configured cloud storage.
router.post('/:id/creative', authenticate, uploadAvatar.single('creative'), validateUploadedFile, enforceFileSizeLimits, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, 'VALIDATION', 'Invalid campaign ID.');
    const campaign = await AdCampaign.findByPk(req.params.id);
    if (!campaign) return fail(res, 404, 'NOT_FOUND', 'Campaign not found.');
    if (campaign.userId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'You can only edit your own campaign.');
    if (!req.file) return fail(res, 400, 'VALIDATION', 'Creative image is required.');

    const stored = await persistFile(req.file, 'ads', req.userId);
    await campaign.update({ creativeUrl: stored.url, creativeProvider: stored.provider });
    ok(res, { creativeUrl: stored.url, provider: stored.provider, campaign });
  } catch (error) {
    console.error('Ad creative upload error:', error);
    fail(res, error.status || 500, error.code || 'SERVER_ERROR', error.message || 'Failed to upload creative.');
  }
});

// Owner can pause/resume their campaign; approval is still required before it can become live.
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, 'VALIDATION', 'Invalid campaign ID.');
    const campaign = await AdCampaign.findByPk(req.params.id);
    if (!campaign) return fail(res, 404, 'NOT_FOUND', 'Campaign not found.');
    if (campaign.userId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'You can only manage your own campaign.');
    const requested = clean(req.body && req.body.status, 20);
    if (requested === 'paused' && campaign.status === 'live') await campaign.update({ status: 'paused' });
    else if (requested === 'review' && ['paused', 'rejected'].includes(campaign.status)) await campaign.update({ status: 'review' });
    else return fail(res, 400, 'VALIDATION', 'Unsupported campaign status change.');
    ok(res, { campaign });
  } catch (error) {
    console.error('Ad status error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to update campaign status.');
  }
});

// Admin approval controls.
router.patch('/:id/review', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, 'VALIDATION', 'Invalid campaign ID.');
    const campaign = await AdCampaign.findByPk(req.params.id);
    if (!campaign) return fail(res, 404, 'NOT_FOUND', 'Campaign not found.');
    const action = clean(req.body && req.body.action, 20);
    if (action === 'approve') {
      if (!campaign.creativeUrl || !campaign.destinationUrl) {
        return fail(res, 400, 'VALIDATION', 'Campaign needs a creative image and destination URL before approval.');
      }
      await campaign.update({ status: 'live', reviewNote: null });
      try {
        await AdminAuditLog.create({
          adminId: req.userId,
          action: 'ad_campaign_approved',
          targetType: 'ad_campaign',
          targetId: campaign.id,
          details: null,
          ipAddress: req.ip
        });
      } catch (auditError) {
        console.warn('Ad approval audit log failed:', auditError.message);
      }
    } else if (action === 'reject') {
      const reviewNote = clean(req.body && req.body.note, 500);
      await campaign.update({ status: 'rejected', reviewNote });
      try {
        await AdminAuditLog.create({
          adminId: req.userId,
          action: 'ad_campaign_rejected',
          targetType: 'ad_campaign',
          targetId: campaign.id,
          details: reviewNote,
          ipAddress: req.ip
        });
      } catch (auditError) {
        console.warn('Ad rejection audit log failed:', auditError.message);
      }
    } else {
      return fail(res, 400, 'VALIDATION', 'Review action must be approve or reject.');
    }
    ok(res, { campaign });
  } catch (error) {
    console.error('Ad review error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to review campaign.');
  }
});

// Lightweight delivery metrics.
router.post('/:id/event', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, 'VALIDATION', 'Invalid campaign ID.');
    const event = clean(req.body && req.body.event, 20);
    if (!['impression', 'click'].includes(event)) return fail(res, 400, 'VALIDATION', 'Invalid ad event.');
    const campaign = await AdCampaign.findOne({ where: { id: req.params.id, status: 'live' } });
    if (!campaign) return fail(res, 404, 'NOT_FOUND', 'Campaign not found.');
    if (event === 'impression') await campaign.increment('impressions');
    else await campaign.increment('clicks');
    res.status(204).end();
  } catch (error) {
    console.error('Ad event error:', error);
    res.status(204).end();
  }
});



router.get('/admin/placement-stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await AdCampaign.findAll({
      attributes: ['format', [fn('COUNT', col('id')), 'campaigns'],
        [fn('SUM', col('impressions')), 'impressions'],
        [fn('SUM', col('clicks')), 'clicks']],
      where: { status: { [Op.in]: ['live','paused','ended'] } },
      group: ['format'],
      order: [['format','ASC']]
    });
    ok(res, rows);
  } catch (error) {
    console.error('Admin placement stats error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to load placement statistics.');
  }
});

// Advertiser reporting summary: real lifetime delivery totals from persisted campaigns.\nrouter.get('/summary', authenticate, async (req, res) => {\n  try {\n    const campaigns = await AdCampaign.findAll({\n      where: { userId: req.userId },\n      attributes: ['id','name','format','status','impressions','clicks','spend','dailyBudget','billingModel']\n    });\n    const totalImpressions = campaigns.reduce((n, c) => n + Number(c.impressions || 0), 0);\n    const totalClicks = campaigns.reduce((n, c) => n + Number(c.clicks || 0), 0);\n    const totalSpend = campaigns.reduce((n, c) => n + Number(c.spend || 0), 0);\n    const byFormat = {};\n    campaigns.forEach(c => {\n      const key = c.format || 'unknown';\n      if (!byFormat[key]) byFormat[key] = { campaigns: 0, impressions: 0, clicks: 0, spend: 0 };\n      byFormat[key].campaigns += 1;\n      byFormat[key].impressions += Number(c.impressions || 0);\n      byFormat[key].clicks += Number(c.clicks || 0);\n      byFormat[key].spend += Number(c.spend || 0);\n    });\n    Object.keys(byFormat).forEach(key => {\n      const row = byFormat[key];\n      row.ctr = row.impressions ? Number(((row.clicks / row.impressions) * 100).toFixed(2)) : 0;\n      row.cpc = row.clicks ? Number((row.spend / row.clicks).toFixed(2)) : 0;\n    });\n    ok(res, {\n      totals: {\n        campaigns: campaigns.length,\n        live: campaigns.filter(c => c.status === 'live').length,\n        impressions: totalImpressions,\n        clicks: totalClicks,\n        spend: totalSpend,\n        ctr: totalImpressions ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,\n        cpc: totalClicks ? Number((totalSpend / totalClicks).toFixed(2)) : 0\n      },\n      byFormat\n    });\n  } catch (error) {\n    console.error('Ad summary error:', error);\n    fail(res, 500, 'SERVER_ERROR', 'Failed to load advertising summary.');\n  }\n});\n\n// Admin campaign management: review queue, filters and aggregate delivery stats.
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 25 } = req.query;
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const where = {};
    if (status && ['review', 'live', 'paused', 'ended', 'rejected'].includes(status)) where.status = status;
    if (search) {
      const term = String(search).trim();
      where[Op.or] = [
        { name: { [Op.iLike]: '%' + term + '%' } },
        { headline: { [Op.iLike]: '%' + term + '%' } }
      ];
    }
    const { rows, count } = await AdCampaign.findAndCountAll({
      where,
      include: [{ model: User, as: 'advertiser', attributes: ['id','firstName','lastName','email','role','subscription'] }],
      limit: parsedLimit,
      offset: (parsedPage - 1) * parsedLimit,
      order: [['createdAt', 'DESC']]
    });
    const [review, live, paused, ended, rejected] = await Promise.all(
      ['review','live','paused','ended','rejected'].map(s => AdCampaign.count({ where: { status: s } }))
    );
    const [impressions, clicks, spend] = await Promise.all([
      AdCampaign.sum('impressions'),
      AdCampaign.sum('clicks'),
      AdCampaign.sum('spend')
    ]);
    ok(res, rows, {
      pagination: { total: count, page: parsedPage, pages: Math.ceil(count / parsedLimit) },
      stats: { review, live, paused, ended, rejected, impressions: Number(impressions || 0), clicks: Number(clicks || 0), spend: Number(spend || 0) }
    });
  } catch (error) {
    console.error('Admin ads list error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to load advertising campaigns.');
  }
});

router.get('/admin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, 'VALIDATION', 'Invalid campaign ID.');
    const campaign = await AdCampaign.findByPk(req.params.id, {
      include: [{ model: User, as: 'advertiser', attributes: ['id','firstName','lastName','email','role','subscription','createdAt'] }]
    });
    if (!campaign) return fail(res, 404, 'NOT_FOUND', 'Campaign not found.');
    ok(res, campaign);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to load campaign.');
  }
});

router.patch('/admin/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return fail(res, 400, 'VALIDATION', 'Invalid campaign ID.');
    const campaign = await AdCampaign.findByPk(req.params.id);
    if (!campaign) return fail(res, 404, 'NOT_FOUND', 'Campaign not found.');
    const status = clean(req.body && req.body.status, 20);
    if (!['live','paused','ended'].includes(status)) return fail(res, 400, 'VALIDATION', 'Admin status must be live, paused, or ended.');
    await campaign.update({ status });
    try {
      await AdminAuditLog.create({
        adminId: req.userId,
        action: 'ad_campaign_status_updated',
        targetType: 'ad_campaign',
        targetId: campaign.id,
        details: JSON.stringify({ status }),
        ipAddress: req.ip
      });
    } catch (auditError) {
      console.warn('Ad campaign audit log failed:', auditError.message);
    }
    ok(res, { campaign });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update campaign status.');
  }
});

module.exports = router;
