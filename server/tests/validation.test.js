/**
 * Tests for validation utilities
 */
const {
  sanitizeString,
  isValidEmail,
  parsePagination,
  isAllowedValue,
  isValidId,
  isValidUrl,
  normalizeUserRole,
  ALLOWED_ROLES
} = require('../utils/validation');

// ─── sanitizeString ───
describe('sanitizeString', () => {
  test('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  test('truncates to maxLength', () => {
    expect(sanitizeString('abcdef', 3)).toBe('abc');
  });

  test('strips control characters', () => {
    expect(sanitizeString('hello\x00\x01world')).toBe('helloworld');
  });

  test('preserves newlines and tabs', () => {
    expect(sanitizeString('line1\nline2\ttab')).toBe('line1\nline2\ttab');
  });

  test('returns empty string for non-string input', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(123)).toBe('');
    expect(sanitizeString({})).toBe('');
  });

  test('default maxLength is 1000', () => {
    const long = 'a'.repeat(2000);
    expect(sanitizeString(long).length).toBe(1000);
  });
});

// ─── isValidEmail ───
describe('isValidEmail', () => {
  test('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b@c.co')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
    expect(isValidEmail('no@')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });

  test('rejects non-string input', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });

  test('rejects emails longer than 254 chars', () => {
    const long = 'a'.repeat(250) + '@b.co';
    expect(isValidEmail(long)).toBe(false);
  });
});

// ─── parsePagination ───
describe('parsePagination', () => {
  test('returns defaults for empty query', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  test('parses valid page and limit', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  test('caps limit at maxLimit', () => {
    const result = parsePagination({ page: '1', limit: '500' });
    expect(result.limit).toBe(100);
  });

  test('clamps negative page to 1', () => {
    const result = parsePagination({ page: '-1' });
    expect(result.page).toBe(1);
  });

  test('accepts pageSize alias', () => {
    const result = parsePagination({ pageSize: '15' });
    expect(result.limit).toBe(15);
  });

  test('accepts custom defaults', () => {
    const result = parsePagination({}, { limit: 50, maxLimit: 200 });
    expect(result.limit).toBe(50);
  });
});

// ─── isAllowedValue ───
describe('isAllowedValue', () => {
  test('returns true for allowed value', () => {
    expect(isAllowedValue('athlete', ALLOWED_ROLES)).toBe(true);
  });

  test('returns false for disallowed value', () => {
    expect(isAllowedValue('superadmin', ALLOWED_ROLES)).toBe(false);
  });
});

// ─── isValidId ───
describe('isValidId', () => {
  test('accepts positive integers', () => {
    expect(isValidId(1)).toBe(true);
    expect(isValidId('42')).toBe(true);
  });

  test('rejects zero, negative, NaN', () => {
    expect(isValidId(0)).toBe(false);
    expect(isValidId(-5)).toBe(false);
    expect(isValidId('abc')).toBe(false);
    expect(isValidId(null)).toBe(false);
  });
});

// ─── isValidUrl ───
describe('isValidUrl', () => {
  test('accepts http/https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com/path')).toBe(true);
  });

  test('rejects non-http protocols', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('ftp://files.com')).toBe(false);
  });

  test('rejects non-strings', () => {
    expect(isValidUrl(null)).toBe(false);
    expect(isValidUrl(42)).toBe(false);
  });

  test('rejects malformed URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });
});

// ─── ALLOWED_ROLES ───
describe('ALLOWED_ROLES', () => {
  test('contains expected roles', () => {
    expect(ALLOWED_ROLES).toContain('athlete');
    expect(ALLOWED_ROLES).toContain('coach');
    expect(ALLOWED_ROLES).toContain('club');
    expect(ALLOWED_ROLES).toContain('supportive_professional');
  });

  test('does not include fan', () => {
    expect(ALLOWED_ROLES).not.toContain('fan');
  });
});

// ─── normalizeUserRole ───
describe('normalizeUserRole', () => {
  test('maps legacy roles correctly', () => {
    expect(normalizeUserRole('supportive-profession'))
      .toBe('supportive_professional');

    expect(normalizeUserRole('Supportive Professional'))
      .toBe('supportive_professional');
  });

  test('trims and normalizes standard roles', () => {
    expect(normalizeUserRole(' coach ')).toBe('coach');
  });
});
