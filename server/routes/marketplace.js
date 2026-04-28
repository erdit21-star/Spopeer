// Updated
/**
 * Marketplace Routes
 * GET    /api/marketplace/listings       - List listings with filters
 * GET    /api/marketplace/search         - Search listings
 * GET    /api/marketplace/my-listings    - Get current user's listings
 * GET    /api/marketplace/saved          - Get saved/bookmarked listings
 * GET    /api/marketplace/seller/:userId - Get seller's listings
 * GET    /api/marketplace/trending-searches - Trending search terms
 * POST   /api/marketplace/listings       - Create a listing
 * GET    /api/marketplace/listings/:id   - Get single listing
 * PATCH  /api/marketplace/listings/:id   - Update own listing
 * DELETE /api/marketplace/listings/:id   - Delete own listing
 * PATCH  /api/marketplace/listings/:id/status - Update listing status
 * POST   /api/marketplace/listings/:id/flag   - Flag listing
 * POST   /api/marketplace/saved/:listingId    - Toggle save listing
 * POST   /api/marketplace/inquiries      - Create inquiry
 * GET    /api/marketplace/inquiries/received - Seller's received inquiries
 * GET    /api/marketplace/inquiries/sent     - Buyer's sent inquiries
 * PATCH  /api/marketplace/inquiries/:id/status - Update inquiry status
 */
const express = require('express');
const router = express.Router();
const { Listing, User, SavedListing, Inquiry } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sanitizeString, parsePagination } = require('../utils/validation');

