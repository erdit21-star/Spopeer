/* eslint-disable no-undef */
const { test, expect, request: playwrightRequest } = require('@playwright/test');

const HAS_E2E_URL = Boolean(process.env.E2E_BASE_URL);
const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000';
const DEFAULT_PASSWORD = process.env.E2E_ROLE_PASSWORD || 'SpopeerPass123!';
const ROLE_CONFIGS = [
  { role: 'athlete', firstName: 'Ava', lastName: 'Athlete', sport: 'Football' },
  { role: 'coach', firstName: 'Casey', lastName: 'Coach', sport: 'Basketball' },
  { role: 'club', firstName: 'City', lastName: 'Club', sport: 'Volleyball' },
  { role: 'professional', firstName: 'Priya', lastName: 'Pro', sport: 'Tennis' }
];

const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6YewsAAAAASUVORK5CYII=',
  'base64'
);

const MP4_SAMPLE = Buffer.from([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d,
  0x69, 0x73, 0x6f, 0x32
]);

function uniqueEmail(role) {
  return `e2e-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function getRolePassword(role) {
  return process.env[`E2E_${role.toUpperCase()}_PASSWORD`] || DEFAULT_PASSWORD;
}

async function createSession() {
  return playwrightRequest.newContext({ baseURL: E2E_BASE_URL });
}

async function getCsrfToken(apiContext) {
  const csrfResponse = await apiContext.get('/api/auth/csrf');
  expect(csrfResponse.ok()).toBeTruthy();

  const storageState = await apiContext.storageState();
  const cookie = storageState.cookies.find((entry) => entry.name === 'csrf_token');
  expect(cookie).toBeTruthy();
  return cookie.value;
}

async function withCsrf(apiContext, path, options) {
  const token = await getCsrfToken(apiContext);
  return apiContext.fetch(path, {
    ...(options || {}),
    headers: {
      ...((options && options.headers) || {}),
      'X-CSRF-Token': token
    }
  });
}

async function loginOrSignupRole(roleConfig) {
  const apiContext = await createSession();
  const envEmail = process.env[`E2E_${roleConfig.role.toUpperCase()}_EMAIL`];
  const email = envEmail || uniqueEmail(roleConfig.role);
  const password = getRolePassword(roleConfig.role);

  if (!envEmail) {
    const signupResponse = await withCsrf(apiContext, '/api/auth/signup', {
      method: 'POST',
      data: {
        email,
        password,
        firstName: roleConfig.firstName,
        lastName: roleConfig.lastName,
        dateOfBirth: '1995-01-01',
        role: roleConfig.role,
        sport: roleConfig.sport,
        profession: roleConfig.role === 'professional' ? 'Physiotherapist' : roleConfig.role,
        privacyPolicyAccepted: true,
        termsOfServiceAccepted: true,
        marketingConsent: false
      }
    });
    const signupJson = await signupResponse.json();
    expect(signupResponse.ok(), JSON.stringify(signupJson)).toBeTruthy();
  }

  const loginResponse = await withCsrf(apiContext, '/api/auth/login', {
    method: 'POST',
    data: { email, password }
  });
  const loginJson = await loginResponse.json();
  expect(loginResponse.ok(), JSON.stringify(loginJson)).toBeTruthy();

  return {
    apiContext,
    email,
    user: loginJson && loginJson.data && loginJson.data.user
  };
}

async function updateProfile(apiContext, roleConfig) {
  const response = await withCsrf(apiContext, '/api/users/me', {
    method: 'PATCH',
    data: {
      displayName: `${roleConfig.firstName} ${roleConfig.lastName}`,
      bio: `E2E ${roleConfig.role} profile`,
      location: 'Athens',
      sport: roleConfig.sport,
      profession: roleConfig.role === 'professional' ? 'Physiotherapist' : roleConfig.role
    }
  });
  const json = await response.json();
  expect(response.ok(), JSON.stringify(json)).toBeTruthy();

  const readBackResponse = await apiContext.get('/api/users/me');
  const readBackJson = await readBackResponse.json();
  expect(readBackResponse.ok(), JSON.stringify(readBackJson)).toBeTruthy();
  expect(readBackJson.data.displayName).toBe(roleConfig.firstName + ' ' + roleConfig.lastName);
  expect(readBackJson.data.bio).toBe('E2E ' + roleConfig.role + ' profile');
  expect(readBackJson.data.location).toBe('Athens');
  expect(readBackJson.data.sport).toBe(roleConfig.sport);
}

async function uploadAvatar(apiContext) {
  const response = await withCsrf(apiContext, '/api/users/avatar', {
    method: 'POST',
    multipart: {
      avatar: {
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: PNG_PIXEL
      }
    }
  });
  const json = await response.json();
  expect(response.ok(), JSON.stringify(json)).toBeTruthy();
  expect(json.data.avatarUrl).toBeTruthy();
}

async function createVideoPost(apiContext, roleConfig) {
  const response = await withCsrf(apiContext, '/api/posts', {
    method: 'POST',
    multipart: {
      content: `Smoke post from ${roleConfig.role}`,
      sport: roleConfig.sport,
      visibility: 'public',
      media: {
        name: 'clip.mp4',
        mimeType: 'video/mp4',
        buffer: MP4_SAMPLE
      }
    }
  });
  const json = await response.json();
  expect(response.ok(), JSON.stringify(json)).toBeTruthy();
  expect(json.data.id).toBeTruthy();
  return json.data;
}

async function verifyAuthenticatedPages(browser, apiContext, expectedUserId) {
  const storageState = await apiContext.storageState();
  const context = await browser.newContext({
    baseURL: E2E_BASE_URL,
    storageState,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const mobileRoutes = [
    { path: '/', route: 'feed' },
    { path: '/index.html', route: 'feed' },
    { path: '/feed.html', route: 'feed' },
    { path: '/app.html', route: 'feed' },
    { path: '/pages/stories/archive.html', route: 'feed' },
    { path: '/articles.html', route: 'articles' },
    { path: '/messages.html', route: 'messages' },
    { path: '/pages/search/search.html', route: 'search' },
    { path: '/search.html', route: 'search' },
    { path: '/pages/community/community.html', route: 'community' },
    { path: '/pages/community/forums.html', route: 'community' },
    { path: '/pages/marketplace/marketplace.html', route: 'marketplace' },
    { path: '/pages/events/event.html', route: 'events' },
    { path: '/pages/library/index.html', route: 'library' },
    { path: '/pages/messaging/inbox.html', route: 'messages' },
    { path: '/pages/dashboard/notifications.html', route: 'notifications' },
    { path: '/pages/dashboard/settings.html', route: 'settings' },
    { path: '/pages/profiles/edit-profile.html', route: 'edit-profile' },
    { path: '/pages/profiles/public-profile.html', route: 'public-profile' },
    { path: '/pages/profiles/followers.html', route: 'followers' },
    { path: '/pages/profiles/user-posts.html', route: 'user-posts' },
    { path: '/pages/admin/dashboard.html', route: 'admin' },
    { path: '/pages/ads/ads-manager.html', route: 'admin' },
    { path: '/pages/marketplace/advanced-search.html', route: 'marketplace' },
    { path: '/pages/marketplace/create-listing.html', route: 'marketplace' },
    { path: '/pages/marketplace/messages.html', route: 'marketplace' },
    { path: '/pages/marketplace/notifications.html', route: 'marketplace' },
    { path: '/pages/marketplace/analytics.html', route: 'marketplace' },
    { path: '/pages/marketplace/my-listings.html', route: 'marketplace' },
    { path: '/pages/community/reels.html', route: 'community' },
    { path: '/pages/library/media.html', route: 'library' },
    { path: '/pages/articles/index.html', route: 'articles' },
    { path: '/pages/marketplace/moderation.html', route: 'marketplace' },
    { path: '/pages/events/event.html?eventId=mobile-smoke', route: 'events' },
    { path: '/pages/sponsorship/sponsor.html', route: 'sponsorship' },
    { path: '/pages/training/index.html', route: 'training' }
  ];

  try {
    const page = await context.newPage();
    const measuredButtonHeights = [];

    for (const entry of mobileRoutes) {
      const response = await page.goto(entry.path);
      expect(response && response.status(), 'HTTP response for ' + entry.path).toBeLessThan(400);
      const sessionResponse = await page.request.get('/api/auth/me');
      expect(sessionResponse.status(), 'authenticated session after navigating to ' + entry.path).toBe(200);
      const sessionJson = await sessionResponse.json();
      expect(Number(sessionJson.data.user.id), 'same signed-in user after navigating to ' + entry.path).toBe(Number(expectedUserId));
      await expect(page.locator('#spmApp'), 'mobile app shell for ' + entry.path).toBeVisible();
      await expect(page.locator('#spmScreen')).toBeVisible();
      await expect(page.locator('#spmApp')).toHaveAttribute('data-current-route', entry.route);

      // The first response itself must be the mobile shell, not desktop index markup.
      await expect(page.locator('.spm-tabbar')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.spm-tabbar button')).toHaveCount(5);
      await expect(page.locator('.spm-tabbar button[data-route="feed"]')).toBeVisible();

      await expect.poll(async () => page.locator('#spmScreen').evaluate((el) => el.children.length)).toBeGreaterThan(0);
      const actualRoute = await page.evaluate(() => {
        const active = document.querySelector('.spm-tabbar button.active');
        return active ? active.getAttribute('data-route') : '';
      });
      if (['feed', 'search', 'messages', 'profile'].includes(entry.route)) {
        expect(actualRoute, 'active mobile tab for ' + entry.path).toBe(entry.route);
      }

      const metrics = await page.locator('.spm-tabbar button').evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return { height: Math.round(rect.height), display: style.display, flexDirection: style.flexDirection };
      }));
      expect(metrics.every((item) => item.display === 'flex')).toBeTruthy();
      expect(metrics.every((item) => item.height >= 44)).toBeTruthy();
      measuredButtonHeights.push(metrics.map((item) => item.height));

      const hasHorizontalOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      );
      expect(hasHorizontalOverflow, 'horizontal overflow on ' + entry.path).toBeFalsy();

      // Confirm the route resolver selected the intended mobile screen.
    }

    const referenceHeights = measuredButtonHeights[0];
    for (const heights of measuredButtonHeights.slice(1)) {
      expect(heights).toEqual(referenceHeights);
    }
  } finally {
    await context.close();
  }
}

async function likeAndComment(viewerSession, authorSession, post) {
  expect(post && post.id, 'post to like/comment').toBeTruthy();

  const likeResponse = await withCsrf(viewerSession.apiContext, '/api/posts/' + encodeURIComponent(post.id) + '/like', {
    method: 'POST'
  });
  const likeJson = await likeResponse.json();
  expect(likeResponse.ok(), JSON.stringify(likeJson)).toBeTruthy();
  expect(likeJson.data.liked).toBe(true);

  const commentResponse = await withCsrf(viewerSession.apiContext, '/api/posts/' + encodeURIComponent(post.id) + '/comment', {
    method: 'POST',
    data: { content: 'E2E comment from ' + viewerSession.roleConfig.role }
  });
  const commentJson = await commentResponse.json();
  expect(commentResponse.ok(), JSON.stringify(commentJson)).toBeTruthy();
  expect(commentJson.data.id).toBeTruthy();

  const postResponse = await authorSession.apiContext.get('/api/posts/' + encodeURIComponent(post.id));
  const postJson = await postResponse.json();
  expect(postResponse.ok(), JSON.stringify(postJson)).toBeTruthy();
  expect(Number(postJson.data.likesCount)).toBeGreaterThanOrEqual(1);
  expect(Number(postJson.data.commentsCount)).toBeGreaterThanOrEqual(1);
}

async function followAndMessage(senderSession, receiverSession) {
  const followResponse = await withCsrf(senderSession.apiContext, `/api/follows/${encodeURIComponent(receiverSession.user.id)}`, {
    method: 'POST'
  });
  const followJson = await followResponse.json();
  expect([200, 201, 409]).toContain(followResponse.status());
  if (!followResponse.ok) {
    expect((followJson.error && followJson.error.code) || followJson.code).toBe('CONFLICT');
  }

  const notificationsResponse = await receiverSession.apiContext.get('/api/notifications');
  const notificationsJson = await notificationsResponse.json();
  expect(notificationsResponse.ok(), JSON.stringify(notificationsJson)).toBeTruthy();
  const notifications = notificationsJson.data || [];
  expect(notifications.some((entry) => String(entry.type || '').indexOf('follow') !== -1)).toBeTruthy();

  const conversationResponse = await withCsrf(senderSession.apiContext, '/api/messages/conversations', {
    method: 'POST',
    data: {
      participantId: receiverSession.user.id
    }
  });
  const conversationJson = await conversationResponse.json();
  expect([200, 201]).toContain(conversationResponse.status());
  const conversationId = conversationJson.data.id;
  expect(conversationId).toBeTruthy();

  const messageResponse = await withCsrf(senderSession.apiContext, `/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    data: {
      text: `Hello from ${senderSession.user.role}`
    }
  });
  const messageJson = await messageResponse.json();
  expect(messageResponse.ok(), JSON.stringify(messageJson)).toBeTruthy();

  const receiverConversationsResponse = await receiverSession.apiContext.get('/api/messages/conversations');
  const receiverConversationsJson = await receiverConversationsResponse.json();
  expect(receiverConversationsResponse.ok(), JSON.stringify(receiverConversationsJson)).toBeTruthy();
  expect((receiverConversationsJson.data || []).some((entry) => Number(entry.id) === Number(conversationId))).toBeTruthy();
}

async function logout(apiContext) {
  const response = await withCsrf(apiContext, '/api/auth/logout', {
    method: 'POST'
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Spopeer MVP Smoke', () => {
  test.skip(!HAS_E2E_URL, 'Set E2E_BASE_URL to run smoke tests against a deployed/staged environment.');
  test.describe.configure({ mode: 'serial' });

  test('authenticated role journeys', async ({ browser }) => {
    const sessions = [];

    try {
      for (const roleConfig of ROLE_CONFIGS) {
        const session = await loginOrSignupRole(roleConfig);
        session.roleConfig = roleConfig;
        sessions.push(session);

        await updateProfile(session.apiContext, roleConfig);
        await uploadAvatar(session.apiContext);
        session.createdPost = await createVideoPost(session.apiContext, roleConfig);
        await verifyAuthenticatedPages(browser, session.apiContext, session.user.id);
      }

      await likeAndComment(sessions[1], sessions[0], sessions[0].createdPost);
      await followAndMessage(sessions[0], sessions[1]);
      await followAndMessage(sessions[2], sessions[3]);
    } finally {
      for (const session of sessions) {
        await logout(session.apiContext).catch(() => {});
        await session.apiContext.dispose();
      }
    }
  });
});
