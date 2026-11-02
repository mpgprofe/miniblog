# Instrucciones del proyecto: CampusBlog

## Stack
Node 22 (ESM), Express 4, SQLite con `node:sqlite`, zod para validar, JWT para auth.

## Comandos
- `npm test`       → tests unitarios e integración (node:test)
- `npm run lint`   → ESLint + Prettier (debe quedar sin avisos)
- `npx playwright test` → E2E

## Convenciones
- Errores SIEMPRE con el formato Problem Details (ver src/errors.js).
- SQL SIEMPRE parametrizado. Nunca concatenar entradas del usuario.
- Cada ruta protegida debe comprobar PERMISOS a nivel de recurso (autor o admin).
- Commits en formato Conventional Commits.
- Toda función nueva lleva su test.

## Prohibido
- No leer ni modificar `.env`. No añadir dependencias sin avisar.
- No tocar los tests para hacerlos pasar: arregla el código.
