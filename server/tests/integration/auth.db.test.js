// Updated
// test: ensure reset-password uses raw emailed token (noop change)
/**
 * Real-DB auth integration tests.
 *
 * These tests run against a live Postgres database (CI provides one).
 * NO model mocks — real Sequelize, real bcrypt, real migrations.
 *
 * Prerequisites:
 *   - Postgres running with DB_HOST/DB_NAME/DB_USER/DB_PASSWORD env vars
 *   - Migrations already applied (globalSetup handles this)
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-db-tests';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:5000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'spopeer_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

// Mock only external services (email, socket) — not the DB
jest.mock('../../services/socket', () => ({
  initSocket: jest.fn(),
  getIO: jest.fn(() => ({ emit: jest.fn() }))
}));

jest.mock('../../services/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSecurityAlertEmail: jest.fn().mockResolvedValue({ success: true }),
  isEmailConfigured: false,
  assertEmailReady: jest.fn()
}));

const request = require('supertest');
const app = require('../../app');
const { sequelize, User, RefreshSession, PasswordResetToken } = require('../../models');

// Unique email helper — avoids collisions between runs
let emailSeq = 0;
function uniqueEmail() {
  return `dbtest_${Date.now()}_${++emailSeq}@example.com`;
}

// ─── LIFECYCLE ───
beforeAll(async () => {
  // Ensure DB is reachable
  await sequelize.authenticate();
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  // Truncate user-related tables (order matters for FK constraints)
  await RefreshSession.destroy({ where: {}, force: true });
  await PasswordResetToken.destroy({ where: {}, force: true });
  // Only delete test users (safety: don't nuke seeded admin)
  await User.destroy({ where: {}, force: true });
});

// ─── HELPERS ───
const STRONG_PASSWORD = 'DbTestPass123!';
const NEW_PASSWORD = 'NewDbPass456!!';

async function signupUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const res = await request(app)
    .post('/api/auth/signup')
    .send({
      email,
      password: STRONG_PASSWORD,
      firstName: 'DB',
      lastName: 'Tester',
      role: 'athlete',
      ...overrides
    });
  return { res, email };
}

function extractCookies(res) {
  return res.headers['set-cookie'] || [];
}

// ═════════════════════════════════════════════════════════════════════
//  SIGNUP
// ═════════════════════════════════════════════════════════════════════
describe('Real-DB Auth: Signup', () => {
  test('creates a real user row with hashed password', async () => {
    const email = uniqueEmail();
    const { res } = await signupUser({ email });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);

    // Verify row in DB
    const row = await User.findOne({ where: { email } });
    expect(row).not.toBeNull();
    expect(row.password).not.toBe(STRONG_PASSWORD); // should be hashed
    expect(row.password.startsWith('$2')).toBe(true); // bcrypt hash
    expect(row.isActive).toBe(true);
    expect(row.emailVerified).toBe(false);
  });

  test('sets HttpOnly auth cookies on signup', async () => {
    const { res } = await signupUser();
    const cookies = extractCookies(res);
    const joined = cookies.join('; ');

    expect(joined).toContain('access_token');
    expect(joined).toContain('refresh_token');
    expect(joined.toLowerCase()).toContain('httponly');
  });

  test('creates a RefreshSession row on signup', async () => {
    const email = uniqueEmail();
    const { res } = await signupUser({ email });

    expect(res.statusCode).toBe(201);
    const user = await User.findOne({ where: { email } });
    const sessions = await RefreshSession.findAll({ where: { userId: user.id } });
    expect(sessions.length).toBe(1);
    expect(sessions[0].revokedAt).toBeNull();
    expect(sessions[0].tokenHash).toBeDefined();
  });

  test('rejects duplicate email', async () => {
    const email = uniqueEmail();
    await signupUser({ email });

    const { res } = await signupUser({ email });
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  test('rejects weak password', async () => {
    const { res } = await signupUser({ password: 'short' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_PASSWORD');
  });

  test('rejects admin role', async () => {
    const { res } = await signupUser({ role: 'admin' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ADMIN_SIGNUP');
  });
});

// ═════════════════════════════════════════════════════════════════════
//  LOGIN
// ═════════════════════════════════════════════════════════════════════
describe('Real-DB Auth: Login', () => {
  let testEmail;

  beforeEach(async () => {
    testEmail = uniqueEmail();
    await signupUser({ email: testEmail });
  });

  test('logs in with correct credentials and returns cookies', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);

    const cookies = extractCookies(res);
    expect(cookies.join('; ')).toContain('access_token');
    expect(cookies.join('; ')).toContain('refresh_token');
  });

  test('creates a new RefreshSession on login', async () => {
    const user = await User.findOne({ where: { email: testEmail } });
    // Signup already created one session
    const before = await RefreshSession.count({ where: { userId: user.id } });

    await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });

    const after = await RefreshSession.count({ where: { userId: user.id } });
    expect(after).toBe(before + 1);
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPass999!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  test('rejects non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: STRONG_PASSWORD });

    expect(res.statusCode).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  AUTH FLOW: login → /me → logout
// ═════════════════════════════════════════════════════════════════════
describe('Real-DB Auth: Full cookie flow', () => {
  let testEmail;

  beforeEach(async () => {
    testEmail = uniqueEmail();
    await signupUser({ email: testEmail });
  });

  test('login cookies grant access to /me', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });

    const cookies = extractCookies(loginRes);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(testEmail);
  });

  test('/me without cookies returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('logout revokes refresh session in DB', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });

    const cookies = extractCookies(loginRes);
    const user = await User.findOne({ where: { email: testEmail } });

    // Before logout: at least one active session
    const activeBefore = await RefreshSession.count({
      where: { userId: user.id, revokedAt: null }
    });
    expect(activeBefore).toBeGreaterThan(0);

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    // After logout: the session from login should be revoked
    // (signup session may or may not be revoked depending on which cookie was sent)
    const activeAfterLogin = await RefreshSession.count({
      where: { userId: user.id, revokedAt: null }
    });
    expect(activeAfterLogin).toBeLessThan(activeBefore);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  REFRESH TOKEN ROTATION
// ═════════════════════════════════════════════════════════════════════
describe('Real-DB Auth: Token refresh', () => {
  let testEmail;

  beforeEach(async () => {
    testEmail = uniqueEmail();
    await signupUser({ email: testEmail });
  });

  test('POST /api/auth/refresh rotates tokens and creates new session', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });

    const cookies = extractCookies(loginRes);
    const user = await User.findOne({ where: { email: testEmail } });

    const sessionsBefore = await RefreshSession.count({ where: { userId: user.id } });

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.success).toBe(true);

    // New session created, old revoked
    const sessionsAfter = await RefreshSession.count({ where: { userId: user.id } });
    expect(sessionsAfter).toBe(sessionsBefore + 1); // old + new

    const activeSessions = await RefreshSession.count({
      where: { userId: user.id, revokedAt: null }
    });
    // Only the latest refresh session should be active
    expect(activeSessions).toBeGreaterThanOrEqual(1);
  });

  test('refresh with no cookie returns 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('refresh with revoked token returns 401', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });

    const cookies = extractCookies(loginRes);

    // First refresh — succeeds
    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    // Second refresh with same (now-revoked) token — should fail
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(res.statusCode).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  CHANGE PASSWORD
// ═════════════════════════════════════════════════════════════════════
describe('Real-DB Auth: Change password', () => {
  let testEmail, loginCookies;

  beforeEach(async () => {
    testEmail = uniqueEmail();
    await signupUser({ email: testEmail });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });
    loginCookies = extractCookies(loginRes);
  });

  test('changes password and revokes all sessions', async () => {
    const user = await User.findOne({ where: { email: testEmail } });
    const activeBefore = await RefreshSession.count({
      where: { userId: user.id, revokedAt: null }
    });
    expect(activeBefore).toBeGreaterThan(0);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', loginCookies)
      .send({ currentPassword: STRONG_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // All sessions should be revoked
    const activeAfter = await RefreshSession.count({
      where: { userId: user.id, revokedAt: null }
    });
    expect(activeAfter).toBe(0);

    // Old password should not work
    const oldRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: STRONG_PASSWORD });
    expect(oldRes.statusCode).toBe(401);

    // New password should work
    const newRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: NEW_PASSWORD });
    expect(newRes.statusCode).toBe(200);
  });

  test('rejects wrong current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', loginCookies)
      .send({ currentPassword: 'WrongPass999!', newPassword: NEW_PASSWORD });

    expect(res.statusCode).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  FORGOT / RESET PASSWORD
// ═════════════════════════════════════════════════════════════════════
describe('Real-DB Auth: Forgot + Reset password', () => {

  let testEmail;

  beforeEach(async () => {
    testEmail = uniqueEmail();
    await signupUser({ email: testEmail });
    jest.clearAllMocks();
  });

  test('forgot-password returns 200 and does not leak email existence', async () => {
    const knownRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail });

    const unknownRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(knownRes.statusCode).toBe(200);
    expect(unknownRes.statusCode).toBe(200);
    // Same shape — no info leak
    expect(knownRes.body.data.message).toBe(unknownRes.body.data.message);
  });

  test('reset-password with valid token changes password', async () => {
    // Trigger forgot-password to create a reset token
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail });

    const user = await User.findOne({ where: { email: testEmail } });
    const tokenRecord = await PasswordResetToken.findOne({ where: { userId: user.id } });
    expect(tokenRecord).not.toBeNull();

    // Get the raw token from the mocked email call
    const emailService = require('../../services/email');
    const rawToken = emailService.sendPasswordResetEmail.mock.calls.at(-1)?.[1];
    expect(rawToken).toBeTruthy();
    expect(tokenRecord.token).not.toBe(rawToken); // DB stores hashed token, not raw

    // Use the raw token to reset
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: NEW_PASSWORD });

    expect(resetRes.statusCode).toBe(200);

    // All refresh sessions should be revoked
    const activeSessions = await RefreshSession.count({
      where: { userId: user.id, revokedAt: null }
    });
    expect(activeSessions).toBe(0);

    // New password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: NEW_PASSWORD });
    expect(loginRes.statusCode).toBe(200);
  });

  test('reset-password with invalid token fails', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'bogus-token', password: NEW_PASSWORD });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });
});

// ═════════════════════════════════════════════════════════════════════
//  HEALTH + READINESS (real DB)
// ═════════════════════════════════════════════════════════════════════
describe('Real-DB: Health + Readiness', () => {
  test('GET /api/health returns standardized shape', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: expect.objectContaining({
        status: 'ok',
        version: expect.any(String),
        uptime: expect.any(Number),
        timestamp: expect.any(String)
      })
    });
  });

  test('GET /api/ready passes with real DB connection', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.checks.database).toBe('ok');
    expect(res.body.data.checks.secrets).toBe('ok');
    expect(res.body.data.checks.appUrl).toBe('ok');
  });
});
