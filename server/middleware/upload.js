/**
 * File Upload Middleware (Multer)
 * Handles profile images, cover photos, post media
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const avatarsDir = path.join(uploadDir, 'avatars');
const coversDir = path.join(uploadDir, 'covers');
const postsDir = path.join(uploadDir, 'posts');

[uploadDir, avatarsDir, coversDir, postsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed MIME types mapped to their valid extensions
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov']
};

// File filter - check MIME type AND extension match
const fileFilter = (req, file, cb) => {
  const allowedExts = ALLOWED_TYPES[file.mimetype];
  if (!allowedExts) {
    return cb(new Error('Only image and video files are allowed.'), false);
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(new Error(`Extension ${ext} does not match MIME type ${file.mimetype}.`), false);
  }

  cb(null, true);
};

// Generate safe random filename (prevents path traversal via originalname)
function safeFilename(prefix, userId, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}-${userId}-${Date.now()}-${rand}${ext}`;
}

// Storage config for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => cb(null, safeFilename('avatar', req.userId, file.originalname))
});

// Storage config for cover photos
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, coversDir),
  filename: (req, file, cb) => cb(null, safeFilename('cover', req.userId, file.originalname))
});

// Storage config for post media
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, postsDir),
  filename: (req, file, cb) => cb(null, safeFilename('post', req.userId, file.originalname))
});

const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: maxSize, files: 1 }
});
const uploadCover = multer({
  storage: coverStorage,
  fileFilter,
  limits: { fileSize: maxSize, files: 1 }
});
const uploadPost = multer({
  storage: postStorage,
  fileFilter,
  limits: { fileSize: maxSize * 2, files: 1 } // 10MB for posts
});

module.exports = { uploadAvatar, uploadCover, uploadPost };

