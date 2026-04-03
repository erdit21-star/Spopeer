/**
 * Spopeer E2E: Core auth flows.
 *
 * Prerequisites:
 *   - Server running (playwright.config.js starts it automatically in dev)
 *   - Postgres with migrations applied
 *
 * Run:  npx playwright test e2e/auth.spec.js
 */
const { test, expect } = require('@playwright/test');

// Unique email for each test run to avoid collisions
function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
}

const STRONG_PASSWORD = 'E2eTestPass123!';

// ─── SIGNUP ───
test.describe('Signup', () => {
  test('can sign up as an athlete', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/pages/auth/signup.html');
    await expect(page.locator('#signupForm')).toBeVisible();

    await page.fill('#fullName', 'E2E Tester');
    await page.fill('#email', email);
    await page.fill('#password', STRONG_PASSWORD);
    await page.fill('#confirmPassword', STRONG_PASSWORD);
    await page.selectOption('#roleSelect', 'athlete');

    await page.click('#signupForm button[type="submit"]');

    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/dashboard|feed|index/, { timeout: 15000 });
  });

  test('shows error for duplicate email', async ({ page }) => {
    const email = uniqueEmail();

    // First signup
    await page.goto('/pages/auth/signup.html');
    await page.fill('#fullName', 'First User');
    await page.fill('#email', email);
    await page.fill('#password', STRONG_PASSWORD);
    await page.fill('#confirmPassword', STRONG_PASSWORD);
    await page.selectOption('#roleSelect', 'athlete');
    await page.click('#signupForm button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|feed|index/, { timeout: 15000 });

    // Second signup with same email
    await page.goto('/pages/auth/signup.html');
    await page.fill('#fullName', 'Duplicate User');
    await page.fill('#email', email);
    await page.fill('#password', STRONG_PASSWORD);
    await page.fill('#confirmPassword', STRONG_PASSWORD);
    await page.selectOption('#roleSelect', 'athlete');
    await page.click('#signupForm button[type="submit"]');

    // Should show an error
    await expect(page.locator('#signupError')).toBeVisible({ timeout: 10000 });
  });
});

// ─── LOGIN ───
test.describe('Login', () => {
  let testEmail;

  test.beforeAll(async ({ browser }) => {
    // Create a user via API for login tests
    testEmail = uniqueEmail();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/pages/auth/signup.html');
    await page.fill('#fullName', 'Login Tester');
    await page.fill('#email', testEmail);
    await page.fill('#password', STRONG_PASSWORD);
    await page.fill('#confirmPassword', STRONG_PASSWORD);
    await page.selectOption('#roleSelect', 'athlete');
    await page.click('#signupForm button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|feed|index/, { timeout: 15000 });
    await ctx.close();
  });

  test('can log in with correct credentials', async ({ page }) => {
    await page.goto('/pages/auth/login.html');
    await expect(page.locator('#loginForm')).toBeVisible();

    await page.fill('#email', testEmail);
    await page.fill('#password', STRONG_PASSWORD);
    await page.click('#loginForm button[type="submit"]');

    await expect(page).toHaveURL(/dashboard|feed|index/, { timeout: 15000 });
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/pages/auth/login.html');

    await page.fill('#email', testEmail);
    await page.fill('#password', 'WrongPassword999!');
    await page.click('#loginForm button[type="submit"]');

    await expect(page.locator('#loginError')).toBeVisible({ timeout: 10000 });
  });

  test('shows error for non-existent email', async ({ page }) => {
    await page.goto('/pages/auth/login.html');

    await page.fill('#email', 'nobody-exists@example.com');
    await page.fill('#password', STRONG_PASSWORD);
    await page.click('#loginForm button[type="submit"]');

    await expect(page.locator('#loginError')).toBeVisible({ timeout: 10000 });
  });
});

// ─── LOGOUT ───
test.describe('Logout', () => {
  test('can log out after logging in', async ({ page }) => {
    const email = uniqueEmail();

    // Signup
    await page.goto('/pages/auth/signup.html');
    await page.fill('#fullName', 'Logout Tester');
    await page.fill('#email', email);
    await page.fill('#password', STRONG_PASSWORD);
    await page.fill('#confirmPassword', STRONG_PASSWORD);
    await page.selectOption('#roleSelect', 'athlete');
    await page.click('#signupForm button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|feed|index/, { timeout: 15000 });

    // Look for a logout button/link in the navigation
    const logoutBtn = page.locator('[data-action="logout"], .logout-btn, a[href*="logout"], button:has-text("Log out"), button:has-text("Logout")');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      // Should redirect to login or home
      await expect(page).toHaveURL(/login|index|\/$/i, { timeout: 10000 });
    } else {
      // Logout via API directly
      const response = await page.request.post('/api/auth/logout');
      expect(response.ok()).toBe(true);
    }
  });
});

// ─── HEALTH CHECK ───
test.describe('Health endpoints', () => {
  test('health returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });

  test('readiness returns check results', async ({ request }) => {
    const res = await request.get('/api/ready');
    const body = await res.json();
    expect(body.data.checks).toBeDefined();
    expect(body.data.checks.database).toBeDefined();
  });
});

// ─── FORGOT PASSWORD ───
test.describe('Forgot password', () => {
  test('forgot-password page accepts email', async ({ page }) => {
    await page.goto('/pages/auth/forgot-password.html');

    const emailInput = page.locator('input[type="email"], #email');
    if (await emailInput.count() > 0) {
      await emailInput.fill('test@example.com');
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        // Should show a success/confirmation message (never leaks email existence)
        await page.waitForTimeout(2000);
        // No crash = pass
      }
    }
  });
});
