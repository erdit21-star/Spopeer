Spopeer - Real Users Launch Guide
=================================

This guide is based on a review of your current repository and focuses on what you must do to move from a development/demo setup to a real public user-ready launch.

What is already good in your project
------------------------------------
1. You already have a real backend stack:
	 - Node.js + Express
	 - PostgreSQL with Sequelize
	 - JWT auth with refresh sessions
	 - Cloudinary support
	 - Email support via Resend
	 - Socket.io for real-time features

2. You already added important production protections:
	 - Helmet
	 - CORS allowlist
	 - rate limits
	 - HttpOnly cookies
	 - CSRF handling
	 - password reset flow
	 - email verification flow
	 - readiness/health endpoints

3. Your frontend API layer is already using cookie-based auth and automatically fetches a CSRF token before POST/PUT/PATCH/DELETE requests.

That means you are NOT starting from zero.

Main goal
---------
To accept real users safely, you need to make sure five things are true at the same time:

1. The app is deployed on a real domain with HTTPS.
2. The production database is migrated correctly.
3. Email sending works for signup, verification, and password reset.
4. Frontend flows really call the backend and handle auth cookies correctly.
5. You add the missing launch essentials: abuse protection, moderation, legal pages, monitoring, backups, and a launch checklist.

Priority order
--------------
Do these in this exact order:

PHASE 1 - Make production technically usable
PHASE 2 - Make signup/login/password recovery reliable
PHASE 3 - Make public usage safe
PHASE 4 - Prepare for traffic and support
PHASE 5 - Soft launch and then full public launch

============================================================
PHASE 1 - Make production technically usable
============================================================

1. Choose your production hosting setup
---------------------------------------
Recommended simple stack:
- Frontend static hosting: Cloudflare Pages / Netlify / Vercel / same Node server if you prefer simplicity
- Backend hosting: Render / Railway / VPS / Fly.io
- Database: Managed PostgreSQL
- File/media: Cloudinary
- Email: Resend
- Error tracking: Sentry

Best practical setup for your current code:
- Backend on Render or Railway
- PostgreSQL managed database
- Frontend served either from your Node app or from a static host
- Domain like:
	- app.spopeer.com for frontend
	- api.spopeer.com for backend

2. Use HTTPS only
-----------------
This is mandatory because your auth cookies are secure in production.
If HTTPS is not working correctly, login/signup sessions will break.

You need:
- SSL certificate enabled
- production domain correctly attached
- all traffic redirected from http to https

3. Set all required environment variables
-----------------------------------------
Minimum production env you need:

NODE_ENV=production
PORT=your_platform_port
APP_URL=https://api.spopeer.com
FRONTEND_URL=https://app.spopeer.com
FRONTEND_URL_ALT=https://www.spopeer.com
DATABASE_URL=postgresql://...
JWT_SECRET=very_long_random_secret_at_least_64_chars
RESEND_API_KEY=...
EMAIL_FROM=noreply@spopeer.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SENTRY_DSN=...

Recommended extra env:
- REDIS_URL=... (for shared rate limiting/session safety across multiple instances)
- COOKIE_SAME_SITE=lax   or none if frontend and backend are on different subdomains and cross-site behavior requires it
- RECAPTCHA_SECRET or HCAPTCHA_SECRET

Important note:
If your frontend and backend are on different origins, you must test cookie behavior very carefully. Cookie auth often fails in production when domains or SameSite settings are wrong.

4. Run database migrations before launch
----------------------------------------
This is critical.
Your server start logs mention that in production you should use migrations only.
Do NOT depend on ad-hoc schema changes.

Before launch:
- create production DB
- run all migrations
- verify the following tables/columns exist and work:
	- users
	- refresh_sessions
	- password_reset_tokens
	- emailVerified
	- emailVerifyToken
	- lastLogin
	- username
	- profile/privacy fields used by UI

Then manually test:
- signup creates a row
- login works
- refresh works
- logout revokes session
- password reset token row is created
- verify link updates the user correctly

