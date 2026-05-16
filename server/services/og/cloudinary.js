const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

async function uploadOgImage(buffer, publicId) {
  if (!isCloudinaryConfigured()) {
    const err = new Error('Cloudinary is not configured.');
    err.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw err;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'spopeer/og-cards',
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        format: 'png',
        transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto' }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

module.exports = {
  uploadOgImage,
  isCloudinaryConfigured
};
