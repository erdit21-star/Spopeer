// Updated
/**
 * File Upload Middleware (Multer → Cloudinary or local disk)
 *
 * Uses memory storage so that the buffer is available for Cloudinary upload.
 * When Cloudinary is not configured, the buffer is written to local disk.
 *
 * After multer runs the route handler calls `req.uploadFile(folder)` which
 * returns `{ url, provider }`.
 */
const multer = require('multer');
const path = require('path');
const { uploadToCloud, saveLocal, safeFilename, isCloudEnabled } = require('../services/cloudinary');

// ── MIME → extension allow-list ──
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov']
};

const fileFilter = (_req, file, cb) => {
  const allowedExts = ALLOWED_TYPES[file.mimetype];
  if (!allowedExts) return cb(new Error('Only image and video files are allowed.'), false);
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) return cb(new Error(`Extension ${ext} does not match MIME type ${file.mimetype}.`), false);
  cb(null, true);
};

// Always use memory storage so buffer is available for cloud upload
const memStorage = multer.memoryStorage();

const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5 MB

const uploadAvatar = multer({ storage: memStorage, fileFilter, limits: { fileSize: maxSize, files: 1 } });
const uploadCover  = multer({ storage: memStorage, fileFilter, limits: { fileSize: maxSize, files: 1 } });
const uploadPost   = multer({ storage: memStorage, fileFilter, limits: { fileSize: maxSize * 2, files: 1 } }); // 10 MB

/**
 * Persist the uploaded file (Cloudinary when available, local disk otherwise).
 *
 * @param {object} file          multer file object (req.file)
 * @param {string} folder        'avatars' | 'covers' | 'posts'
 * @param {number|string} userId owner id
 * @returns {Promise<{url:string, provider:string}>}
 */
async function persistFile(file, folder, userId) {
  const ext = path.extname(file.originalname).toLowerCase();
  const prefix = folder === 'avatars' ? 'avatar' : folder === 'covers' ? 'cover' : 'post';
  const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';

  if (isCloudEnabled()) {
    const publicId = safeFilename(prefix, userId, ''); // Cloudinary adds ext automatically
    const result = await uploadToCloud(file.buffer, { folder, publicId, resourceType });
    return { url: result.url, provider: 'cloudinary', publicId: result.publicId };
  }

  // Fallback: write to local disk
  const filename = safeFilename(prefix, userId, ext);
  const url = await saveLocal(file.buffer, folder, filename);
  return { url, provider: 'local' };
}

module.exports = { uploadAvatar, uploadCover, uploadPost, persistFile };


