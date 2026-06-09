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
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WEBP: RIFF....WEBP
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  // HEIC/HEIF: ftyp box at offset 4, brand heic/heif/mif1/msf1
  if (buf.length >= 12) {
    const ftyp = buf.slice(4, 8).toString('ascii');
    const brand = buf.slice(8, 12).toString('ascii');
    if (ftyp === 'ftyp') {
      if (['heic', 'heix', 'heif', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
      if (['mp42', 'mp41', 'isom', 'M4V ', 'M4A ', 'f4v ', 'avc1'].includes(brand)) return 'video/mp4';
      if (['qt  '].includes(brand)) return 'video/quicktime';
      // Generic ftyp mp4
      return 'video/mp4';
    }
  }
  // WebM: EBML
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return 'video/webm';
  // AVI: RIFF....AVI
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x41 && buf[9] === 0x56 && buf[10] === 0x49 && buf[11] === 0x20) return 'video/x-msvideo';
  return null;
}

// MIME group: treat these as equivalent for signature matching
const MIME_IMAGE_GROUP = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
const MIME_VIDEO_GROUP = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

// ── MIME → extension allow-list ──
const ALLOWED_TYPES = {
  'image/jpeg':  ['.jpg', '.jpeg', '.jfif'],
  'image/pjpeg': ['.jpg', '.jpeg', '.jfif'],
  'image/png':   ['.png'],
  'image/gif':   ['.gif'],
  'image/webp':  ['.webp'],
  'image/avif':  ['.avif'],
  'image/heic':  ['.heic'],
  'image/heif':  ['.heif'],
  'video/mp4':      ['.mp4'],
  'video/webm':     ['.webm'],
  'video/quicktime':['.mov'],
  'video/x-msvideo':['.avi']
};

const fileFilter = (_req, file, cb) => {
  const allowedExts = ALLOWED_TYPES[file.mimetype];
  if (!allowedExts) {
    const err = new Error('Only image and video files are allowed.');
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

// Always use memory storage so buffer is available for cloud upload
const memStorage = multer.memoryStorage();

const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024; // 10 MB
const storyMaxSize = parseInt(process.env.MAX_STORY_FILE_SIZE, 10) || 100 * 1024 * 1024; // 100 MB

const uploadAvatar = multer({ storage: memStorage, fileFilter, limits: { fileSize: maxSize, files: 1 } });
const uploadCover  = multer({ storage: memStorage, fileFilter, limits: { fileSize: maxSize, files: 1 } });
const uploadPost   = multer({ storage: memStorage, fileFilter, limits: { fileSize: maxSize * 2, files: 10 } }); // 20 MB each, up to 10 files
const uploadStory  = multer({ storage: memStorage, fileFilter, limits: { fileSize: storyMaxSize, files: 1 } }); // 100 MB

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

  if (isCloudEnabled()) {
    const publicId = safeFilename(prefix, userId, ''); // Cloudinary adds ext automatically
    const result = await uploadToCloud(file.buffer, { folder, publicId, resourceType });
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

module.exports = { uploadAvatar, uploadCover, uploadPost, uploadStory, persistFile, validateUploadedFile };


