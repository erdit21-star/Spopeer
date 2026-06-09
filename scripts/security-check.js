const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function has(rel, pattern) {
  const txt = read(rel);
  return pattern.test(txt);
}

function report(name, pass, detail) {
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` - ${detail}` : ''}`);
  return pass;
}

let ok = true;

// CSRF
ok = report('CSRF middleware wired', has('server/app.js', /csrfProtection\(/), 'csrfProtection present') && ok;
ok = report('Global API CSRF gate', has('server/app.js', /app\.use\('\/api',/), 'api csrf gate present') && ok;

// Rate limits
ok = report('API limiter enabled', has('server/app.js', /const apiLimiter = createLimiter/), 'api limiter present') && ok;
ok = report('Search limiter enabled', has('server/app.js', /const searchLimiter = createLimiter/), 'search limiter present') && ok;
ok = report('Per-user limiter enabled', has('server/app.js', /createPerUserLimiter/), 'per-user limiter present') && ok;

// Private post URL protection
ok = report('Post visibility checks on GET /:id', has('server/routes/posts.js', /router\.get\('\/:id'.+visibility/s), 'visibility check in single-post route') && ok;

// Block checks
ok = report('Blocked users cannot message', has('server/routes/messages.js', /BLOCKED/), 'block checks in messages routes') && ok;
ok = report('Blocked users cannot comment', has('server/routes/posts.js', /You cannot comment on this post/), 'block check in comment route') && ok;

// Upload limits and file validation
ok = report('Upload file size limits configured', has('server/middleware/upload.js', /limits:\s*\{\s*fileSize:/), 'multer limits configured') && ok;
ok = report('Upload MIME/extension validation', has('server/middleware/upload.js', /ALLOWED_TYPES/), 'allowed mime map present') && ok;
ok = report('Upload magic-byte validation', has('server/middleware/upload.js', /detectMimeFromBuffer/), 'signature validation present') && ok;

if (!ok) {
  process.exitCode = 1;
}
