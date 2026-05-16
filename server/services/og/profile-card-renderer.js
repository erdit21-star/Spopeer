const puppeteer = require('puppeteer');
const { renderProfileCardHtml } = require('./profile-card-template');

async function renderProfileCardPng(profile) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

    const html = renderProfileCardHtml(profile);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    return await page.screenshot({ type: 'png', fullPage: false });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  renderProfileCardPng
};
