/**
 * Contract tests for /api/users/:id and /api/profiles endpoints.
 * Verifies the response shape (contract) these endpoints must always satisfy.
 * Mocks database layer — no real DB required.
 */

require('./setup-common');

let mockFakeUsers = [];
let mockUserIdSeq = 1;

function makeMockUser(overrides) {
  const user = Object.assign({
    id: mockUserIdSeq++,
    email: 'contract_test_' + mockUserIdSeq + '@example.com',
    firstName: 'Contract',
    lastName: 'User',
    role: 'athlete',
    userType: 'athlete',
    sport: 'Football',
    bio: 'Test bio',
    location: 'Madrid, Spain',
    avatarUrl: null,
    coverPhotoUrl: null,
    isActive: true,
    emailVerified: true,
    extendedProfile: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    toJSON() {
      const result = {};
      for (const [k, v] of Object.entries(this)) {
        if (typeof v !== 'function') result[k] = v;
      }
      return result;
    },
    async update(updates) { Object.assign(this, updates); return this; },
    getDataValue(key) { return this[key]; }
  }, overrides);
  mockFakeUsers.push(user);
  return user;
}

jest.mock('../../models', () => {
  const mockUser = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  return {
    User: mockUser,
    Follow: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() },
    Connection: { findOne: jest.fn() },
    sequelize: {
      transaction: jest.fn((cb) => cb({ commit: jest.fn(), rollback: jest.fn() }))
    }
  };
});

const { User } = require('../../models');
const request = require('supertest');
const app = require('../../app');

beforeEach(() => {
  jest.clearAllMocks();
  mockFakeUsers = [];
  mockUserIdSeq = 1;
});

// ─── Helpers ───
function activeUser(overrides) {
  const u = makeMockUser(overrides);
  User.findByPk.mockResolvedValue(u);
  User.findOne.mockResolvedValue(u);
  return u;
}

// ─── /api/users/:id contract ────────────────────────────────────────────────
describe('GET /api/users/:id — contract', () => {
  describe('successful response shape', () => {
    test('returns HTTP 200', async () => {
      activeUser({ id: 1 });
      const res = await request(app).get('/api/users/1');
      expect(res.status).toBe(200);
    });

    test('response has top-level "success" boolean', async () => {
      activeUser({ id: 1 });
      const res = await request(app).get('/api/users/1');
      expect(typeof res.body.success).toBe('boolean');
    });

    test('response has "data" object', async () => {
      activeUser({ id: 1 });
      const res = await request(app).get('/api/users/1');
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data).toBe('object');
    });

    test('"data" contains "id" field', async () => {
      activeUser({ id: 1 });
      const res = await request(app).get('/api/users/1');
      const payload = res.body.data;
      expect(payload.id).toBeDefined();
    });

    test('"data" contains "email" field', async () => {
      activeUser({ id: 1 });
      const res = await request(app).get('/api/users/1');
      const payload = res.body.data;
      expect(payload.email).toBeDefined();
    });

    test('"data" does NOT expose "password" field', async () => {
      activeUser({ id: 1, password: 'secret' });
      const res = await request(app).get('/api/users/1');
      const payload = res.body.data;
      expect(payload.password).toBeUndefined();
    });

    test('"data" does NOT expose "passwordHash" field', async () => {
      activeUser({ id: 1, passwordHash: 'hashed_value' });
      const res = await request(app).get('/api/users/1');
      expect(res.body.data?.passwordHash).toBeUndefined();
    });

    test('"data" contains "firstName" and "lastName"', async () => {
      activeUser({ id: 1, firstName: 'Jane', lastName: 'Doe' });
      const res = await request(app).get('/api/users/1');
      const payload = res.body.data;
      expect(payload.firstName).toBe('Jane');
      expect(payload.lastName).toBe('Doe');
    });

    test('"data" contains "role" / "userType" or "sport" fields (profile fields)', async () => {
      activeUser({ id: 1, role: 'athlete', sport: 'Tennis' });
      const res = await request(app).get('/api/users/1');
      const payload = res.body.data;
      // At least one profile field should be present
      const hasProfileField = (
        payload.role !== undefined ||
        payload.userType !== undefined ||
        payload.sport !== undefined
      );
      expect(hasProfileField).toBe(true);
    });
  });

  describe('error cases', () => {
    test('returns HTTP 404 for non-existent user', async () => {
      User.findByPk.mockResolvedValue(null);
      User.findOne.mockResolvedValue(null);
      const res = await request(app).get('/api/users/99999');
      expect(res.status).toBe(404);
    });

    test('404 response has "success: false"', async () => {
      User.findByPk.mockResolvedValue(null);
      User.findOne.mockResolvedValue(null);
      const res = await request(app).get('/api/users/99999');
      expect(res.body.success).toBe(false);
    });

    test('404 response has "code" field', async () => {
      User.findByPk.mockResolvedValue(null);
      User.findOne.mockResolvedValue(null);
      const res = await request(app).get('/api/users/99999');
      expect(res.body.code).toBeDefined();
    });

    test('returns 404 for email-based lookup of missing user', async () => {
      User.findOne.mockResolvedValue(null);
      const res = await request(app).get('/api/users/nobody@example.com');
      expect(res.status).toBe(404);
    });
  });

  describe('inactive / banned users', () => {
    test('returns 404 for inactive user', async () => {
      const u = makeMockUser({ id: 5, isActive: false });
      User.findByPk.mockResolvedValue(u);
      User.findOne.mockResolvedValue(u);
      const res = await request(app).get('/api/users/5');
      expect(res.status).toBe(404);
    });
  });
});

// ─── /api/users (list) contract ─────────────────────────────────────────────
describe('GET /api/users — list contract', () => {
  test('returns HTTP 200', async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
  });

  test('response data is an array', async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = await request(app).get('/api/users');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('response contains pagination metadata', async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = await request(app).get('/api/users');
    expect(res.body.meta).toBeDefined();
    const meta = res.body.meta;
    expect(meta.pagination).toBeDefined();
    expect(typeof meta.pagination.total).toBe('number');
    expect(typeof meta.pagination.page).toBe('number');
  });

  test('no password fields in list results', async () => {
    const u = makeMockUser({ id: 10, password: 'secret', email: 'list@example.com' });
    User.findAndCountAll.mockResolvedValue({ rows: [u], count: 1 });
    const res = await request(app).get('/api/users');
    if (res.body.data && res.body.data.length) {
      res.body.data.forEach(function (user) {
        expect(user.password).toBeUndefined();
      });
    }
  });
});

// ─── /api/profiles contract ──────────────────────────────────────────────────
describe('POST /api/profiles — contract', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({ sport: 'Basketball' });
    expect(res.status).toBe(401);
  });

  test('401 response has "success: false"', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({ sport: 'Basketball' });
    expect(res.body.success).toBe(false);
  });
});
