import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { forbidden, unauthorized } from './errors.js';

export const SECRET =
    process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'production' ? undefined : 'solo-para-desarrollo');
if (!SECRET) throw new Error('Falta la variable de entorno JWT_SECRET');

/** Hash con scrypt + sal aleatoria. Formato: sal:hash (hex). */
export function hashPassword(plain) {
    const salt = randomBytes(16);
    return `${salt.toString('hex')}:${scryptSync(plain, salt, 64).toString('hex')}`;
}

export function verifyPassword(plain, stored) {
    const [salt, hash] = stored.split(':');
    const candidate = scryptSync(plain, Buffer.from(salt, 'hex'), 64);
    return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '1h' });

/** Exige un token Bearer válido y deja el usuario en req.user. */
export function requireAuth(req, _res, next) {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) return next(unauthorized());
    try {
        const payload = jwt.verify(header.slice(7), SECRET);
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch {
        next(unauthorized('Token no válido o caducado'));
    }
}

export const requireRole =
    (...roles) =>
    (req, _res, next) =>
        roles.includes(req.user.role) ? next() : next(forbidden());
