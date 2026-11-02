/** Error de aplicación con formato "Problem Details" (RFC 9457). */
export class HttpError extends Error {
    constructor(status, title, detail, extra = {}) {
        super(detail ?? title);
        this.status = status;
        this.title = title;
        this.detail = detail;
        this.extra = extra;
    }
}

export const notFound = (what = 'Recurso') => new HttpError(404, 'No encontrado', `${what} no existe`);
export const forbidden = (d = 'No tienes permiso para esta acción') => new HttpError(403, 'Prohibido', d);
export const unauthorized = (d = 'Necesitas iniciar sesión') => new HttpError(401, 'No autenticado', d);

/** Middleware final: todos los errores salen con el mismo formato. */
export function errorHandler(err, _req, res, _next) {
    if (err.name === 'ZodError') {
        return res
            .status(422)
            .type('application/problem+json')
            .json({
                type: 'https://campusblog.example/errors/validation',
                title: 'Datos no válidos',
                status: 422,
                errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
            });
    }
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status)
        .type('application/problem+json')
        .json({
            type: `https://campusblog.example/errors/${status}`,
            title: status >= 500 ? 'Error interno' : err.title,
            status,
            ...(status < 500 && err.detail ? { detail: err.detail } : {}),
            ...err.extra,
        });
}
