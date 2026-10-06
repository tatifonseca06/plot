# Plot

Proyecto universitario para descubrir y organizar experiencias con amigos.

## Estado

Primera entrega: estructura y dependencias, página de inicio provisional y API Express con `GET /api/health`. Express confirmado por la estudiante.

Todavía no están implementados el login, CRUD, base de datos ni despliegue. La pantalla inicial no reproduce aún el diseño de Figma.

## Ejecutar

Requisito: Node.js 22.23.1 (versión utilizada, también indicada en `.nvmrc`).

Desde la carpeta `plot`, abrir dos terminales:

```sh
# Terminal 1: interfaz en http://localhost:3000
npm run dev:frontend
```

```sh
# Terminal 2: API en http://localhost:4000/api/health
npm run dev:backend
```

La API responde:

```json
{"data":{"status":"ok","service":"plot-api"}}
```

Esta ruta solo verifica el servidor HTTP; no comprueba PostgreSQL.

Para reinstalar en otro equipo:

```sh
npm --prefix frontend ci
npm --prefix backend ci
```

Cada aplicación tiene su propio `package.json` y lockfile. El `package.json` raíz solo proporciona atajos; no utiliza npm workspaces.

## Estructura y recorrido de una petición

```text
plot/
  frontend/src/app/       Pantallas y estilos
  backend/src/
    server.ts            Inicia el servidor HTTP
    app.ts               Configura Express y los middleware
    routes/              Asocia URL y controlador
    controllers/         Recibe peticiones y construye respuestas
  docs/                  Explicaciones y decisiones
```

Ejemplo: `GET /api/health` pasa por `app.ts`, llega a `health.routes.ts` y ejecuta `getHealth` en el controlador, que devuelve JSON.

El Modelo de MVC incluirá los datos y reglas de negocio, y se incorporará al desarrollar los módulos. Prisma será una herramienta de persistencia dentro de esa capa. Las vistas estarán en Next.js. Esta base todavía no constituye un Core MVC funcional.

## Dependencias

- Next.js y React: interfaz y páginas.
- TypeScript: comprobación estática de tipos; no sustituye la validación de peticiones.
- Tailwind CSS: estilos.
- Motion: animaciones, instalado para su uso posterior.
- Express: servidor y API JSON.
- CORS: configura qué origen puede leer la API desde el navegador; no es autenticación.
- dotenv: carga variables locales desde `.env`, si existe.
- Prisma 7, Prisma Client, adaptador PostgreSQL y pg: herramientas instaladas para la futura persistencia. Los modelos y migraciones se crearán al diseñar usuarios.
- tsx: ejecuta TypeScript y reinicia el backend durante desarrollo.
- ESLint: revisión estática del frontend.

Los puertos funcionan con valores locales predeterminados. `backend/.env.example` explica las variables opcionales. Los archivos `.env` quedan excluidos de Git.

## Verificación

```sh
npm run check
npm run build
```

Estas comprobaciones de inicialización no reemplazan las pruebas funcionales exigidas por la materia.

## Avisos de dependencias

La auditoría inicial de npm reportó 5 avisos altos en la cadena de ESLint/Next (`braces`) y 4 en herramientas de Prisma (`deepmerge-ts`, `mysql2`). Las soluciones automáticas propuestas implican cambios mayores de versiones; no se aplicó `npm audit fix --force`. Revisar actualizaciones compatibles antes del despliegue. No se han usado esas herramientas con entradas de usuarios ni se ha desplegado la aplicación.

Guía del primer paso: [docs/01-inicializacion.md](docs/01-inicializacion.md).
