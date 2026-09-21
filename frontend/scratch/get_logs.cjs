const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', error => {
    logs.push(`[PAGEERROR] ${error.message}\n${error.stack}`);
  });

  try {
    await page.goto('http://127.0.0.1:5173/auth');
    await page.type('input[placeholder="Enter your nickname"]', 'teststudent');
    await page.type('input[placeholder="Password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for a few seconds to let it crash
    await page.waitForTimeout(3000);
  } catch (err) {
    logs.push(`[SCRIPT ERROR] ${err.message}`);
  }

  fs.writeFileSync('browser_logs.txt', logs.join('\n'));
  await browser.close();
})();