// ─── SEARCH LISTINGS ───
const { ok, created, fail } = require('../utils/response');
router.get('/search', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { q, category, sport, minPrice, maxPrice } = req.query;
    const where = { status: 'active' };

    if (q) {
      const term = sanitizeString(q, 200);
      where[Op.or] = [
        { title: { [Op.iLike]: `%${term}%` } },
        { description: { [Op.iLike]: `%${term}%` } }
      ];
    }
    if (category) where.category = sanitizeString(category, 100);
    if (sport) where.sport = sanitizeString(sport, 100);
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    const offset = (page - 1) * limit;
    const { rows: listings, count } = await Listing.findAndCountAll({
      where,
      include: [{ model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl', 'role'] }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, listings, { pagination: { total: count, page, pages: Math.ceil(count / limit) } });
  } catch (error) {
    console.error('Search listings error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Search failed.');
  }
});

// ─── MY LISTINGS ───
router.get('/my-listings', authenticate, async (req, res) => {
  try {
    const listings = await Listing.findAll({
      where: { sellerId: req.userId },
      order: [['createdAt', 'DESC']]
    });
    ok(res, listings);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch your listings.');
  }
});

// ─── GET SAVED LISTINGS ───
router.get('/saved', authenticate, async (req, res) => {
  try {
    const saved = await SavedListing.findAll({ where: { userId: req.userId } });
    const listingIds = saved.map(s => s.listingId);

    if (listingIds.length === 0) {
      return ok(res, []);
    }

    const listings = await Listing.findAll({
      where: { id: { [Op.in]: listingIds } },
      include: [{ model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl'] }]
    });

    ok(res, listings);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch saved listings.');
  }
});

// ─── SELLER LISTINGS ───
router.get('/seller/:userId', async (req, res) => {
  try {
    const listings = await Listing.findAll({
      where: { sellerId: req.params.userId, status: 'active' },
      include: [{ model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']]
    });
    ok(res, listings);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch seller listings.');
  }
});

// ─── TRENDING SEARCHES ───
router.get('/trending-searches', async (_req, res) => {
  // Placeholder — replace with real analytics later
  ok(res, ['Football boots', 'Tennis racket', 'Gym equipment', 'Running shoes', 'Basketball']);
});

// ─── TOGGLE SAVE LISTING ───
router.post('/saved/:listingId', authenticate, async (req, res) => {
  try {
    const existing = await SavedListing.findOne({
      where: { userId: req.userId, listingId: req.params.listingId }
    });

    if (existing) {
      await existing.destroy();
      return ok(res, { saved: false });
    }

    await SavedListing.create({ userId: req.userId, listingId: parseInt(req.params.listingId) });
    ok(res, { saved: true });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to toggle save.');
  }
});

// ─── CREATE INQUIRY ───
router.post('/inquiries', authenticate, async (req, res) => {
  try {
    const { listing_id, message } = req.body;
    if (!listing_id) {
      return fail(res, 400, 'VALIDATION', 'listing_id is required.');
    }

    const listing = await Listing.findByPk(listing_id);
    if (!listing) {
      return fail(res, 404, 'NOT_FOUND', 'Listing not found.');
    }

    const inquiry = await Inquiry.create({
      buyerId: req.userId,
      sellerId: listing.sellerId,
      listingId: listing_id,
      message: message || ''
    });

    created(res, inquiry);
  } catch (error) {
    console.error('Create inquiry error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create inquiry.');
  }
});

// ─── GET RECEIVED INQUIRIES ───
router.get('/inquiries/received', authenticate, async (req, res) => {
  try {
    const inquiries = await Inquiry.findAll({
      where: { sellerId: req.userId },
      order: [['createdAt', 'DESC']]
    });
    ok(res, inquiries);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch inquiries.');
  }
});

// ─── GET SENT INQUIRIES ───
router.get('/inquiries/sent', authenticate, async (req, res) => {
  try {
    const inquiries = await Inquiry.findAll({
      where: { buyerId: req.userId },
      order: [['createdAt', 'DESC']]
    });
    ok(res, inquiries);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch inquiries.');
  }
});

// ─── UPDATE INQUIRY STATUS ───
router.patch('/inquiries/:id/status', authenticate, async (req, res) => {
  try {
    const inquiry = await Inquiry.findByPk(req.params.id);
    if (!inquiry) {
      return fail(res, 404, 'NOT_FOUND', 'Inquiry not found.');
    }
    if (inquiry.sellerId !== req.userId) {
      return fail(res, 403, 'FORBIDDEN', 'Not authorized.');
    }

    await inquiry.update({ status: req.body.status });
    ok(res, inquiry);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update inquiry.');
  }
});

// ─── UPDATE LISTING STATUS ───
router.patch('/listings/:id/status', authenticate, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return fail(res, 404, 'NOT_FOUND', 'Listing not found.');
    if (listing.sellerId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'Not authorized.');

    await listing.update({ status: req.body.status });
    ok(res, listing);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update listing status.');
  }
});

// ─── FLAG LISTING ───
router.post('/listings/:id/flag', authenticate, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return fail(res, 404, 'NOT_FOUND', 'Listing not found.');

    // For now just log the flag; in production, create a Report model
    console.log(`Listing ${req.params.id} flagged by user ${req.userId}: ${req.body.reason}`);
    ok(res, { message: 'Listing flagged for review.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to flag listing.');
  }
});

// ─── LIST LISTINGS (public) ───
router.get('/listings', async (req, res) => {
  try {
    const { search, category, sport, listingType, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    const where = { status: 'active' };

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (category) where.category = category;
    if (sport) where.sport = sport;
    if (listingType) where.listingType = listingType;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: listings, count } = await Listing.findAndCountAll({
      where,
      include: [{ model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl', 'role'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    ok(res, listings, { pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) {
    console.error('List listings error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch listings.');
  }
});

// ─── CREATE LISTING ───
router.post('/listings', authenticate, async (req, res) => {
  try {
    const { title, description, price, currency, category, sport, listingType, imageUrls } = req.body;
    if (!title) return fail(res, 400, 'VALIDATION', 'Title is required.');

    const listing = await Listing.create({
      sellerId: req.userId,
      title,
      description,
      price,
      currency: currency || 'EUR',
      category,
      sport,
      listingType,
      imageUrls: imageUrls || []
    });

    created(res, listing);
  } catch (error) {
    console.error('Create listing error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to create listing.');
  }
});

// ─── GET SINGLE LISTING ───
router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'displayName', 'avatarUrl', 'role', 'location'] }]
    });
    if (!listing) return fail(res, 404, 'NOT_FOUND', 'Listing not found.');

    // Increment view count
    await listing.increment('viewCount');

    ok(res, listing);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch listing.');
  }
});

// ─── UPDATE LISTING ───
router.patch('/listings/:id', authenticate, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return fail(res, 404, 'NOT_FOUND', 'Listing not found.');
    if (listing.sellerId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'Not authorized.');

    const allowedFields = ['title', 'description', 'price', 'currency', 'category', 'sport', 'listingType', 'imageUrls', 'status'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await listing.update(updates);
    ok(res, listing);
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to update listing.');
  }
});

// ─── DELETE LISTING ───
router.delete('/listings/:id', authenticate, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return fail(res, 404, 'NOT_FOUND', 'Listing not found.');
    if (listing.sellerId !== req.userId) return fail(res, 403, 'FORBIDDEN', 'Not authorized.');

    await listing.update({ status: 'deleted' });
    ok(res, { message: 'Listing deleted.' });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to delete listing.');
  }
});

module.exports = router;

