/**
 * Tests for response helpers
 */
const { ok, created, fail } = require('../utils/response');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; }
  };
  return res;
}

describe('ok()', () => {
  test('returns success envelope with data', () => {
    const res = mockRes();
    ok(res, { id: 1, name: 'Test' });
    expect(res.body).toEqual({ success: true, data: { id: 1, name: 'Test' } });
  });

  test('merges extra fields (pagination)', () => {
    const res = mockRes();
    ok(res, [1, 2], { pagination: { page: 1, total: 2 } });
    expect(res.body.pagination).toEqual({ page: 1, total: 2 });
    expect(res.body.data).toEqual([1, 2]);
  });
});

describe('created()', () => {
  test('returns 201 with success envelope', () => {
    const res = mockRes();
    created(res, { id: 99 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, data: { id: 99 } });
  });
});

describe('fail()', () => {
  test('returns error envelope with code and message', () => {
    const res = mockRes();
    fail(res, 404, 'NOT_FOUND', 'User not found.');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found.' }
    });
  });

  test('supports 400 validation errors', () => {
    const res = mockRes();
    fail(res, 400, 'VALIDATION', 'Email is required.');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});
