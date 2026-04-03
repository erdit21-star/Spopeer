/**
 * Integration tests for auth endpoints.
 * Uses supertest against the Express app with mocked database models.
 */

// Set test env vars before any app code loads
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'spopeer_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Mock winston
jest.mock('winston', () => {
  const noop = jest.fn(function () { return noop; });
  const mockFormat = new Proxy({}, { get: () => noop });
  return {
    createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), add: jest.fn() }),
    format: mockFormat,
    transports: { Console: jest.fn(), File: jest.fn() }
  };
}, { virtual: true });

// Mock sequelize and database
jest.mock('../../config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),
    define: jest.fn(),
    sync: jest.fn().mockResolvedValue(true)
  },
  testConnection: jest.fn().mockResolvedValue(true)
}));

// Mock socket service
jest.mock('../../services/socket', () => ({
  initSocket: jest.fn(),
  getIO: jest.fn(() => ({ emit: jest.fn() }))
}));

// Mock email service
jest.mock('../../services/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSecurityAlertEmail: jest.fn().mockResolvedValue({ success: true }),
  isEmailConfigured: false,
  assertEmailReady: jest.fn()
}));

// In-memory fake user store
const bcrypt = require('bcryptjs');
let fakeUsers = [];
let fakeUserIdSeq = 1;
let fakePasswordResetTokens = [];

function createFakeUser(data) {
  const hash = bcrypt.hashSync(data.password, 10);
  const user = {
    id: fakeUserIdSeq++,
    email: data.email.toLowerCase(),
    password: hash,
    firstName: data.firstName || 'Test',
    lastName: data.lastName || 'User',
    role: data.role || 'athlete',
    sport: data.sport || null,
    profession: data.profession || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
    emailVerified: data.emailVerified || false,
    emailVerifyToken: data.emailVerifyToken || null,
    avatarUrl: null,
    lastLogin: null,
    toJSON() {
      const { password, ...safe } = this;
      // Remove function properties from JSON
      const result = {};
      for (const [k, v] of Object.entries(safe)) {
        if (typeof v !== 'function') result[k] = v;
      }
      return result;
    },
    async validatePassword(pw) {
      return bcrypt.compare(pw, this.password);
    },
    async update(updates) {
      if (updates.password) {
        updates.password = bcrypt.hashSync(updates.password, 10);
      }
      Object.assign(this, updates);
      return this;
    },
    getDataValue(key) { return this[key]; },
    async increment() { return this; }
  };
  fakeUsers.push(user);
  return user;
}

// Mock the User model
jest.mock('../../models', () => {
  const mockUser = {
    findOne: jest.fn(({ where }) => {
      if (where.email) {
        return Promise.resolve(fakeUsers.find(u => u.email === where.email.toLowerCase()) || null);
      }
      if (where.emailVerifyToken) {
        return Promise.resolve(fakeUsers.find(u => u.emailVerifyToken === where.emailVerifyToken) || null);
      }
      return Promise.resolve(null);
    }),
    findByPk: jest.fn((id, opts) => {
      return Promise.resolve(fakeUsers.find(u => u.id === id) || null);
    }),
    create: jest.fn((data) => {
      return Promise.resolve(createFakeUser(data));
    }),
    findAndCountAll: jest.fn(() => Promise.resolve({ rows: [], count: 0 }))
  };

  const mockPasswordResetToken = {
    findOne: jest.fn(({ where }) => {
      const record = fakePasswordResetTokens.find(t => t.token === where.token && t.expiresAt > new Date());
      return Promise.resolve(record || null);
    }),
    create: jest.fn((data) => {
      fakePasswordResetTokens.push(data);
      return Promise.resolve(data);
    }),
    destroy: jest.fn(({ where }) => {
      fakePasswordResetTokens = fakePasswordResetTokens.filter(t => t.userId !== where.userId);
      return Promise.resolve();
    })
  };

  return {
    User: mockUser,
    PasswordResetToken: mockPasswordResetToken,
    Post: { findAll: jest.fn().mockResolvedValue([]) },
    Connection: { findAll: jest.fn().mockResolvedValue([]) },
    Comment: { findAll: jest.fn().mockResolvedValue([]) },
    Like: { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() },
    Message: { findAll: jest.fn().mockResolvedValue([]) },
    SavedPost: { findAll: jest.fn().mockResolvedValue([]) },
    Notification: { destroy: jest.fn() },
    Report: { destroy: jest.fn() },
    Block: { destroy: jest.fn() },
    Group: {},
    GroupMember: {},
    Listing: {},
    Thread: {},
    Reply: {},
    Reel: {},
    Sponsorship: {},
    Media: {},
    AdminAuditLog: {},
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(true)
    }
  };
});