5. Confirm CORS and cookie settings with real domains
-----------------------------------------------------
Your backend only allows listed frontend origins.
So in production you must make sure FRONTEND_URL and FRONTEND_URL_ALT exactly match the real site origins.

Examples:
GOOD:
- https://app.spopeer.com
- https://www.spopeer.com

BAD:
- missing https
- trailing slash mismatch in code you build manually
- old preview domain still used in browser

After deployment, test from the browser network tab:
- /api/auth/csrf returns OK
- signup request sends X-CSRF-Token
- login response sets cookies
- later authenticated requests send cookies back

============================================================
PHASE 2 - Make signup/login/password reset reliable
============================================================

6. Finalize the real signup flow
--------------------------------
Your backend already supports:
- signup
- email verification
- login
- refresh token rotation
- forgot password
- reset password
- resend verification

What you must do now:

A. Confirm your frontend pages actually call the backend API.
Check these user journeys in the real deployed browser:
- sign up with new email
- log in with valid account
- log in with wrong password
- forgot password flow
- resend verification
- verify account via email link
- logout then refresh page

B. Decide your account activation policy.
Right now your signup creates the user as active immediately, while email verification is treated as optional enhancement.
That is okay for MVP, but for public launch you should choose one clear rule:

Option 1 - low friction launch
- allow immediate login after signup
- keep email verification optional but strongly encouraged

Option 2 - safer launch
- require email verification before using key features
- better if you expect spam and fake accounts

My recommendation:
- allow signup completion
- allow limited onboarding before verification
- block posting, messaging, marketplace listing, and event creation until emailVerified = true

That gives you less friction but better abuse protection.

7. Make email fully production-ready
------------------------------------
This is one of the biggest launch blockers.
Without reliable email, real users cannot:
- verify accounts
- reset passwords
- recover locked access

You need to do all of this:

A. Set up Resend properly
- add RESEND_API_KEY
- configure EMAIL_FROM using your domain
- verify your domain in Resend
- add SPF/DKIM/DMARC DNS records

B. Test all transactional emails:
- signup verification email
- resend verification email
- password reset email
- welcome email
- security alert email

C. Improve the email links.
Check that links point to correct production pages.
Do not leave localhost fallbacks during launch.

D. Create a support mailbox.
Examples:
- support@spopeer.com
- security@spopeer.com

8. Add CAPTCHA for public signup and recovery
---------------------------------------------
Your backend already supports reCAPTCHA or hCaptcha, but it only activates if the secret is configured.
For real users, enable it.

Do this:
- create hCaptcha or reCAPTCHA keys
- add the widget to signup page
- add it to forgot-password page too
- send captchaToken from frontend
- verify that backend rejects missing/invalid tokens

Why this matters:
Without CAPTCHA, public signup and password reset endpoints will be hammered by bots.

9. Harden password and account rules
------------------------------------
You already enforce password validation.
Now add product-level rules:
- require strong password text in UI
- show password rules before submit
- add email uniqueness messaging
- add username uniqueness checks if username becomes public identifier
- rate limit resend verification too
- add suspicious signup detection later (same IP, disposable email, repeated patterns)

10. Finish session management testing
------------------------------------
Your backend already uses DB-backed refresh sessions.
That is good.

Before launch, test:
- login from browser A
- login from browser B
- logout on browser A
- browser A can no longer refresh
- browser B still works if you want per-session logout only
- password change revokes all sessions
- reset password revokes all sessions

Also test browser restart:
- cookies persist as expected
- user stays logged in if refresh token is valid
- CSRF still works after reload

============================================================
PHASE 3 - Make public usage safe
============================================================

11. Add moderation before opening to the public
-----------------------------------------------
This is not optional for a social platform.
The second real users arrive, you need moderation controls.

Minimum moderation feature set:
- report user
- report post
- report message
- report marketplace listing
- admin review queue
- ban/suspend user
- content removal/hide action
- audit log for admin actions

Your code already has moderation routes and admin routes, but you still need to confirm the end-to-end admin workflow works in production.

12. Restrict risky features for unverified or new accounts
----------------------------------------------------------
For launch, do not give every new account unlimited power.

