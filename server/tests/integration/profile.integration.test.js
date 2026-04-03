/**
 * Integration tests for profile/user endpoints.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'spopeer_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

jest.mock('winston', () => {
  const noop = jest.fn(function () { return noop; });
  const mockFormat = new Proxy({}, { get: () => noop });
  return {
    createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), add: jest.fn() }),
    format: mockFormat,
    transports: { Console: jest.fn(), File: jest.fn() }
  };
}, { virtual: true });

jest.mock('../../config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),
    define: jest.fn(),
    sync: jest.fn().mockResolvedValue(true)
  },
  testConnection: jest.fn().mockResolvedValue(true)
}));

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

const bcrypt = require('bcryptjs');
let fakeUsers = [];
let fakeUserIdSeq = 1;

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
    emailVerified: false,
    avatarUrl: null,
    bio: data.bio || null,
    username: data.username || null,
    privacyPublic: true,
    extendedProfile: {},
    toJSON() {
      const result = {};
      for (const [k, v] of Object.entries(this)) {
        if (typeof v !== 'function') result[k] = v;
      }
      delete result.password;
      return result;
    },
    async validatePassword(pw) { return bcrypt.compare(pw, this.password); },
    async update(updates) { Object.assign(this, updates); return this; },
    getDataValue(key) { return this[key]; },
    async increment() { return this; }
  };
  fakeUsers.push(user);
  return user;
}

jest.mock('../../models', () => {
  const { Op } = require('sequelize');
  const mockUser = {
    findOne: jest.fn(({ where }) => {
      if (where.email) {
        return Promise.resolve(fakeUsers.find(u => u.email === where.email.toLowerCase() && u.isActive) || null);
      }
      if (where.username) {
        return Promise.resolve(fakeUsers.find(u => u.username === where.username) || null);
      }
      return Promise.resolve(null);
    }),
    findByPk: jest.fn((id) => {
      return Promise.resolve(fakeUsers.find(u => u.id === id) || null);
    }),
    findAndCountAll: jest.fn(({ where, limit, offset }) => {
      let results = fakeUsers.filter(u => u.isActive);
      if (where && where.role) results = results.filter(u => u.role === where.role);
      return Promise.resolve({ rows: results.slice(offset || 0, (offset || 0) + (limit || 20)), count: results.length });
    }),
    create: jest.fn((data) => Promise.resolve(createFakeUser(data)))
  };

  return {
    User: mockUser,
    PasswordResetToken: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() },
    Post: { findAll: jest.fn().mockResolvedValue([]), findByPk: jest.fn(), findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) },
    Connection: { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn(), create: jest.fn(), destroy: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    Comment: { findAll: jest.fn().mockResolvedValue([]) },
    Like: { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() },
    Message: { findAll: jest.fn().mockResolvedValue([]) },
    SavedPost: { findAll: jest.fn().mockResolvedValue([]) },
    Notification: { destroy: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
    Report: { destroy: jest.fn() },
    Block: { destroy: jest.fn(), findOne: jest.fn() },
    Group: {},
    GroupMember: {},
    Listing: {},
    Thread: {},
    Reply: {},
    Reel: {},
    Sponsorship: {},
    Media: {},
    AdminAuditLog: {},
    sequelize: { authenticate: jest.fn().mockResolvedValue(true) }
  };
});

const request = require('supertest');
const app = require('../../app');

beforeEach(() => {
  fakeUsers = [];
  fakeUserIdSeq = 1;
  jest.clearAllMocks();
});

describe('Profile Integration', () => {
  let authCookies;

  beforeEach(async () => {
    // Create and login a user
    createFakeUser({
      email: 'profile@example.com',
      password: 'StrongPass123!',
      firstName: 'Profile',
      lastName: 'User',
      role: 'athlete'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'profile@example.com', password: 'StrongPass123!' });

    authCookies = loginRes.headers['set-cookie'];
  });

  test('GET /api/users lists active users', async () => {
    const res = await request(app).get('/api/users');

    expect(res.statusCode).toBe(200);
  });

  test('GET /api/users/:id returns user', async () => {
    const res = await request(app).get('/api/users/1');

    expect(res.statusCode).toBe(200);
  });

  test('GET /api/users/:id returns 404 for non-existent', async () => {
    const res = await request(app).get('/api/users/999');

    expect(res.statusCode).toBe(404);
  });

  test('PUT /api/users/:id requires auth', async () => {
    const res = await request(app)
      .put('/api/users/1')
      .send({ bio: 'Updated bio' });

    expect(res.statusCode).toBe(401);
  });

  test('PUT /api/users/:id updates own profile', async () => {
    const res = await request(app)
      .put('/api/users/1')
      .set('Cookie', authCookies)
      .send({ bio: 'Updated bio' });

    expect(res.statusCode).toBe(200);
  });

  test('PUT /api/users/:id rejects updating another user', async () => {
    createFakeUser({
      email: 'other@example.com',
      password: 'StrongPass123!',
      firstName: 'Other',
      lastName: 'User'
    });

    const res = await request(app)
      .put('/api/users/2')
      .set('Cookie', authCookies)
      .send({ bio: 'Hacking bio' });

    expect(res.statusCode).toBe(403);
  });

  test('POST /api/profiles saves profile', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .set('Cookie', authCookies)
      .send({ bio: 'My sports bio' });

    expect(res.statusCode).toBe(200);
  });
});
