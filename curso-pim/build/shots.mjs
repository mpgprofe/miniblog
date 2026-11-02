import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const IMG = path.resolve('../img');
const OUT = path.resolve('out');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ deviceScaleFactor: 2 });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- 1. Capturas de terminal a partir de salidas REALES (out/*.txt)
function termHtml(title, text) {
  const lines = text.replace(/\s+$/, '').split('\n').map((l) => {
    let h = esc(l);
    if (l.startsWith('$ ')) {
      h = h.replace(/^\$ ([^#]*)(#.*)?$/, (_, c, k) => `<span class="p">$</span> <span class="c">${c}</span>${k ? `<span class="k">${k}</span>` : ''}`);
    } else {
      h = h.replace(/^(\s*)(✔|✓)/, '$1<span class="g">$2</span>').replace(/^(\s*)(✖|✗)/, '$1<span class="r">$2</span>')
        .replace(/(CONFLICT[^<]*)/, '<span class="r">$1</span>').replace(/^(&lt;{7}.*|={7}|&gt;{7}.*)$/, '<span class="y">$1</span>')
        .replace(/^(\s*\d+ passed.*)$/, '<span class="g">$1</span>');
    }
    return h || '&nbsp;';
  }).join('\n');
  return `<html><body style="margin:0;background:#e5e7eb;padding:14px;width:fit-content;max-width:980px">
<div style="background:#0f172a;border-radius:10px;overflow:hidden;box-shadow:0 4px 14px #0004;min-width:520px">
<div style="background:#1e293b;padding:7px 12px;display:flex;gap:6px;align-items:center"><i style="width:11px;height:11px;border-radius:50%;background:#ef4444"></i><i style="width:11px;height:11px;border-radius:50%;background:#eab308"></i><i style="width:11px;height:11px;border-radius:50%;background:#22c55e"></i><span style="color:#94a3b8;font:12px Inter,sans-serif;margin-left:10px">${esc(title)}</span></div>
<pre style="margin:0;padding:14px 16px;color:#e2e8f0;font:13px/1.45 'JetBrains Mono',monospace;white-space:pre-wrap;word-break:break-word">${lines}</pre></div>
<style>.p{color:#22c55e}.c{color:#f8fafc;font-weight:600}.k{color:#64748b}.g{color:#4ade80}.r{color:#f87171}.y{color:#fbbf24}</style></body></html>`;
}
const terms = {
  t1_term_git_log: ['git_log.txt', 'Terminal — historial del equipo'],
  t1_term_conflict: ['git_conflict.txt', 'Terminal — conflicto de fusión'],
  t1_term_evidencias: ['git_evidencias.txt', 'Terminal — evidencias de aportación'],
  t1_term_resuelto: ['git_resolved.txt', 'Terminal — conflicto resuelto'],
  t2_term_migraciones: ['migraciones.txt', 'Terminal — migraciones al arrancar'],
  t2_term_curl_list: ['curl_list.txt', 'Terminal — GET paginado'],
  t2_term_curl_422: ['curl_422.txt', 'Terminal — error de validación 422'],
  t2_term_curl_201: ['curl_201.txt', 'Terminal — creación 201 + Location'],
  t2_term_curl_404: ['curl_404.txt', 'Terminal — error 404'],
  t3_term_tests: ['npm_test.txt', 'Terminal — pruebas unitarias e integración'],
  t3_term_coverage: ['coverage.txt', 'Terminal — cobertura de tests (nativa de Node)'],
  t3_term_audit: ['audit.txt', 'Terminal — npm audit'],
  t3_term_e2e: ['e2e.txt', 'Terminal — pruebas E2E con Playwright'],
  t3_term_headers: ['headers.txt', 'Terminal — cabeceras de seguridad (Helmet)'],
  t3_term_jwt: ['jwt_payload.txt', 'Terminal — contenido de un JWT'],
  t3_term_hook_ok: ['hook_ok.txt', 'Terminal — pre-commit que arregla el formato'],
  t3_term_hook_fail: ['hook_fail.txt', 'Terminal — pre-commit que bloquea el commit'],
  t3_term_lint: ['lint.txt', 'Terminal — ESLint y Prettier'],
  t3_term_sqli: ['sqli.txt', 'Terminal — inyección SQL (demostración didáctica)'],
  t3_term_axe: ['axe.txt', 'Terminal — informe de axe-core'],
  t4_term_ai_tests: ['ai_tests.txt', 'Terminal — tests del proxy de IA (sin gastar tokens)'],
};
for (const [name, [f, title]] of Object.entries(terms)) {
  const p = path.join(OUT, f);
  if (!fs.existsSync(p)) { console.log('FALTA', f); continue; }
  const pg = await ctx.newPage();
  await pg.setContent(termHtml(title, fs.readFileSync(p, 'utf8')));
  await (await pg.$('body > div')).screenshot({ path: `${IMG}/${name}.png` });
  await pg.close();
}

// ---- 2. Diagramas Mermaid
const mjs = fs.readFileSync(require.resolve('mermaid/dist/mermaid.min.js'), 'utf8');
for (const f of fs.readdirSync('diagrams').filter((f) => f.endsWith('.mmd'))) {
  const code = fs.readFileSync(`diagrams/${f}`, 'utf8');
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1400, height: 700 });
  await pg.setContent(`<html><body style="margin:0;background:#fff;padding:16px;${f.includes('gantt') ? 'width:1100px' : 'width:fit-content'}"><pre class="mermaid" id="m">${esc(code)}</pre></body></html>`);
  await pg.addScriptTag({ content: mjs });
  try {
    await pg.evaluate(async () => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', gantt: { useMaxWidth: false, leftPadding: 190, barHeight: 26, fontSize: 13, sectionFontSize: 14 }, flowchart: { useMaxWidth: false }, fontFamily: 'Inter, sans-serif', themeVariables: { fontSize: '15px' } });
      await mermaid.run({ nodes: [document.getElementById('m')] });
    });
  } catch (e) { console.log('ERROR mermaid', f, String(e.message || e).slice(0, 300)); await pg.close(); continue; }
  const el = await pg.$('#m svg');
  await el.screenshot({ path: `${IMG}/${f.replace('.mmd', '.png')}` });
  await pg.close();
}

// ---- 3. Maquetas ilustrativas
for (const f of fs.readdirSync('mockups').filter((f) => f.endsWith('.html') && f !== 'bad_page.html')) {
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1000, height: 120 });
  await pg.goto('file://' + path.resolve('mockups', f));
  await pg.screenshot({ path: `${IMG}/t_mock_${f.replace('.html', '')}.png`, fullPage: true });
  await pg.close();
}
await b.close();
console.log('capturas terminadas');
