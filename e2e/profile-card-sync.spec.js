const { test, expect } = require('@playwright/test');

function makeViewer(overrides = {}) {
  return {
    id: 'viewer-1',
    email: 'viewer@example.com',
    userType: 'athlete',
    firstName: 'Viewer',
    lastName: 'User',
    ...overrides
  };
}

async function seedAuth(page, viewer) {
  await page.addInitScript((seedUser) => {
    globalThis.localStorage.setItem('spopeer_loggedIn', 'true');
    globalThis.localStorage.setItem('spopeer_user', JSON.stringify(seedUser));
  }, viewer);
}

async function mockApi(page, options) {
  const viewer = options.viewer;
  const authMeUser = options.authMeUser || viewer;
  const profilesById = options.profilesById || {};

  await page.route('**/api/**', async (route) => {
    const reqUrl = route.request().url();
    const url = new URL(reqUrl);

    if (url.pathname.startsWith('/api/users/')) {
      const userId = decodeURIComponent(url.pathname.split('/').pop() || '');
      const profile = profilesById[userId] || profilesById.default || {};
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payload: profile })
      });
      return;
    }

    if (url.pathname === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { user: authMeUser } })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ payload: {} })
    });
  });
}

test('Home -> Feed -> user chip -> View Profile uses canonical profile data', async ({ page }) => {
  const viewer = makeViewer({
    firstName: 'Mina',
    lastName: 'Lopez',
    primarySport: 'Old Sport',
    sport: 'Old Sport',
    // Keep these populated to avoid placeholder churn if generic profile sync listeners run.
    position: 'Forward',
    currentTeam: 'City FC'
  });

  const viewerProfileFromApi = {
    ...viewer,
    primarySport: 'Football',
    sport: 'Football',
    position: 'Forward',
    currentTeam: 'City FC',
    playingLevel: 'professional',
    location: 'Madrid, Spain',
    experience: 8,
    profileCardStyle: 'card-stack',
    visibility: {
      position: 'public',
      currentTeam: 'public',
      playingLevel: 'public',
      location: 'public',
      experience: 'public'
    }
  };

  await seedAuth(page, viewer);
  await mockApi(page, {
    viewer,
    authMeUser: viewerProfileFromApi,
    profilesById: {
      'viewer-1': viewerProfileFromApi,
      default: viewerProfileFromApi
    }
  });

  await page.goto('/index.html');
  await page.goto('/feed.html');

  await page.click('[data-user-chip]');
  await page.click('button[data-action="view-profile"]');

  await expect(page).toHaveURL(/\/pages\/profiles\/public-profile\.html\?userId=/);
  await expect(page.locator('#sport')).toHaveText('Football');
  await expect(page.locator('#cardPosition')).toHaveText('Forward');
  await expect(page.locator('#cardTeam')).toHaveText('City FC');
});

test('role-aware labels render in minimal-list and sports-card variants', async ({ page }) => {
  const viewer = makeViewer();
  const coachProfile = {
    id: 'coach-1',
    firstName: 'Sara',
    lastName: 'Coach',
    userType: 'coach',
    sport: 'Basketball',
    primarySport: 'Basketball',
    specialization: 'Tactical Analysis',
    coachingStyle: 'High Press',
    currentTeam: 'Falcons',
    location: 'Paris, France',
    experience: 12,
    visibility: {
      specialization: 'public',
      coachingStyle: 'public',
      currentTeam: 'public',
      location: 'public',
      experience: 'public'
    }
  };

  await seedAuth(page, viewer);

  for (const style of ['minimal-list', 'sports-card']) {
    await mockApi(page, {
      viewer,
      profilesById: {
        'coach-1': { ...coachProfile, profileCardStyle: style },
        default: { ...coachProfile, profileCardStyle: style }
      }
    });

    await page.goto('/pages/profiles/public-profile.html?userId=coach-1', {
      waitUntil: 'domcontentloaded'
    });

    if (style === 'minimal-list') {
      await expect(page.locator('#ml-fields')).toContainText('Specialty');
      await expect(page.locator('#ml-fields')).toContainText('Tactical Analysis');
    } else {
      await expect(page.locator('#sc-fields')).toContainText('Specialty');
      await expect(page.locator('#sc-fields')).toContainText('Tactical Analysis');
      await expect(page.locator('#sc-fields')).toContainText('Style');
    }
  }
});

