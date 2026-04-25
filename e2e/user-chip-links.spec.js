const { test, expect } = require('@playwright/test');

const viewer = {
  id: 'viewer-1',
  email: 'viewer@example.com',
  userType: 'athlete',
  firstName: 'Viewer',
  lastName: 'User'
};

const startPages = [
  '/feed.html',
  '/pages/search/search.html',
  '/pages/profiles/public-profile.html?userId=viewer-1',
  '/pages/profiles/user-posts.html',
  '/pages/profiles/followers.html',
  '/pages/profiles/edit-profile.html',
  '/pages/dashboard/settings.html',
  '/pages/dashboard/notifications.html',
  '/pages/messaging/inbox.html',
  '/pages/features/library.html',
  '/pages/sponsorship/sponsor.html'
];

const actionExpectations = {
  'view-profile': '/pages/profiles/public-profile.html?userId=viewer-1',
  'edit-profile': '/pages/profiles/edit-profile.html',
  'your-activity': '/pages/profiles/user-posts.html',
  'account-settings': '/pages/dashboard/settings.html',
  'notifications': '/pages/dashboard/notifications.html',
  'privacy': '/pages/legal/privacy.html',
  'connections': '/pages/messaging/inbox.html',
  'library': '/pages/library/index.html',
  'events': '/pages/events/event.html',
  'help': '/pages/company/help-center.html',
  'report': '/pages/contact/index.html',
  'my-analytics': '/pages/marketplace/analytics.html',
  'achievements': '/pages/profiles/user-posts.html',
  'my-sports': '/pages/profiles/edit-profile.html#section-sports',
  'invite-friends': '/pages/contact/index.html',
  'switch-account': '/pages/auth/login.html'
};

async function seedAuth(page) {
  await page.addInitScript((seedUser) => {
    localStorage.setItem('spopeer_loggedIn', 'true');
    localStorage.setItem('spopeer_user', JSON.stringify(seedUser));
  }, viewer);
}

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { user: viewer } })
      });
      return;
    }

    if (url.pathname.startsWith('/api/users/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payload: viewer })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ payload: [], data: [] })
    });
  });
}

async function openProfileMenu(page) {
  await expect(page.locator('#userChip')).toBeVisible();
  await page.locator('#userChip').click();
  await expect(page.locator('[data-user-menu]')).toBeVisible();
}

async function gotoStartPage(page, startPage) {
  try {
    await page.goto(startPage, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    if (!String(error).includes('ERR_ABORTED')) {
      throw error;
    }
  }

  await expect(page.locator('#userChip')).toBeVisible();
}

test('user chip menu links stay valid from every page that renders the menu', async ({ page }) => {
  test.setTimeout(120000);

  await seedAuth(page);
  await mockApi(page);

  for (const startPage of startPages) {
    await test.step(startPage, async () => {
      await gotoStartPage(page, startPage);
      await openProfileMenu(page);

      const availableActions = await page.locator('button[data-action]').evaluateAll((buttons) => {
        return buttons.map((button) => button.dataset.action).filter(Boolean);
      });

      const resolvedActions = await page.evaluate((actions) => {
        const resolver = window.sharedUi && window.sharedUi.getProfileMenuActionUrl;
        if (typeof resolver !== 'function') {
          return null;
        }

        return Object.fromEntries(actions.map((action) => [action, resolver(action)]));
      }, availableActions);

      expect(resolvedActions).not.toBeNull();

      for (const action of availableActions) {
        if (!Object.prototype.hasOwnProperty.call(actionExpectations, action)) {
          continue;
        }

        expect(resolvedActions[action]).toBeTruthy();
        const resolvedUrl = new URL(resolvedActions[action], page.url());
        expect(`${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`).toBe(actionExpectations[action]);
      }
    });
  }
});