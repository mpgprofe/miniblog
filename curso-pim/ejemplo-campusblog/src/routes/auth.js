import { Router } from 'express';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../auth.js';
import { loginSchema, registerSchema } from '../schemas.js';
import { HttpError, unauthorized } from '../errors.js';

export default function authRoutes(db) {
    const r = Router();

    r.post('/register', (req, res) => {
        const data = registerSchema.parse(req.body);
        if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email))
            throw new HttpError(409, 'Conflicto', 'Ya existe un usuario con ese email');
        const info = db
            .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
            .run(data.email, data.name, hashPassword(data.password));
        res.status(201).json({ id: Number(info.lastInsertRowid), email: data.email, name: data.name });
    });

    r.post('/login', (req, res) => {
        const { email, password } = loginSchema.parse(req.body);
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        // Mismo mensaje si falla el email o la contraseña: no revelamos qué usuarios existen.
        if (!user || !verifyPassword(password, user.password_hash))
            throw unauthorized('Credenciales incorrectas');
        res.json({ token: signToken(user), user: { id: user.id, name: user.name, role: user.role } });
    });

    r.get('/me', requireAuth, (req, res) => {
        res.json(db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.id));
    });

    return r;
}
