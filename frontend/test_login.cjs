const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
  
  await page.type('input[type="email"]', 'admin@quizpop.dev');
  await page.type('input[type="password"]', 'admin123');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]')
  ]);
  
  console.log('Current URL:', page.url());
  
  await browser.close();
})();