const request = require('supertest');
const app = require('../../app');

beforeEach(() => {
  fakeUsers = [];
  fakeUserIdSeq = 1;
  fakePasswordResetTokens = [];
  jest.clearAllMocks();
});

describe('Auth Integration', () => {
  // ─── SIGNUP ───
  describe('POST /api/auth/signup', () => {
    test('creates account with valid payload', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'athlete'
        });

      expect([200, 201]).toContain(res.statusCode);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
      // Should set auth cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies.join(';');
      expect(cookieStr).toContain('access_token');
      expect(cookieStr).toContain('HttpOnly');
    });

    test('rejects signup without email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_REQUIRED_FIELDS');
    });

    test('rejects weak password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test2@example.com',
          password: 'short',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_PASSWORD');
    });

    test('rejects duplicate email', async () => {
      createFakeUser({ email: 'dup@example.com', password: 'StrongPass123!' });
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'dup@example.com',
          password: 'StrongPass123!',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    test('rejects admin role signup', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'admin@example.com',
          password: 'StrongPass123!',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ADMIN_SIGNUP');
    });
  });

  // ─── LOGIN ───
  describe('POST /api/auth/login', () => {
    beforeEach(() => {
      createFakeUser({
        email: 'user@example.com',
        password: 'CorrectPass123!',
        firstName: 'Existing',
        lastName: 'User'
      });
    });

    test('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'CorrectPass123!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      // Should set auth cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.join(';')).toContain('access_token');
    });

    test('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'WrongPass123!' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    test('rejects non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'AnyPass123!' });

      expect(res.statusCode).toBe(401);
    });

    test('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_REQUIRED_FIELDS');
    });
  });

  // ─── PROTECTED ROUTES ───
  describe('GET /api/auth/me', () => {
    test('requires authentication', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('returns user when authenticated via cookie', async () => {
      const user = createFakeUser({
        email: 'metest@example.com',
        password: 'StrongPass123!',
        firstName: 'Me',
        lastName: 'Test'
      });

      // Login first to get cookies
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'metest@example.com', password: 'StrongPass123!' });

      const cookies = loginRes.headers['set-cookie'];

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(meRes.statusCode).toBe(200);
      expect(meRes.body.success).toBe(true);
    });
  });

  // ─── LOGOUT ───
  describe('POST /api/auth/logout', () => {
    test('clears auth cookies', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Should clear cookies
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        const cookieStr = cookies.join(';');
        // Cleared cookies have expiry in the past or max-age=0
        expect(cookieStr).toMatch(/access_token/);
      }
    });
  });

  // ─── FORGOT PASSWORD ───
  describe('POST /api/auth/forgot-password', () => {
    test('returns safe response for known email', async () => {
      createFakeUser({ email: 'forgot@example.com', password: 'StrongPass123!' });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns safe response for unknown email (no info leak)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── CHANGE PASSWORD ───
  describe('POST /api/auth/change-password', () => {
    test('requires authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'old', newPassword: 'NewPass123!' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── HEALTH + READINESS ───
  describe('Health endpoints', () => {
    test('GET /api/health returns ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
