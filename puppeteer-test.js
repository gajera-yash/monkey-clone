const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[PAGE LOG] ${msg.type().toUpperCase()}:`, msg.text());
    });

    page.on('pageerror', err => {
        console.error('[PAGE ERROR]', err.toString());
    });

    console.log("Navigating to http://localhost:3000/admin ...");
    await page.goto('http://localhost:3000/admin');

    // Wait to capture sufficient logs
    await new Promise(r => setTimeout(r, 6000));

    await browser.close();
})();