test('private fields do not render in side card variants', async ({ page }) => {
  const viewer = makeViewer();
  const profile = {
    id: 'athlete-privacy',
    firstName: 'Alex',
    lastName: 'Runner',
    userType: 'athlete',
    sport: 'Running',
    primarySport: 'Running',
    position: 'Sprinter',
    currentTeam: 'Track Elite',
    playingLevel: 'professional',
    location: 'Lisbon, Portugal',
    experience: 5,
    visibility: {
      position: 'private',
      currentTeam: 'private',
      playingLevel: 'private',
      location: 'public',
      experience: 'public'
    }
  };

  await seedAuth(page, viewer);
  await mockApi(page, {
    viewer,
    profilesById: {
      'athlete-privacy': { ...profile, profileCardStyle: 'sports-card' },
      default: { ...profile, profileCardStyle: 'sports-card' }
    }
  });

  await page.goto('/pages/profiles/public-profile.html?userId=athlete-privacy');

  await expect(page.locator('#sc-fields')).not.toContainText('Sprinter');
  await expect(page.locator('#sc-fields')).not.toContainText('Track Elite');
  await expect(page.locator('#sc-fields')).not.toContainText('professional');
  await expect(page.locator('#sc-fields')).toContainText('Location');
});

test('viewing another profile ignores updates from current user', async ({ page }) => {
  const viewer = makeViewer({ firstName: 'Owner', lastName: 'Profile' });
  const targetProfile = {
    id: 'target-22',
    firstName: 'Target',
    lastName: 'Athlete',
    userType: 'athlete',
    sport: 'Football',
    primarySport: 'Football',
    position: 'Striker',
    location: 'Rome, Italy',
    visibility: { location: 'public', position: 'public' }
  };

  await seedAuth(page, viewer);
  await mockApi(page, {
    viewer,
    profilesById: {
      'target-22': targetProfile,
      default: targetProfile
    }
  });

  await page.goto('/pages/profiles/public-profile.html?userId=target-22');
  await expect(page.locator('#name')).toContainText('Target Athlete');
  await expect(page.locator('#cardPosition')).toHaveText('Striker');

  await page.evaluate(() => {
    globalThis.dispatchEvent(new CustomEvent('profileSyncUpdated', {
      detail: {
        profile: {
          id: 'viewer-1',
          firstName: 'Owner',
          lastName: 'Changed',
          sport: 'Rugby',
          _profileUpdatedAt: Date.now() + 1
        },
        timestamp: Date.now() + 1,
        source: 'test'
      }
    }));
  });

  await expect(page.locator('#name')).toContainText('Target Athlete');
  await expect(page.locator('#cardPosition')).toHaveText('Striker');
});

test('stale profile updates are ignored by timestamp guard', async ({ page }) => {
  const viewer = makeViewer();
  const profile = {
    id: 'stale-1',
    firstName: 'Fresh',
    lastName: 'Data',
    userType: 'athlete',
    sport: 'Football',
    primarySport: 'Football',
    visibility: { location: 'public' }
  };

  await seedAuth(page, viewer);
  await mockApi(page, {
    viewer,
    profilesById: {
      'stale-1': profile,
      default: profile
    }
  });

  await page.goto('/pages/profiles/public-profile.html?userId=stale-1');

  const tsNew = Date.now() + 1000;
  const tsOld = tsNew - 500;

  await page.evaluate((ts) => {
    globalThis.dispatchEvent(new CustomEvent('profileSyncUpdated', {
      detail: {
        profile: {
          id: 'stale-1',
          firstName: 'Fresh',
          lastName: 'Data',
          sport: 'Tennis',
          primarySport: 'Tennis',
          _profileUpdatedAt: ts
        },
        timestamp: ts,
        source: 'test-newer'
      }
    }));
  }, tsNew);

  await expect(page.locator('#sport')).toHaveText('Tennis');

  await page.evaluate((ts) => {
    globalThis.dispatchEvent(new CustomEvent('profileSyncUpdated', {
      detail: {
        profile: {
          id: 'stale-1',
          firstName: 'Fresh',
          lastName: 'Data',
          sport: 'Rugby',
          primarySport: 'Rugby',
          _profileUpdatedAt: ts
        },
        timestamp: ts,
        source: 'test-older'
      }
    }));
  }, tsOld);

  await expect(page.locator('#sport')).toHaveText('Tennis');
});
