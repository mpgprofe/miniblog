import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/auth.js';
import { postSchema, listQuerySchema } from '../src/schemas.js';

test('hashPassword no guarda la contraseña en claro y verifica bien', () => {
    const h = hashPassword('clave-segura-1');
    assert.ok(!h.includes('clave-segura-1'));
    assert.equal(verifyPassword('clave-segura-1', h), true);
    assert.equal(verifyPassword('otra-clave', h), false);
});

test('dos hashes de la misma contraseña son distintos (sal aleatoria)', () => {
    assert.notEqual(hashPassword('abc12345'), hashPassword('abc12345'));
});

test('postSchema rechaza títulos cortos', () => {
    const r = postSchema.safeParse({ title: 'Hi', body: 'Cuerpo suficientemente largo' });
    assert.equal(r.success, false);
});

test('listQuerySchema aplica valores por defecto y limita el máximo', () => {
    assert.deepEqual(listQuerySchema.parse({}), { page: 1, limit: 10 });
    assert.equal(listQuerySchema.safeParse({ limit: '500' }).success, false);
});
