# ADR-003: Elegimos SQLite en desarrollo y PostgreSQL en producción

- **Estado:** Aceptada · **Fecha:** 12/11/2026 · **Decide:** Ana y Luis

## Contexto
Necesitamos una BD relacional. Queremos arrancar sin instalar nada,
pero desplegar con una BD gestionada.

## Decisión
Usaremos SQLite (módulo node:sqlite) en local y PostgreSQL en producción,
con migraciones SQL versionadas en /migrations.

## Alternativas consideradas
- Solo PostgreSQL con Docker: más fiel a producción, pero exige Docker a todos.
- MongoDB: nuestros datos son muy relacionales (usuarios–entradas–categorías).

## Consecuencias
+ Arranque inmediato.  − Hay que evitar sintaxis específica de un motor.
