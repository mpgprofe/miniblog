import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';

process.env.NODE_ENV = 'test';
const llamadas = [];
// Doble del cliente de Anthropic: no hay red ni coste
const fakeClient = {
    messages: {
        create: async (params) => {
            llamadas.push(params);
            return {
                stop_reason: 'end_turn',
                content: [{ type: 'text', text: 'Resumen de prueba.' }],
                usage: { input_tokens: 80, output_tokens: 5 },
            };
        },
    },
};
let server, base, token;
before(async () => {
    const db = openDb(':memory:');
    seed(db);
    server = createApp(db, { aiClient: fakeClient }).listen(0);
    base = `http://localhost:${server.address().port}`;
    const r = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ana@campus.test', password: 'clave-segura-1' }),
    });
    token = (await r.json()).token;
});
after(() => server.close());

const post = (body, t = token) =>
    fetch(base + '/api/ai/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(t && { authorization: `Bearer ${t}` }) },
        body: JSON.stringify(body),
    });
const largo = 'Texto de ejemplo suficientemente largo para resumir. '.repeat(3);

test('sin sesión no se puede usar la IA (401)', async () =>
    assert.equal((await post({ text: largo }, null)).status, 401));
test('texto demasiado largo → 422 y no se llama al modelo', async () => {
    const antes = llamadas.length;
    assert.equal((await post({ text: 'x'.repeat(7000) })).status, 422);
    assert.equal(llamadas.length, antes);
});
test('resumen correcto: modelo barato y tope de salida', async () => {
    const res = await post({ text: largo });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).summary, 'Resumen de prueba.');
    assert.equal(llamadas.at(-1).model, 'claude-haiku-5-5');
    assert.ok(llamadas.at(-1).max_tokens <= 400);
});
