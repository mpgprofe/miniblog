import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const axeSrc = fs.readFileSync(path.resolve('../ejemplo-campusblog/node_modules/axe-core/axe.min.js'), 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ deviceScaleFactor: 2, viewport: { width: 640, height: 300 } });
const pg = await ctx.newPage();
await pg.goto('file://' + path.resolve('mockups/bad_page.html'));
await pg.addScriptTag({ content: axeSrc });
const r = await pg.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }));
let t = '$ npx playwright test a11y   # axe-core sobre una página con problemas\n';
t += `Violaciones encontradas: ${r.violations.length}\n\n`;
for (const v of r.violations) {
  t += `✖ [${v.impact}] ${v.id}: ${v.help}\n    elemento: ${v.nodes[0].target.join(' ')}\n`;
}
fs.writeFileSync('out/axe.txt', t);
console.log(t);
await pg.screenshot({ path: '../img/t3_bad_page.png' });
await b.close();
