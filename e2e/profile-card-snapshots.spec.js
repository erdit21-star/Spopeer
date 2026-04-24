/**
 * e2e/profile-card-snapshots.spec.js
 * Visual regression snapshots for profile card variants across all user roles.
 *
 * Run: npx playwright test e2e/profile-card-snapshots.spec.js --update-snapshots
 * To update baseline: npx playwright test --update-snapshots
 */

const { test, expect } = require('@playwright/test');

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeProfile(role, overrides = {}) {
  const base = {
    id: 'snap-user-' + role,
    email: role + '@snapshot.test',
    userType: role,
    role: role,
    firstName: role.charAt(0).toUpperCase() + role.slice(1),
    lastName: 'Snapshot',
    sport: 'Football',
    primarySport: 'Football',
    location: 'Madrid, Spain',
    followersCount: 120,
    followingCount: 80,
    postsCount: 14,
    _profileUpdatedAt: 1700000000000
  };

  const roleDefaults = {
    athlete: {
      position: 'Forward',
      currentTeam: 'Real Madrid',
      playingLevel: 'Professional',
      experience: 8
    },
    coach: {
      specialization: 'Attacking Play',
      coachingStyle: 'High Press',
      experience: 12,
      currentTeam: 'FC Example'
    },
    club: {
      foundedYear: '1902',
      teamsAndDivisions: 'U18, U21, Senior',
      clubType: 'Professional Club',
      experience: 120
    },
    supportive_professional: {
      professionalTitle: 'Sports Physiotherapist',
      specializationField: 'Injury Recovery',
      companyName: 'SportsMed Clinic',
      experience: 6
    }
  };

  return Object.assign({}, base, roleDefaults[role] || {}, overrides);
}

async function seedAuth(page, user) {
  await page.addInitScript((seedUser) => {
    localStorage.setItem('spopeer_loggedIn', 'true');
    localStorage.setItem('spopeer_user', JSON.stringify(seedUser));
  }, user);
}

async function mockProfileApi(page, profile) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.startsWith('/api/users/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payload: profile, data: profile })
      });
      return;
    }
    if (url.pathname === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { user: profile } })
      });
      return;
    }
    await route.continue();
  });
}

async function loadProfilePage(page, userId) {
  await page.goto('/pages/profiles/public-profile.html?userId=' + encodeURIComponent(userId), {
    waitUntil: 'domcontentloaded'
  });
  // Wait for profile card to render
  await page.waitForSelector('.profile-card, .pc-minimal, .pc-sports', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300); // allow animations to settle
}

// ─── Tests ──────────────────────────────────────────────────────────────────
const roles = ['athlete', 'coach', 'club', 'supportive_professional'];
const variants = ['card-stack', 'minimal-list', 'sports-card'];

// Card-stack snapshots for each role
for (const role of roles) {
  test('card-stack variant — ' + role, async ({ page }) => {
    const profile = makeProfile(role, { profileCardStyle: 'card-stack' });
    await seedAuth(page, { id: 'viewer-1', email: 'viewer@snap.test', userType: 'athlete' });
    await mockProfileApi(page, profile);
    await loadProfilePage(page, 'snap-user-' + role);

    const card = page.locator('.profile-card-variant.active, .profile-card').first();
    await expect(card).toHaveScreenshot('card-stack-' + role + '.png', {
      maxDiffPixelRatio: 0.02
    });
  });
}

// Minimal-list snapshots for each role
for (const role of roles) {
  test('minimal-list variant — ' + role, async ({ page }) => {
    const profile = makeProfile(role, { profileCardStyle: 'minimal-list' });
    await seedAuth(page, { id: 'viewer-1', email: 'viewer@snap.test', userType: 'athlete' });
    await mockProfileApi(page, profile);
    await loadProfilePage(page, 'snap-user-' + role);

    const card = page.locator('[data-variant="minimal-list"].active, .pc-minimal').first();
    await expect(card).toHaveScreenshot('minimal-list-' + role + '.png', {
      maxDiffPixelRatio: 0.02
    });
  });
}

// Sports-card snapshots for each role
for (const role of roles) {
  test('sports-card variant — ' + role, async ({ page }) => {
    const profile = makeProfile(role, { profileCardStyle: 'sports-card' });
    await seedAuth(page, { id: 'viewer-1', email: 'viewer@snap.test', userType: 'athlete' });
    await mockProfileApi(page, profile);
    await loadProfilePage(page, 'snap-user-' + role);

    const card = page.locator('[data-variant="sports-card"].active, .pc-sports').first();
    await expect(card).toHaveScreenshot('sports-card-' + role + '.png', {
      maxDiffPixelRatio: 0.02
    });
  });
}

// Full page snapshot — athlete card-stack (primary regression guard)
test('full page — athlete card-stack', async ({ page }) => {
  const profile = makeProfile('athlete', { profileCardStyle: 'card-stack' });
  await seedAuth(page, { id: 'viewer-1', email: 'viewer@snap.test', userType: 'athlete' });
  await mockProfileApi(page, profile);
  await loadProfilePage(page, 'snap-user-athlete');

  await expect(page).toHaveScreenshot('full-page-athlete-card-stack.png', {
    maxDiffPixelRatio: 0.02,
    fullPage: true
  });
});
