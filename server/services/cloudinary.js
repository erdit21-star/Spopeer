// Updated
/**
 * Cloudinary Service
 *
 * Activated when CLOUDINARY_URL -or- CLOUDINARY_CLOUD_NAME is set.
 * Falls back to local disk storage transparently when not configured.
 */
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

let _cloudinary = null;
let _ready = false;

function getClient() {
  if (_ready) return _cloudinary;
  _ready = true;

  const hasConfig = process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

  if (!hasConfig) {
    console.warn('[CLOUDINARY] Not configured — uploads will use local disk. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
    return null;
  }

  try {
    const cloudinary = require('cloudinary').v2;
    if (!process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
    _cloudinary = cloudinary;
    console.log('[CLOUDINARY] Configured successfully.');
    return _cloudinary;
  } catch (err) {
    console.error('[CLOUDINARY] Init failed:', err.message);
    return null;
  }
}

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} opts
 * @param {string} opts.folder       - e.g. 'avatars', 'covers', 'posts'
 * @param {string} opts.publicId     - Desired public_id (no extension)
 * @param {string} opts.resourceType - 'image' | 'video' | 'auto'
 * @returns {Promise<{url: string, publicId: string, provider: string}>}
 */
async function uploadToCloud(buffer, { folder, publicId, resourceType = 'auto' }) {
  const client = getClient();
  if (!client) throw new Error('Cloudinary not configured');

  return new Promise((resolve, reject) => {
    const transform = folder === 'avatars'
      ? [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }]
      : folder === 'covers'
        ? [{ width: 1200, height: 400, crop: 'fill', quality: 'auto' }]
        : undefined;

    const stream = client.uploader.upload_stream(
      { folder: `spopeer/${folder}`, public_id: publicId, resource_type: resourceType, overwrite: true, transformation: transform },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id, provider: 'cloudinary' });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete from Cloudinary by public_id.
 */
async function deleteFromCloud(publicId, resourceType = 'image') {
  const client = getClient();
  if (!client) return;
  try { await client.uploader.destroy(publicId, { resource_type: resourceType }); }
  catch (err) { console.error('[CLOUDINARY] Delete failed:', err.message); }
}

/**
 * Save a buffer to local disk (fallback).
 * @returns {string} relative URL path
 */
async function saveLocal(buffer, subdir, filename) {
  const dir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', subdir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`;
}

/**
 * Generate a safe random filename.
 */
function safeFilename(prefix, userId, ext) {
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}-${userId}-${Date.now()}-${rand}${ext}`;
}

/**
 * @returns {boolean}
 */
function isCloudEnabled() {
  return !!getClient();
}

module.exports = { uploadToCloud, deleteFromCloud, saveLocal, safeFilename, isCloudEnabled, getClient };


