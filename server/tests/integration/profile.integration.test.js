// Updated
/**
 * Integration tests for profile/user endpoints.
 */

require('./setup-common');

const mockBcryptHashSync = (pw) => `hashed_${pw}`;
const mockBcryptCompare = (pw, hash) => Promise.resolve(hash === `hashed_${pw}`);
let mockFakeUsers = [];
let mockFakeUserIdSeq = 1;

function mockCreateFakeUser(data) {
  const hash = mockBcryptHashSync(data.password);
  const user = {
    id: mockFakeUserIdSeq++,
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
    async validatePassword(pw) { return mockBcryptCompare(pw, this.password); },
    async update(updates) { Object.assign(this, updates); return this; },
    getDataValue(key) { return this[key]; },
    async increment() { return this; }
  };
  mockFakeUsers.push(user);
  return user;
}

jest.mock('../../models', () => {
  const { Op: _Op } = require('sequelize');
  const mockUser = {
    findOne: jest.fn(({ where }) => {
      if (where.email) {
        return Promise.resolve(mockFakeUsers.find(u => u.email === where.email.toLowerCase() && u.isActive) || null);
      }
      if (where.username) {
        return Promise.resolve(mockFakeUsers.find(u => u.username === where.username) || null);
      }
      return Promise.resolve(null);
    }),
    findByPk: jest.fn((id) => {
      return Promise.resolve(mockFakeUsers.find(u => u.id === Number(id)) || null);
    }),
    findAndCountAll: jest.fn(({ where, limit, offset }) => {
      let results = mockFakeUsers.filter(u => u.isActive);
      if (where && where.role) results = results.filter(u => u.role === where.role);
      return Promise.resolve({ rows: results.slice(offset || 0, (offset || 0) + (limit || 20)), count: results.length });
    }),
    create: jest.fn((data) => Promise.resolve(mockCreateFakeUser(data)))
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
    RefreshSession: {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue([0]),
      destroy: jest.fn().mockResolvedValue(0)
    },
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(true),
      define: jest.fn(() => ({
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findByPk: jest.fn().mockResolvedValue(null),
        findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        destroy: jest.fn().mockResolvedValue(0),
        count: jest.fn().mockResolvedValue(0),
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
        belongsToMany: jest.fn()
      }))
    }
  };
});

const request = require('supertest');
const app = require('../../app');

beforeEach(() => {
  mockFakeUsers = [];
  mockFakeUserIdSeq = 1;
  jest.clearAllMocks();
});

describe('Profile Integration', () => {
  let authCookies;

  beforeEach(async () => {
    // Create and login a user
    mockCreateFakeUser({
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
    mockCreateFakeUser({
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
