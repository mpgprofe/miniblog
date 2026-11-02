import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';

process.env.NODE_ENV = 'test';
let server, base;

before(async () => {
    const db = openDb(':memory:');
    seed(db);
    server = createApp(db).listen(0);
    base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const call = (path, { method = 'GET', body, token } = {}) =>
    fetch(base + path, {
        method,
        headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
        body: body && JSON.stringify(body),
    });

const login = async (email, password) =>
    (await (await call('/api/auth/login', { method: 'POST', body: { email, password } })).json()).token;

test('GET /api/posts devuelve una página con metadatos', async () => {
    const res = await call('/api/posts?limit=2');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.items.length, 2);
    assert.equal(data.total, 5);
    assert.equal(data.pages, 3);
});

test('crear una entrada sin token → 401 con Problem Details', async () => {
    const res = await call('/api/posts', {
        method: 'POST',
        body: { title: 'Hola', body: 'Cuerpo de prueba largo' },
    });
    assert.equal(res.status, 401);
    assert.match(res.headers.get('content-type'), /problem\+json/);
});

test('validación: datos incorrectos → 422 con lista de errores por campo', async () => {
    const token = await login('ana@campus.test', 'clave-segura-1');
    const res = await call('/api/posts', { method: 'POST', token, body: { title: 'x', body: 'corto' } });
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.deepEqual(data.errors.map((e) => e.field).sort(), ['body', 'title']);
});

test('flujo feliz: crear (201 + Location) y el borrador no es público', async () => {
    const token = await login('ana@campus.test', 'clave-segura-1');
    const res = await call('/api/posts', {
        method: 'POST',
        token,
        body: { title: 'Entrada nueva', body: 'Contenido de la entrada nueva' },
    });
    assert.equal(res.status, 201);
    assert.match(res.headers.get('location'), /^\/api\/posts\/\d+$/);
    const { id } = await res.json();
    assert.equal((await call(`/api/posts/${id}`)).status, 404);
});

test('control de acceso: un alumno no puede borrar la entrada de otro (403)', async () => {
    const luis = await login('luis@campus.test', 'clave-segura-2');
    const res = await call('/api/posts/1', { method: 'DELETE', token: luis });
    assert.equal(res.status, 403);
});

test('solo el profesorado publica', async () => {
    const ana = await login('ana@campus.test', 'clave-segura-1');
    const profe = await login('profe@campus.test', 'clave-profe-3');
    const { id } = await (
        await call('/api/posts', {
            method: 'POST',
            token: ana,
            body: { title: 'Para publicar', body: 'Texto largo de ejemplo' },
        })
    ).json();
    assert.equal((await call(`/api/posts/${id}/publish`, { method: 'PATCH', token: ana })).status, 403);
    assert.equal((await call(`/api/posts/${id}/publish`, { method: 'PATCH', token: profe })).status, 204);
    assert.equal((await call(`/api/posts/${id}`)).status, 200);
});

test('login incorrecto → 401 sin revelar si existe el email', async () => {
    const a = await call('/api/auth/login', {
        method: 'POST',
        body: { email: 'ana@campus.test', password: 'mala' },
    });
    const b = await call('/api/auth/login', {
        method: 'POST',
        body: { email: 'nadie@campus.test', password: 'mala' },
    });
    assert.equal(a.status, 401);
    assert.deepEqual(await a.json(), await b.json());
});
