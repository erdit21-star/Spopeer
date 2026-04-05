<!-- Updated  -->
# Staging QA Checklist

Complete all flows on staging before promoting to production.

## Prerequisites
- [ ] Staging environment deployed and accessible
- [ ] Staging database seeded or has test data
- [ ] Email provider configured (or dev fallback used)
- [ ] HTTPS enabled

## Auth Flows
- [ ] **Signup**: New user can create account
  - Valid email, strong password, all required fields
  - Verification email received (or logged in dev)
  - User can log in immediately after signup
- [ ] **Login**: Existing user can log in
  - Correct credentials → success + cookie set
  - Wrong password → error message, no info leak
  - Non-existent email → generic error, no info leak
- [ ] **Logout**: User can log out
  - Cookies cleared
  - Redirected to home/login
  - Cannot access protected routes after logout
- [ ] **Forgot Password**: Reset flow works
  - Email sent with reset link
  - Reset link works within 1 hour
  - Password updated, can log in with new password
- [ ] **Email Verification**: Verify link works
  - Link in email leads to verification
  - Account marked as verified
  - Welcome email sent

## Profile Flows
- [ ] **View Profile**: Own and public profiles load
- [ ] **Edit Profile**: Can update bio, sport, photo
- [ ] **Upload Avatar**: Image upload works
- [ ] **Upload Cover**: Cover photo upload works
- [ ] **Privacy**: Private profiles hide details from others

## Feed & Posts
- [ ] **Create Post**: Text post publishes successfully
- [ ] **Like Post**: Like/unlike toggles correctly
- [ ] **Comment**: Comments appear under post
- [ ] **Feed Tabs**: For You, Following, Sport feeds load

## Social Features
- [ ] **Follow User**: Follow/unfollow works
- [ ] **Connections**: Connection list loads
- [ ] **Messages**: Can send and receive messages
- [ ] **Notifications**: Notifications appear for actions

## Admin
- [ ] **Admin Login**: Admin user can access dashboard
- [ ] **User Management**: Admin can view/edit/deactivate users
- [ ] **Dashboard Stats**: Numbers load correctly

## Performance
- [ ] Pages load within 3 seconds
- [ ] No console errors in browser
- [ ] No 500 errors in server logs
- [ ] API responses under 500ms for typical requests

## Security
- [ ] No tokens visible in browser localStorage
- [ ] Cookies are HttpOnly (check DevTools → Application → Cookies)
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting works (rapid requests get 429)
- [ ] CSP headers present in responses

## Mobile
- [ ] Responsive layout works on mobile viewport
- [ ] Touch interactions work
- [ ] Navigation menu works on mobile

## Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if applicable)
- [ ] Edge (latest)
