const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function(){
  try {
    const htmlPath = path.join(__dirname, '..', 'public', 'home.html');
    const jsPath = path.join(__dirname, '..', 'public', 'js', 'shared-ui.js');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const sharedUi = fs.readFileSync(jsPath, 'utf8');

    // Remove script tags to avoid auto-loading remote scripts
    const cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, '');

    const dom = new JSDOM(cleaned, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
    const { window } = dom;

    // Provide minimal globals expected by shared-ui
    window.ProfileSyncService = { init: function(){} };

    // Evaluate the shared-ui script in the JSDOM window
    window.eval(sharedUi);

    // Wait a tick for DOMContentLoaded handlers
    await new Promise(r => setTimeout(r, 200));

    // Manually call addSaveButtons if available
    if (window.addSaveButtons) {
      window.addSaveButtons(window.document);
    } else if (window.sharedUi && window.sharedUi.setupSocialFeedRuntime) {
      // shared-ui attaches addSaveButtons internally; trigger DOMContentLoaded
      window.document.dispatchEvent(new window.window.Event('DOMContentLoaded'));
    }

    // Wait a bit for injection
    await new Promise(r => setTimeout(r, 300));

    const buttons = window.document.querySelectorAll('.act-btn.save-btn');
    console.log('Found save buttons:', buttons.length);
    if (buttons.length === 0) {
      console.error('NO_SAVE_BUTTONS');
      process.exitCode = 2;
      return;
    }

    // Click first button
    const first = buttons[0];
    first.click();

    // Check localStorage
    const saved = JSON.parse(window.localStorage.getItem('spopeer_saved_posts') || '[]');
    console.log('Saved posts in localStorage after click:', saved);
    if (!Array.isArray(saved) || saved.length === 0) {
      console.error('SAVE_NOT_PERSISTED');
      process.exitCode = 3;
      return;
    }

    console.log('SMOKE_TEST_OK');
  } catch (err) {
    console.error('SMOKE_TEST_ERROR', err);
    process.exitCode = 1;
  }
})();

