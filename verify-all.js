// Updated
/**
 * Final verification test — loads all modules, routes, models, and services
 * without starting the server or connecting to the database.
 */
process.env.JWT_SECRET = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'spopeer';
process.env.DB_USER = 'app_user';
process.env.DB_PASSWORD = '';

const results = [];

function test(label, fn) {
  try {
    fn();
    results.push({ label, ok: true });
    console.log('  ✅ ' + label);
  } catch (e) {
    results.push({ label, ok: false, err: e.message });
    console.log('  ❌ ' + label + ' — ' + e.message);
  }
}

console.log('\n🔍 Spopeer Final Verification\n');

// Core deps
console.log('--- Core Packages ---');
test('express', () => require('express'));
test('cors', () => require('cors'));
test('helmet', () => require('helmet'));
test('express-rate-limit', () => require('express-rate-limit'));
test('dotenv', () => require('dotenv'));
test('jsonwebtoken', () => require('jsonwebtoken'));
test('bcryptjs', () => require('bcryptjs'));
test('multer', () => require('multer'));
test('pg', () => require('pg'));
test('sequelize', () => require('sequelize'));
test('uuid', () => require('uuid'));
test('socket.io', () => require('socket.io'));

// Config
console.log('\n--- Config ---');
test('database config', () => require('./server/config/database'));

// Models
console.log('\n--- Models ---');
test('models/index', () => {
  const m = require('./server/models');
  const expected = ['User', 'Post', 'Connection', 'Message', 'Job', 'Like', 'Comment', 'Notification', 'Group', 'GroupMember', 'Listing'];
  const missing = expected.filter(name => !m[name]);
  if (missing.length) throw new Error('Missing models: ' + missing.join(', '));
  console.log('    (' + expected.length + ' models loaded)');
});

// Routes
console.log('\n--- Routes ---');
test('routes/auth', () => require('./server/routes/auth'));
test('routes/users', () => require('./server/routes/users'));
test('routes/posts', () => require('./server/routes/posts'));
test('routes/connections', () => require('./server/routes/connections'));
test('routes/messages', () => require('./server/routes/messages'));
test('routes/admin', () => require('./server/routes/admin'));
test('routes/notifications', () => require('./server/routes/notifications'));
test('routes/groups', () => require('./server/routes/groups'));
test('routes/marketplace', () => require('./server/routes/marketplace'));

// Services
console.log('\n--- Services ---');
test('services/socket', () => require('./server/services/socket'));
test('services/cloudinary', () => require('./server/services/cloudinary'));
test('services/email', () => require('./server/services/email'));

// Middleware
console.log('\n--- Middleware ---');
test('middleware/auth', () => require('./server/middleware/auth'));
test('middleware/admin', () => require('./server/middleware/admin'));
test('middleware/upload', () => require('./server/middleware/upload'));

// Summary
const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
console.log('\n══════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length}`);
if (failed > 0) {
  console.log('\nFailed:');
  results.filter(r => !r.ok).forEach(r => console.log('  - ' + r.label + ': ' + r.err));
}
console.log('══════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);

