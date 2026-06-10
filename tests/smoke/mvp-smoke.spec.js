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

async function verifyAuthenticatedPages(browser, apiContext) {
  const storageState = await apiContext.storageState();
  const context = await browser.newContext({
    baseURL: E2E_BASE_URL,
    storageState
  });

  try {
    const feedPage = await context.newPage();
    await feedPage.goto('/feed.html');
    await expect(feedPage.locator('body')).toBeVisible();

    const profilePage = await context.newPage();
    await profilePage.goto('/pages/profiles/edit-profile.html');
    await expect(profilePage.locator('body')).toBeVisible();
  } finally {
    await context.close();
  }
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
        sessions.push({ ...session, roleConfig });

        await updateProfile(session.apiContext, roleConfig);
        await uploadAvatar(session.apiContext);
        await createVideoPost(session.apiContext, roleConfig);
        await verifyAuthenticatedPages(browser, session.apiContext);
      }

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