Recommended limits for brand-new accounts:
- cannot mass message
- cannot post external links immediately
- cannot create many marketplace listings on day one
- limited follow/connect actions per hour
- limited uploads per day
- no group spam invites

Recommended rule:
- new unverified users = read + limited profile setup
- verified users = normal usage

13. Review file upload safety
-----------------------------
You already use Cloudinary optionally and rate-limit uploads.
That is good, but for public launch you should verify:
- allowed MIME types are restricted
- size limits are enforced server-side
- image/video transformations are safe
- no arbitrary file upload execution risk
- EXIF stripping if privacy matters
- NSFW/unsafe content review plan if you support public media uploads

14. Add Redis-backed rate limiting correctly
--------------------------------------------
Your rate limiter can use Redis, but it currently falls back to in-memory if Redis packages are unavailable.
For real multi-instance production you should install and configure the missing dependencies explicitly.

Do this:
- add redis and rate-limit-redis to dependencies
- set REDIS_URL
- confirm rate limits are shared across all instances

Why this matters:
If you run multiple backend instances and use only memory-based limits, attackers can bypass limits by hitting different instances.

15. Add logging, monitoring, and alerts
---------------------------------------
At public launch you need to know when something breaks.

Required setup:
- Sentry for backend exceptions
- uptime monitoring for:
	- /api/health
	- /api/ready
- alerts for 5xx spikes
- alerts for DB connection failures
- alerts for email delivery failures
- alerts for high signup error rates

Also store structured logs in your hosting platform or log service.

16. Protect privacy and public data exposure
--------------------------------------------
You already have privacy/public profile handling.
Before launch, verify:
- private profiles are really private
- email addresses are never exposed through public endpoints
- admin-only routes are protected
- user-by-email endpoint does not expose more than intended
- hidden fields are not leaked in JSON responses
- password hashes and verify tokens never appear in logs or responses

============================================================
PHASE 4 - Prepare for traffic, trust, and support
============================================================

17. Write the legal pages before public launch
----------------------------------------------
For real users, you need visible pages for:
- Privacy Policy
- Terms of Use
- Community Guidelines
- Cookie Policy
- Contact / Support
- Report Abuse

If you handle EU users, this matters even more.
Because your repo and contact details suggest a Greece/EU context, do not launch publicly without proper legal text and consent handling.

18. Create a support workflow
-----------------------------
You need a simple support system from day one.
At minimum:
- support email inbox
- password reset help procedure
- abuse report handling procedure
- response templates
- admin escalation steps

19. Backup and disaster recovery
--------------------------------
Must-have before public launch:
- automatic PostgreSQL backups
- restore test at least once
- Cloudinary asset retention understanding
- environment variable backup in a secure password manager
- rollback plan for deployment

20. Decide what counts as beta and what is blocked
--------------------------------------------------
Do not launch every feature at once.
For first public users, decide:

Launch now:
- signup/login
- profile creation
- feed
- follow/connect
- basic messaging

Launch later or restrict:
- marketplace
- public groups
- sponsorships
- heavy media features
- admin-facing advanced tools

This reduces abuse and support load.

============================================================
PHASE 5 - Test, soft launch, then public launch
============================================================

21. Run a full manual production test checklist
-----------------------------------------------
Before inviting real users, test this exact list:

AUTH
- signup works
- duplicate email is blocked
- verification email arrives
- verify link works
- login works
- wrong password is rejected
- logout works
- refresh works after page reload
- forgot password email arrives
- reset password works
- change password logs out all sessions

PROFILE
- edit profile works
- avatar upload works
- privacy setting works
- public profile page loads correctly

SOCIAL
- create post works
- follow/unfollow works
- notifications appear
- messaging works
- search works

ADMIN / SAFETY
- admin can log in
- report flow works
- moderation action works
- banned/deactivated user cannot log in

OPERATIONS
- /api/health returns OK
- /api/ready returns ready
- Sentry receives a test event
- email provider sends successfully
- database reconnects after restart

