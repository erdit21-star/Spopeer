const { defineConfig } = require('@playwright/test');

const proc = globalThis.process || { env: {} };
const PORT = proc.env.PLAYWRIGHT_PORT || 4173;

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  // Keep visual snapshot filenames stable across OSes (no -linux/-win32 suffixes).
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `node e2e/static-server.cjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 30_000,
    reuseExistingServer: true
  }
});
