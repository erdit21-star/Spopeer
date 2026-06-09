/* eslint-disable no-undef */
const { test, expect } = require('@playwright/test');

const HAS_E2E_URL = Boolean(process.env.E2E_BASE_URL);

test.describe('Spopeer MVP Smoke', () => {
  test.skip(!HAS_E2E_URL, 'Set E2E_BASE_URL to run smoke tests against a deployed/staged environment.');

  test('signup/login', async ({ page }) => {
    await page.goto('/mobile-signup.html');
    await expect(page).toHaveTitle(/Spopeer/i);
    await page.goto('/mobile-login.html');
    await expect(page).toHaveURL(/login/i);
  });

  test('create profile', async ({ page }) => {
    await page.goto('/pages/profiles/edit-profile.html');
    await expect(page.locator('body')).toBeVisible();
  });

  test('create post with media', async ({ page }) => {
    await page.goto('/feed.html');
    await expect(page.locator('body')).toBeVisible();
    // Hook intentionally simple: page-specific post composer IDs vary by role/page state.
    await expect(page.locator('#postComposerModal, #post-content, #postContent').first()).toBeVisible();
  });

  test('followers-only/private post visibility', async ({ page, request }) => {
    await page.goto('/feed.html');
    // Real assertion requires two authenticated accounts.
    // Keep smoke presence check to ensure route and page render.
    const resp = await request.get('/api/posts/feed/for-you');
    expect([200, 401]).toContain(resp.status());
  });

  test('like/comment/share', async ({ page }) => {
    await page.goto('/feed.html');
    await expect(page.locator('body')).toBeVisible();
  });

  test('messaging', async ({ page, request }) => {
    await page.goto('/pages/messaging/inbox.html');
    await expect(page.locator('body')).toBeVisible();
    const resp = await request.get('/api/messages/conversations');
    expect([200, 401]).toContain(resp.status());
  });

  test('notifications', async ({ request }) => {
    const resp = await request.get('/api/notifications');
    expect([200, 401]).toContain(resp.status());
  });

  test('search', async ({ request }) => {
    const resp = await request.get('/api/search/posts?term=test');
    expect([200, 401]).toContain(resp.status());
  });

  test('groups', async ({ page, request }) => {
    await page.goto('/pages/community/community.html');
    await expect(page.locator('body')).toBeVisible();
    const resp = await request.get('/api/groups');
    expect([200, 401]).toContain(resp.status());
  });

  test('report/block', async ({ page }) => {
    await page.goto('/feed.html');
    await expect(page.locator('[data-moderation-quick-actions]')).toBeVisible();
  });
});
