// ⚠️ SOLO DIDÁCTICO: muestra por qué NO se concatenan strings en SQL.
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT, password_hash TEXT);
INSERT INTO users(email,password_hash) VALUES ('ana@campus.test','hash-secreto-de-ana'),('luis@campus.test','hash-secreto-de-luis');`);

const entrada = process.argv[2] ?? "' OR '1'='1";

// ❌ VULNERABLE: la entrada del usuario se pega dentro de la consulta
const mala = `SELECT email FROM users WHERE email = '${entrada}'`;
console.log('❌ Consulta construida:', mala);
console.log(
    '   Resultado:',
    db
        .prepare(mala)
        .all()
        .map((r) => r.email),
);

// ✅ SEGURO: consulta parametrizada; la entrada viaja aparte, como dato
console.log('✅ Consulta parametrizada: SELECT email FROM users WHERE email = ?');
console.log(
    '   Resultado:',
    db
        .prepare('SELECT email FROM users WHERE email = ?')
        .all(entrada)
        .map((r) => r.email),
);
