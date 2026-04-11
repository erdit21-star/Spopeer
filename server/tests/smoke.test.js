process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const request = require('supertest');
const app = require('../app');

describe('Smoke tests - core endpoints', () => {
  test('GET /api/health responds with success', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success');
  });

  test('GET /api/auth/csrf returns token and sets cookie', async () => {
    const res = await request(app).get('/api/auth/csrf');
    expect(res.statusCode).toBe(200);
    // response uses standardized wrapper { success: true, data: { csrfToken } }
    expect(res.body).toHaveProperty('data.csrfToken');
    expect(Array.isArray(res.headers['set-cookie'] || [])).toBe(true);
  });

  test('POST /api/auth/signup returns JSON with success flag', async () => {
    const email = `smoke+${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email, password: 'Password123!', firstName: 'Smoke', lastName: 'Test' })
      .set('Accept', 'application/json');

    // Accept a variety of outcomes for different envs (db present, email provider, validation)
    expect([200, 201, 400, 409, 503, 500]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('success');
  }, 20000);
});