22. Soft launch first
---------------------
Do NOT open immediately to everyone.
Start with:
- 10 to 30 invited users
- athletes/coaches/clubs you know personally
- people who will actually report bugs clearly

During soft launch, measure:
- signup success rate
- login failure rate
- email delivery rate
- average page errors
- support requests
- spam attempts

23. Add analytics carefully
---------------------------
You need product insight, but do it carefully.
Track:
- completed signups
- failed signups
- verified accounts
- successful logins
- failed logins
- password reset requests
- first post created
- first follow/connection
- retention after day 1 / day 7

24. Public launch only after soft-launch fixes
----------------------------------------------
Go public only when:
- signup is reliable
- password reset is reliable
- moderation works
- monitoring works
- legal pages are live
- support channel exists
- backups exist

============================================================
Specific issues and recommendations based on your current code
============================================================

1. Email is a launch dependency, not optional.
In production your backend treats missing RESEND_API_KEY as a fatal condition. That is correct behavior for launch. So configure email before doing anything else.

2. Your frontend API client is already doing an important thing correctly.
It fetches /api/auth/csrf automatically and sends X-CSRF-Token for mutating requests. That means your browser-side auth path is conceptually correct.

3. Your backend signup/login flow is mostly production-shaped.
You already have:
- signup limiter
- login limiter
- forgot-password limiter
- reset limiter
- refresh session rotation
- CSRF protection
- optional CAPTCHA support

4. CAPTCHA is not really enabled until you wire it in fully on the frontend and set secrets.
So treat this as unfinished until you test it in production.

5. Redis-backed rate limiting needs completion.
Your code attempts Redis only if REDIS_URL exists and the Redis packages are installed. Make that explicit in package.json and verify it actually works in deployment.

6. Email verification is currently optional.
That is okay for MVP, but for public launch you should restrict higher-risk actions for unverified users.

7. Cookie/auth domain testing is one of the biggest real-world failure points.
Even if the code is correct, cross-origin cookie behavior can break login on production domains. Test with the real deployed frontend and backend, not just localhost.

8. Make sure every public form shows helpful errors.
Real users do not tolerate silent failure. On signup/login/reset pages, every API error should produce a visible user-friendly message.

============================================================
My recommended launch plan for Spopeer
============================================================

Week 1
------
- deploy production backend
- deploy production frontend
- connect domain + HTTPS
- configure DATABASE_URL
- configure JWT_SECRET
- configure Resend
- run migrations
- confirm signup/login/password reset end-to-end

Week 2
------
- enable CAPTCHA
- enable Sentry
- add Redis-backed rate limiting
- verify Cloudinary uploads
- finish legal/support pages
- test moderation/admin flows

Week 3
------
- invite first 10 to 30 users
- collect bugs
- fix signup/login/onboarding issues
- restrict risky features for unverified/new users

Week 4
------
- improve onboarding
- add analytics dashboards
- tighten abuse rules
- open to larger public audience

============================================================
What I would do first if this were my project
============================================================

The first 10 actions I would personally do, in order:

1. Deploy backend to a real production host.
2. Deploy frontend to a real production host.
3. Set FRONTEND_URL, APP_URL, DATABASE_URL, JWT_SECRET, RESEND_API_KEY.
4. Run migrations on production DB.
5. Verify cookies, CSRF, signup, login, logout, refresh in browser.
6. Configure real email domain and test verification/reset emails.
7. Add hCaptcha or reCAPTCHA to signup and forgot-password.
8. Install/configure Redis rate limiting properly.
9. Publish privacy policy, terms, support, and abuse pages.
10. Soft launch with a small trusted group before public release.

Final answer
============

Can Spopeer accept real users now?

My honest answer:
- It is close.
- The backend is already much more production-ready than most early projects.
- But I would NOT publicly open it yet until you complete deployment, email, CAPTCHA, rate-limit hardening, legal/support pages, and full end-to-end testing on the real production domain.

If you complete the checklist in this guide, then yes - your project can be prepared to accept real users safely.

--
Last updated: April 13, 2026
