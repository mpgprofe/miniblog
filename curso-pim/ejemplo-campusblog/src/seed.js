import { hashPassword } from './auth.js';

/** Datos de demostración (solo desarrollo). */
export function seed(db) {
    const user = db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)');
    user.run('ana@campus.test', 'Ana Ruiz', hashPassword('clave-segura-1'), 'student');
    user.run('luis@campus.test', 'Luis Mora', hashPassword('clave-segura-2'), 'student');
    user.run('profe@campus.test', 'Marta Profe', hashPassword('clave-profe-3'), 'teacher');
    const post = db.prepare(
        "INSERT INTO posts (title, body, status, author_id) VALUES (?, ?, 'published', ?)",
    );
    post.run(
        'Primeros pasos con Git en pareja',
        'Hoy hemos configurado el repositorio, las ramas y el tablero Kanban del proyecto.',
        1,
    );
    post.run(
        'Por qué elegimos Express y SQLite',
        'Comparamos tres stacks y decidimos con una matriz de decisión ponderada.',
        2,
    );
    post.run(
        'Nuestro MVP en una semana',
        'Recortamos el alcance: login, crear entradas y listarlas. Lo demás es "nice to have".',
        1,
    );
    post.run(
        'Probando la API con Swagger UI',
        'La documentación OpenAPI nos sirve de contrato entre front y back.',
        2,
    );
    post.run(
        'Accesibilidad: lo que nos dijo Lighthouse',
        'Contraste, etiquetas y orden de tabulación: tres arreglos rápidos.',
        1,
    );
}
