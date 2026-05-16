const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { User } = require('../models');
const {
  getProfileCardDataBySlug,
  updateProfileOgImage
} = require('../services/og/profile-card-data');
const { renderProfileCardPng } = require('../services/og/profile-card-renderer');
const { uploadOgImage } = require('../services/og/cloudinary');

function safePublicId(value) {
  return String(value || 'profile')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

router.get('/profile/:slug.png', async (req, res) => {
  try {
    const profile = await getProfileCardDataBySlug(req.params.slug);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const pngBuffer = await renderProfileCardPng(profile);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.send(pngBuffer);
  } catch (error) {
    console.error('OG image generation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate OG image' });
  }
});

router.post('/profile/:slug/regenerate', authenticate, async (req, res) => {
  try {
    const profile = await getProfileCardDataBySlug(req.params.slug);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const owner = await User.findByPk(profile.userId);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const isOwner = Number(req.userId) === Number(owner.id);
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed to regenerate this profile card.' });
    }

    const pngBuffer = await renderProfileCardPng(profile);
    const publicId = safePublicId(`${profile.publicSlug}-${profile.cardStyle}-v${Date.now()}`);
    const upload = await uploadOgImage(pngBuffer, publicId);

    await updateProfileOgImage(profile.id, upload.secure_url);

    return res.json({ success: true, ogImageUrl: upload.secure_url });
  } catch (error) {
    console.error('OG image regenerate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to regenerate profile card' });
  }
});

module.exports = router;
