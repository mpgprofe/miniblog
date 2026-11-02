import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { listQuerySchema, postSchema } from '../schemas.js';
import { forbidden, notFound } from '../errors.js';

export default function postRoutes(db) {
    const r = Router();

    // GET /api/posts?page=1&limit=10&q=git  → listado público paginado (solo publicados)
    r.get('/', (req, res) => {
        const { page, limit, q } = listQuerySchema.parse(req.query);
        const like = `%${q ?? ''}%`;
        const total = db
            .prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'published' AND title LIKE ?")
            .get(like).n;
        const items = db
            .prepare(
                `SELECT p.id, p.title, p.created_at AS createdAt, u.name AS author
           FROM posts p JOIN users u ON u.id = p.author_id
          WHERE p.status = 'published' AND p.title LIKE ?
          ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
            )
            .all(like, limit, (page - 1) * limit);
        res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
    });

    r.get('/:id', (req, res) => {
        const post = db
            .prepare(
                `SELECT p.id, p.title, p.body, p.status, p.created_at AS createdAt, p.author_id AS authorId, u.name AS author
           FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`,
            )
            .get(req.params.id);
        if (!post || post.status !== 'published') throw notFound('La entrada');
        res.json(post);
    });

    r.post('/', requireAuth, (req, res) => {
        const data = postSchema.parse(req.body);
        const info = db
            .prepare('INSERT INTO posts (title, body, category_id, author_id) VALUES (?, ?, ?, ?)')
            .run(data.title, data.body, data.categoryId ?? null, req.user.id);
        res.status(201)
            .location(`/api/posts/${info.lastInsertRowid}`)
            .json({ id: Number(info.lastInsertRowid), status: 'draft' });
    });

    r.patch('/:id/publish', requireAuth, (req, res) => {
        if (!['teacher', 'admin'].includes(req.user.role))
            throw forbidden('Solo el profesorado puede publicar');
        const info = db.prepare("UPDATE posts SET status = 'published' WHERE id = ?").run(req.params.id);
        if (!info.changes) throw notFound('La entrada');
        res.status(204).end();
    });

    r.delete('/:id', requireAuth, (req, res) => {
        const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(req.params.id);
        if (!post) throw notFound('La entrada');
        // Control de acceso a nivel de objeto: solo el autor o un admin (OWASP A01)
        if (post.author_id !== req.user.id && req.user.role !== 'admin') throw forbidden();
        db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
        res.status(204).end();
    });

    return r;
}
