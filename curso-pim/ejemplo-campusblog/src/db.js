import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/** Abre la BD y aplica las migraciones pendientes (en orden alfabético). */
export function openDb(file = process.env.DB_FILE ?? ':memory:') {
    const db = new DatabaseSync(file);
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(
        "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))",
    );
    const done = new Set(
        db
            .prepare('SELECT name FROM _migrations')
            .all()
            .map((r) => r.name),
    );
    for (const f of readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort()) {
        if (done.has(f)) continue;
        db.exec('BEGIN');
        try {
            db.exec(readFileSync(path.join(dir, f), 'utf8'));
            db.prepare('INSERT INTO _migrations(name) VALUES (?)').run(f);
            db.exec('COMMIT');
            if (process.env.NODE_ENV !== 'test') console.log(`migración aplicada: ${f}`);
        } catch (e) {
            db.exec('ROLLBACK');
            throw e;
        }
    }
    return db;
}
