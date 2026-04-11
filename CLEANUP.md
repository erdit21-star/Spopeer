SPOPEER CLEANUP GUIDE
=====================

SAFE TO KEEP FOR THE ACTUAL PRODUCT
-----------------------------------

1) server/
KEEP
Reason:
- This is almost certainly your backend app.
- package.json starts the project with: node server/server.js
- package.json also runs tests from inside server/.
Keep this unless you are removing the backend completely.

2) public/
KEEP
Reason:
- This is your frontend app.
- It contains index.html, feed.html, css, js, pages, components, images, and uploads.
- This looks like the main web client.

Inside public/, keep these first:
- public/index.html
- public/feed.html
- public/css/
- public/js/
- public/pages/
- public/components/
- public/images/
- public/assets/images/

Conditional:
- public/data/ → keep if your frontend reads local JSON/mock/demo data from here.
- public/uploads/ → keep only if your app truly stores uploads in the repo folder.
  Usually this should NOT be tracked long-term if uploads are user-generated or temporary.

3) package.json
KEEP
Reason:
- Main project scripts live here.
- It defines install, dev, start, lint, test, e2e, and verify commands.

4) package-lock.json
KEEP
Reason:
- Keeps dependency versions stable.

5) .gitignore
KEEP
Reason:
- Prevents junk, secrets, node_modules, build artifacts, and uploads from being committed.

6) README.md
KEEP
Reason:
- Good for setup, deployment notes, and collaborators.

7) .editorconfig
KEEP
Reason:
- Helps keep formatting consistent.

8) .nvmrc
KEEP
Reason:
- Useful if you want the same Node version everywhere.

9) eslint.config.cjs
KEEP
Reason:
- This is your lint config.
- Keep if you still want code quality checks.

10) scripts/
KEEP
Reason:
- package.json references scripts/syntax-check.js
- So at least part of this folder is actively used.

11) verify-all.js
KEEP if you actually use it
Reason:
- Looks like a project-wide verification script.
- If you do not run it anymore, it can be removed later.

12) .github/workflows/
KEEP if you use GitHub Actions
Reason:
- Usually contains CI/CD automation.
- Keep if GitHub runs your tests/deployments automatically.

13) Dockerfile
KEEP only if you deploy with Docker
Reason:
- Needed for container deployment.

14) docker-compose.yml
KEEP only if you use local Docker services
Reason:
- Helpful for local PostgreSQL / app stack setup.

15) Procfile
KEEP only if your host needs it
Reason:
- Common on Heroku/Render-style deploys.
- Remove if your current deployment does not use Procfile-based startup.

16) .dockerignore
KEEP if Dockerfile is kept
Reason:
- Helps make Docker builds smaller and cleaner.


SAFE TO DELETE ONLY IF YOU DO NOT WANT TESTING
----------------------------------------------

17) e2e/
DELETE if:
- You do not run end-to-end tests.
- You do not use Playwright.

KEEP if:
- You want browser-level testing for login/signup/auth.
- You want regression testing before deployment.

18) playwright.config.js
DELETE if:
- You delete e2e/ and stop using Playwright.

KEEP if:
- You keep E2E tests.


SAFE TO DELETE ONLY IF YOU DO NOT WANT PROJECT DOCS / OPS DOCS
--------------------------------------------------------------

19) docs/
DELETE if:
- You are the only developer
- You do not need deployment, staging, rollback, API, or backup docs
- You want a slimmer repo

KEEP if:
- You plan to deploy seriously
- You want staging / production / rollback notes
- Others may work on the project later

Strong suggestion:
- Even if you clean the repo, keep:
  - docs/SETUP.md
  - docs/API.md
  - docs/PRODUCTION_CHECKLIST.md

Possible lower priority docs:
- BACKUP_RESTORE.md
- ROLLBACK.md
- STAGING_CHECKLIST.md
- STAGING_QA.md
Only delete these if you truly do not use staging or formal deployment processes.


THINGS I WOULD CHECK VERY CAREFULLY BEFORE DELETING
---------------------------------------------------

20) public/uploads/
Usually best practice:
- Do NOT keep real uploaded user files in Git.
- Keep the folder only if the app requires it to exist.
- If needed, keep the folder but add its contents to .gitignore.

21) public/data/
Check what is inside:
- If it contains mock JSON, seed data, or old demo files, you can probably delete it.
- If the UI needs those files at runtime, keep it.

22) public/assets/images/ vs public/images/
Check for duplication:
- You may have duplicate image folders.
- If both contain similar logos/banners/icons, merge into one location.
- Do not delete either until you confirm which paths are used in HTML/CSS/JS.

23) feed.html and index.html
Likely keep both:
- index.html is probably landing/auth/home.
- feed.html is probably the logged-in feed page.
Delete only if one is obsolete and no longer linked.

24) .github/workflows/
Delete only if:
- You are not using GitHub Actions at all.
If you are pushing to GitHub and want automated checks, keep it.

25) Dockerfile / docker-compose.yml / Procfile
You probably do NOT need all three forever.
Use this rule:
- Keep Dockerfile if Docker deploy
- Keep docker-compose.yml if local Docker workflow
- Keep Procfile if host platform needs it
Delete unused deployment methods to reduce confusion.


MY RECOMMENDED “MINIMAL BUT SAFE” VERSION
-----------------------------------------

KEEP:
- server/
- public/
- scripts/
- package.json
- package-lock.json
- .gitignore
- README.md
- .editorconfig
- .nvmrc
- eslint.config.cjs

KEEP ONLY IF USED:
- .github/workflows/
- docs/
- e2e/
- playwright.config.js
- verify-all.js
- Dockerfile
- docker-compose.yml
- Procfile
- .dockerignore

REVIEW CAREFULLY:
- public/uploads/
- public/data/
- public/assets/images/
- public/images/


IF YOU WANT THE REPO AS A CLEAN PRODUCTION APP
----------------------------------------------

Delete first if unused:
- e2e/
- playwright.config.js
- docs/ (or keep only SETUP.md + API.md)
- verify-all.js
- docker-compose.yml
- Procfile
- Dockerfile
- .dockerignore
- .github/workflows/

Keep no matter what:
- server/
- public/
- package.json
- package-lock.json
- scripts/
- .gitignore
- README.md


BEST NEXT STEP
--------------

Before deleting anything:
1. Search where each file/folder is referenced.
2. Delete only one group at a time.
3. Run:
   npm install
   npm run lint
   npm start
4. If keeping tests:
   npm test
   npm run test:e2e
