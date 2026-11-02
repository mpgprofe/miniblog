import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 640 }, deviceScaleFactor: 1.5 });
await pg.goto('http://localhost:9323/'); await pg.waitForSelector('.test-file-test, .chip', { timeout: 10000 }).catch(() => {});
await pg.waitForTimeout(800);
await pg.screenshot({ path: '../img/t3_pw_report.png' });
await pg.goto('http://localhost:3300/privacidad.html'); await pg.setViewportSize({ width: 900, height: 520 });
await pg.screenshot({ path: '../img/t3_privacidad.png' });
await b.close();
