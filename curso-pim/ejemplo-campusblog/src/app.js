import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import aiRoutes from './routes/ai.js';
import { errorHandler, notFound } from './errors.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createApp(db, { aiClient } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    'default-src': ["'self'"],
                    'script-src': ["'self'"],
                    'style-src': ["'self'"],
                    'img-src': ["'self'", 'data:'],
                },
            },
        }),
    );
    app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }));
    app.use(express.json({ limit: '100kb' }));

    // /docs usa scripts propios de Swagger UI: se monta antes de aplicar CSP estricta no hace falta
    // si se sirve con su propio middleware; aquí lo dejamos con CSP relajada solo en esa ruta.
    const openapi = parse(readFileSync(path.join(root, 'openapi.yaml'), 'utf8'));
    app.use(
        '/docs',
        (_req, res, next) => {
            res.setHeader(
                'Content-Security-Policy',
                "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
            );
            next();
        },
        swaggerUi.serve,
        swaggerUi.setup(openapi),
    );

    if (process.env.NODE_ENV !== 'test')
        app.use(
            '/api/auth',
            rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }),
        );

    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    app.use('/api/auth', authRoutes(db));
    app.use('/api/posts', postRoutes(db));
    // La ruta de IA solo existe si hay clave configurada (o se inyecta un doble en tests)
    if (aiClient || process.env.ANTHROPIC_API_KEY)
        app.use('/api/ai', aiRoutes(aiClient ? { client: aiClient } : {}));
    app.use(express.static(path.join(root, 'public')));
    app.use((_req, _res, next) => next(notFound('La ruta')));
    app.use(errorHandler);
    return app;
}
