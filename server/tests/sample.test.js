// Updated
// Mock winston to avoid needing it installed in test context
jest.mock('winston', () => {
  const mockNoop = jest.fn(function() { return mockNoop; });
  const mockFormat = new Proxy({}, { get: () => mockNoop });
  return {
    createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), add: jest.fn() }),
    format: mockFormat,
    transports: { Console: jest.fn(), File: jest.fn() }
  };
}, { virtual: true });

const { constants } = require('../utils');

test('constants expose defaults', () => {
  expect(constants.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
  expect(constants.APP_NAME).toBe('Spopeer');
});

