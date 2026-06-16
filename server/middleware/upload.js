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


/**
 * Detect actual content type from buffer magic bytes.
 * Returns detected mime string or null if unknown.
 */
function detectMimeFromBuffer(buf) {
  if (!buf || buf.length < 4) return null;
  // JPEG
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  // WEBP: RIFF....WEBP
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  // MP4/MOV: ftyp box at offset 4
  if (buf.length >= 12) {
    const ftyp = buf.slice(4, 8).toString('ascii');
    const brand = buf.slice(8, 12).toString('ascii');
    if (ftyp === 'ftyp') {
      if (['mp42', 'mp41', 'isom', 'M4V ', 'M4A ', 'f4v ', 'avc1'].includes(brand)) return 'video/mp4';
      if (['qt  '].includes(brand)) return 'video/quicktime';
      // Generic ftyp mp4
      return 'video/mp4';
    }
  }
  return null;
}

// MIME group: treat these as equivalent for signature matching
const MIME_IMAGE_GROUP = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/webp'];
const MIME_VIDEO_GROUP = ['video/mp4', 'video/quicktime', 'video/webm'];

// ── MIME → extension allow-list ──
const ALLOWED_TYPES = {
  'image/jpeg':  ['.jpg', '.jpeg', '.jfif'],
  'image/pjpeg': ['.jpg', '.jpeg', '.jfif'],
  'image/png':   ['.png'],
  'image/webp':  ['.webp'],
  'video/mp4':      ['.mp4'],
  'video/quicktime':['.mov'],
  'video/webm':     ['.webm']
};

// Explicitly rejected types — never allow SVG (XSS risk)
const REJECTED_TYPES = new Set(['image/svg+xml', 'text/html', 'application/javascript']);

// Per-type size limits
const IMAGE_MAX_BYTES = parseInt(process.env.MAX_IMAGE_SIZE, 10) || 8 * 1024 * 1024;   //  8 MB
const VIDEO_MAX_BYTES = parseInt(process.env.MAX_VIDEO_SIZE, 10) || 100 * 1024 * 1024; // 100 MB

const fileFilter = (_req, file, cb) => {
  // Explicitly reject dangerous MIME types
  if (REJECTED_TYPES.has(file.mimetype)) {
    const err = new Error(`File type ${file.mimetype} is not allowed.`);
    err.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(err, false);
  }

  const allowedExts = ALLOWED_TYPES[file.mimetype];
  if (!allowedExts) {
    const err = new Error('Only image (JPEG/PNG/WEBP) and video (MP4/MOV/WEBM) files are allowed.');
    err.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(err, false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    const err = new Error(`Extension ${ext} does not match MIME type ${file.mimetype}.`);
    err.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(err, false);
  }
  cb(null, true);
};

// Per-type size enforcement middleware (runs after multer collects the buffer)
function enforceFileSizeLimits(req, res, next) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((v) => Array.isArray(v) ? files.push(...v) : null);
  }

  for (const file of files) {
    const isVideo = MIME_VIDEO_GROUP.includes(file.mimetype);
    const limit = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
    if (file.size > limit) {
      const limitMB = Math.round(limit / (1024 * 1024));
      const err = new Error(`File too large. Maximum size for ${isVideo ? 'videos' : 'images'} is ${limitMB}MB.`);
      err.code = 'FILE_TOO_LARGE';
      err.status = 413;
      return next(err);
    }
  }
  next();
}

// Always use memory storage so buffer is available for cloud upload
const memStorage = multer.memoryStorage();

// Use video max as the multer hard cap; per-type enforcement done in enforceFileSizeLimits
const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || VIDEO_MAX_BYTES;
const storyMaxSize = parseInt(process.env.MAX_STORY_FILE_SIZE, 10) || VIDEO_MAX_BYTES;

const uploadAvatar = multer({ storage: memStorage, fileFilter, limits: { fileSize: IMAGE_MAX_BYTES, files: 1 } });
const uploadCover  = multer({ storage: memStorage, fileFilter, limits: { fileSize: IMAGE_MAX_BYTES, files: 1 } });
const uploadPost   = multer({ storage: memStorage, fileFilter, limits: { fileSize: VIDEO_MAX_BYTES, files: 10 } });
const uploadStory  = multer({ storage: memStorage, fileFilter, limits: { fileSize: VIDEO_MAX_BYTES, files: 1 } });

/**
 * Express middleware: validate uploaded file magic bytes match declared MIME type.
 * Must run after a multer middleware (req.file or req.files will be populated).
 * Rejects with 415 if actual content doesn't match declared MIME.
 */
function validateUploadedFile(req, res, next) {
  const files = [];
  if (req.file) {
    files.push(req.file);
  }
  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((value) => {
      if (Array.isArray(value)) {
        files.push(...value);
      }
    });
  }

  for (const file of files) {
    if (!file || !file.buffer) continue;

    const declared = file.mimetype;
    const detected = detectMimeFromBuffer(file.buffer);
    if (!detected) {
      continue;
    }

    const declaredIsImage = MIME_IMAGE_GROUP.includes(declared);
    const detectedIsImage = MIME_IMAGE_GROUP.includes(detected);
    const declaredIsVideo = MIME_VIDEO_GROUP.includes(declared);
    const detectedIsVideo = MIME_VIDEO_GROUP.includes(detected);

    const groupMatch =
      (declaredIsImage && detectedIsImage) ||
      (declaredIsVideo && detectedIsVideo) ||
      (declared === detected);

    if (!groupMatch) {
      const err = new Error(`File content does not match declared type (declared: ${declared}, detected: ${detected}).`);
      err.code = 'UNSUPPORTED_FILE_TYPE';
      err.status = 415;
      return next(err);
    }
  }

  next();
}

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
  const envPrefix = process.env.NODE_ENV === 'production' ? 'production' : 'staging';

  if (isCloudEnabled()) {
    const cloudFolder = `spopeer/${envPrefix}/users/${userId}/${folder}`;
    const publicId = safeFilename(prefix, userId, ''); // Cloudinary adds ext automatically
    const result = await uploadToCloud(file.buffer, { folder: cloudFolder, publicId, resourceType });
    return { url: result.url, provider: 'cloudinary', publicId: result.publicId };
  }

  // In production we require cloud storage — do not silently fall back to disk.
  if (process.env.NODE_ENV === 'production' && !isCloudEnabled()) {
    const err = new Error('Uploads require cloud storage in production');
    err.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw err;
  }

  // Fallback: write to local disk (non-production)
  const filename = safeFilename(prefix, userId, ext);
  const url = await saveLocal(file.buffer, folder, filename);
  return { url, provider: 'local' };
}

module.exports = { uploadAvatar, uploadCover, uploadPost, uploadStory, persistFile, validateUploadedFile, enforceFileSizeLimits };


