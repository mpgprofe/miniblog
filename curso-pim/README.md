# Curso PIM · Proyecto Intermodular de DAW (material autodidacta)

Cuatro temas pensados para parejas de 2.º de DAW. Cada tema se entrega en **dos formatos** a partir de una única fuente:

| Tema | ODT (autodidacta, con índice, capturas y solucionario) | Paquete SCORM 1.2 para Moodle |
|---|---|---|
| 1. Gestión del proyecto en pareja | `dist/tema1-gestion-proyecto-pareja.odt` | `dist/tema1-gestion-proyecto-pareja-scorm12.zip` |
| 2. Elección y uso del stack | `dist/tema2-eleccion-uso-stack.odt` | `dist/tema2-eleccion-uso-stack-scorm12.zip` |
| 3. Calidad, seguridad y accesibilidad | `dist/tema3-calidad-seguridad-accesibilidad.odt` | `dist/tema3-calidad-seguridad-accesibilidad-scorm12.zip` |
| 4. IA en el desarrollo | `dist/tema4-ia-en-el-desarrollo.odt` | `dist/tema4-ia-en-el-desarrollo-scorm12.zip` |

## Qué hay en cada carpeta

| Carpeta | Contenido |
|---|---|
| `temas/` | **Fuente** de cada tema: `temaN.md` (contenido) y `temaN.quiz.json` (preguntas de autoevaluación). |
| `img/` | Capturas y diagramas usados por los temas (generados por los scripts de `build/`). |
| `ejemplo-campusblog/` | App de referencia **CampusBlog** (Node 22 + Express + SQLite + Tailwind). De ella salen las salidas reales de los temas. |
| `plantillas/` | Plantillas listas para copiar: anteproyecto, ADR, acuerdo de equipo, DoD, registro de uso de IA, plantillas de issue/PR y CI. |
| `build/` | Scripts para regenerar todo (ODT, SCORM, capturas, diagramas). |
| `dist/` | **Entregables** ya generados. |

## Subir un tema a Moodle

1. En el curso: **Activar edición → Añadir una actividad o recurso → Paquete SCORM**.
2. Sube el `.zip` del tema (no lo descomprimas).
3. Ajustes recomendados: *Método de calificación* = **Intento más alto**; *Número de intentos* = ilimitado (el cuestionario es de autoevaluación y se puede repetir); *Mostrar paquete* = en la misma ventana o ventana nueva (ambas funcionan).
4. La **nota de aprobado (70)** viaja dentro del paquete (`masteryscore`). Moodle recibe: nota (0–100), estado *aprobado/suspendido* y el detalle de cada pregunta (*interacciones*), que verás en **Informes del SCORM**.

Cada paquete es **un único SCO**: el alumnado lee el tema (con índice lateral y barra de progreso) y al final resuelve el cuestionario con corrección inmediata y explicación; al pulsar **Finalizar y enviar nota** se informa a Moodle.

## Regenerar los materiales

Requisitos: `pandoc`, LibreOffice (`soffice` + Python-UNO), Python 3, Node 22.

```bash
cd curso-pim/build && npm ci          # solo para regenerar capturas y diagramas (mermaid, playwright-core, lighthouse)
cd .. && python3 build/build.py       # genera los 4 ODT + 4 SCORM en dist/   (o: build.py tema1 tema3)
node build/test_scorm.mjs dist/tema1-gestion-proyecto-pareja-scorm12.zip   # prueba el SCORM con un LMS simulado
```

Capturas y salidas reales (opcional): arranca `ejemplo-campusblog` con `SEED=1 PORT=3300 JWT_SECRET=demo node src/server.js` y ejecuta `build/shots.mjs`, `build/webshots.mjs`, `build/axe.mjs`, `build/lh.mjs`.

## Ejecutar la app de ejemplo

```bash
cd curso-pim/ejemplo-campusblog
npm ci
cp .env.example .env
npm run css                         # compila Tailwind
npm run dev:seed                    # http://localhost:3000  ·  API docs en /docs
npm test                            # 14 tests (unitarios + integración + proxy de IA con doble de prueba)
PW_CHROMIUM=/ruta/a/chromium npx playwright test   # 8 pruebas E2E (omite PW_CHROMIUM si hiciste `npx playwright install chromium`)
```

## Qué está verificado y qué no (transparencia)

**Ejecutado y comprobado en este repositorio:** la API de CampusBlog y sus 14 tests; las 8 pruebas E2E con Playwright (escritorio y móvil) incluyendo axe; Lighthouse (97/100/96/100 → 100/100/100/100 tras dos arreglos); `npm audit`; la cobertura; los *hooks* de Husky + lint-staged; la demostración de inyección SQL (sobre una BD de juguete en memoria); las salidas de Git (historial, conflicto, evidencias) de un repositorio de prueba; el índice, las tablas y el formato de los ODT (abiertos con LibreOffice); y cada paquete SCORM (manifest, imágenes, nota, interacciones, reintento, modo sin LMS, móvil) con un LMS simulado.

**No ejecutado (código de referencia):** los fragmentos de NestJS, Laravel, Spring Boot, FastAPI, Prisma, React/Vue/Next y shadcn/ui del Tema 2, y la llamada real al proveedor del LLM del Tema 4 (no hay clave en este entorno; el proxy está probado con un doble de prueba).

**Recreaciones ilustrativas (señaladas como tales en el texto):** tablero de GitHub Projects, pantalla de protección de ramas, Pull Request, banner de cookies y plantilla de registro de IA, porque dependen de una cuenta de GitHub o son maquetas.

**Sin probar en un Moodle real:** el SCORM se ha validado contra un LMS simulado (API SCORM 1.2). Conviene importar un paquete en vuestra Moodle antes de publicarlo.

**Datos sujetos a cambio:** precios y modelos de IA (Tema 4), versión del OWASP Top 10, y cualquier cifra de herramientas de terceros. Se indican fechas y se recomienda comprobar la documentación vigente.
