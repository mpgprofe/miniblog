// Prueba un paquete SCORM 1.2 con un LMS simulado (API SCORM) en Chromium.
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const zip = path.resolve(process.argv[2]);
const dir = fs.mkdtempSync('/tmp/scorm-test-');
execSync(`unzip -q "${zip}" -d "${dir}"`);
const manifest = fs.readFileSync(`${dir}/imsmanifest.xml`, 'utf8');
const checks = [];
const ok = (c, m) => { checks.push([c, m]); console.log((c ? '✔' : '✖') + ' ' + m); };
ok(/<schemaversion>1\.2<\/schemaversion>/.test(manifest), 'manifest: SCORM 1.2');
ok(/adlcp:scormtype="sco"/.test(manifest), 'manifest: recurso SCO');
ok(/<adlcp:masteryscore>70</.test(manifest), 'manifest: nota de aprobado 70');
const hrefs = [...manifest.matchAll(/<file href="([^"]+)"/g)].map((m) => m[1]);
ok(hrefs.every((h) => fs.existsSync(`${dir}/${h}`)), `manifest: los ${hrefs.length} archivos listados existen`);

const quiz = JSON.parse(fs.readFileSync(`${dir}/index.html`, 'utf8').match(/window\.QUIZ = (\{.*?\});<\/script>/s)[1]);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
pg.on('pageerror', (e) => errors.push(String(e)));
pg.on('requestfailed', (r) => errors.push('requestfailed ' + r.url()));
pg.on('dialog', (d) => d.accept());
await pg.addInitScript(() => {
  const data = { 'cmi.core.lesson_status': 'not attempted' };
  window.__calls = [];
  window.API = {
    LMSInitialize: () => { window.__calls.push(['init']); return 'true'; },
    LMSGetValue: (k) => data[k] ?? '',
    LMSSetValue: (k, v) => { data[k] = v; window.__calls.push(['set', k, v]); return 'true'; },
    LMSCommit: () => { window.__calls.push(['commit']); return 'true'; },
    LMSFinish: () => { window.__calls.push(['finish']); return 'true'; },
    LMSGetLastError: () => '0', LMSGetErrorString: () => '', LMSGetDiagnostic: () => '',
    __data: data,
  };
});
await pg.goto('file://' + dir + '/index.html');
const imgs = await pg.$$eval('img', (is) => is.map((i) => i.complete && i.naturalWidth > 0));
ok(imgs.length > 0 && imgs.every(Boolean), `todas las imágenes (${imgs.length}) cargan`);
ok((await pg.evaluate(() => window.__calls[0]?.[0])) === 'init', 'llama a LMSInitialize');
ok((await pg.evaluate(() => window.API.__data['cmi.core.lesson_status'])) === 'incomplete', 'estado inicial: incomplete');
const nq = await pg.$$eval('#quiz .q', (q) => q.length);
ok(nq === quiz.questions.length, `se renderizan ${nq} preguntas`);

// Intento 1: todo correcto menos la primera (marcamos una opción errónea)
for (let i = 0; i < quiz.questions.length; i++) {
  const q = quiz.questions[i];
  let sel = q.answer;
  if (i === 0) sel = [q.options.map((_, j) => j).find((j) => !q.answer.includes(j))];
  for (const j of sel) await pg.check(`#q${i} input[value="${j}"]`);
}
await pg.click('#finish');
const res = await pg.evaluate(() => ({ ...window.API.__data }));
const expected = Math.round(100 * (quiz.questions.length - 1) / quiz.questions.length);
ok(res['cmi.core.score.raw'] == expected, `nota enviada: ${res['cmi.core.score.raw']} (esperada ${expected})`);
ok(res['cmi.core.score.max'] == 100 && res['cmi.core.score.min'] == 0, 'score min/max = 0/100');
ok(res['cmi.core.lesson_status'] === (expected >= 70 ? 'passed' : 'failed'), `estado final: ${res['cmi.core.lesson_status']}`);
ok(res['cmi.interactions.0.result'] === 'wrong' && res['cmi.interactions.1.result'] === 'correct', 'interacciones registradas (wrong/correct)');
ok(res['cmi.interactions.0.id'] === 'q1', 'interacción con id');
await pg.screenshot({ path: process.argv[3] ?? '/tmp/scorm_quiz.png' });
// Intento 2: reintento con todo bien
await pg.click('#retry');
for (let i = 0; i < quiz.questions.length; i++) for (const j of quiz.questions[i].answer) await pg.check(`#q${i} input[value="${j}"]`);
await pg.click('#finish');
ok((await pg.evaluate(() => window.API.__data['cmi.core.score.raw'])) == 100, 'reintento: 100 puntos');
await pg.evaluate(() => window.dispatchEvent(new Event('pagehide')));
ok((await pg.evaluate(() => window.__calls.some((c) => c[0] === 'finish'))), 'llama a LMSFinish al salir');
// Sin LMS
const pg2 = await b.newPage();
pg2.on('pageerror', (e) => errors.push('sinLMS ' + e));
await pg2.goto('file://' + dir + '/index.html');
ok((await pg2.textContent('#lms')).includes('sin LMS'), 'funciona sin LMS (modo local)');
// Móvil
const pg3 = await b.newPage({ viewport: { width: 390, height: 800 } });
await pg3.goto('file://' + dir + '/index.html');
ok(await pg3.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'móvil: sin scroll horizontal');
ok(errors.length === 0, 'sin errores de JS ni recursos: ' + (errors.join('; ') || 'ok'));
await b.close();
process.exit(checks.every(([c]) => c) ? 0 : 1);
