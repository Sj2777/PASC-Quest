const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
    console.log(error.stack);
  });

  await page.goto('http://localhost:5173/auth');
  
  // Login
  await page.type('input[placeholder="Enter your nickname"]', 'teststudent');
  await page.type('input[placeholder="Password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  await browser.close();
})();
