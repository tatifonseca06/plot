# Plot

Proyecto universitario para descubrir y organizar experiencias con amigos.

## Lo que funciona ahora

- Registro e inicio/cierre de sesión reales.
- Cuentas de participante y organizador.
- Crear, listar, consultar, editar y eliminar experiencias propias como organizador.
- Persistencia con PostgreSQL y Prisma, migración versionada y permisos en Express.
- Pantallas compactas de login, registro y experiencias; lista paginada.

Este primer módulo MVC no incluye aún catálogo público, aprobación, reservas, misiones, reseñas ni despliegue. Las experiencias son privadas del organizador, sin publicación. No se han aplicado todavía los patrones exigidos por la materia.

## Usar en este equipo

La base local ya está preparada. Si Docker está apagado, ejecutar `colima start` primero.

```sh
cd ~/plot
npm run db:up
```

Abrir dos terminales dentro de `plot`:

```sh
npm run dev:backend
```

```sh
npm run dev:frontend
```

Abrir http://localhost:3000, registrarse como **Organizador**, iniciar sesión y crear una experiencia. Los participantes no pueden usar el CRUD de organizadores. No hay cuentas de demostración preinsertadas.

Para detener solo la base sin borrar sus datos: `npm run db:stop`.

## Instalar desde cero

Requisitos: Node.js 22.23.1 y Docker con Compose. En este Mac está instalado el comando `docker-compose`; si tu equipo usa el plugin moderno, sustituirlo por `docker compose` en los scripts de la raíz.

1. Copiar `backend/.env.example` a `backend/.env` y reemplazar la contraseña de ejemplo tanto en POSTGRES_PASSWORD como en DATABASE_URL. No versionar el archivo.
2. Ejecutar `npm --prefix backend ci` y `npm --prefix frontend ci`.
3. Ejecutar `npm run db:up`.
4. Ejecutar `npm --prefix backend run db:deploy` y `npm --prefix backend run generate`.
5. Arrancar backend y frontend con los comandos anteriores.

La base usa el puerto local 5433 y un volumen Docker persistente exclusivo de Plot. Express usa 4000; Next.js usa 3000. `FRONTEND_URL` debe coincidir con el origen del navegador. `frontend/.env.example` muestra la URL interna de Express; el valor predeterminado funciona localmente.

## MVC y archivos principales

```text
backend/
  prisma/schema.prisma       Entidades y relaciones
  prisma/migrations/         Historial de cambios de la base
  src/routes/                URL → controlador
  src/controllers/           Solicitudes, consultas Prisma y respuestas
  src/middleware/auth.ts     Sesiones y permisos
  src/security/password.ts   Hash de contraseñas
  src/validations.ts         Reglas de entrada
  src/db.ts                  Conexión Prisma
  src/app.ts                 Configuración de Express y errores
  src/server.ts              Inicio del servidor
frontend/src/
  app/                       Vistas: login, registro, experiencias
  components/                Formularios y tabla
  lib/api.ts                 Peticiones JSON a Express
```

El Modelo incluye datos y reglas; Prisma es la herramienta de persistencia. Los controladores acceden directamente a Prisma en esta versión sencilla. Las vistas de Next.js consumen la API JSON de Express. No se han creado capas de servicios o repositorios.

## Comprobaciones

```sh
npm run check
npm run build
npm --prefix backend test
```

Las pruebas usan exclusivamente `plot_test`. En este equipo ya está configurada. En otro equipo, crear esa base vacía, copiar `backend/.env` a `backend/.env.test`, cambiar DATABASE_URL para terminar en `/plot_test` y establecer `NODE_ENV=test`. Después ejecutar `npm --prefix backend run db:deploy:test` y el comando de pruebas. Nunca reutilizar la base de la aplicación para pruebas.

Se comprobaron 15 subcasos de API y la integración HTTP desde Next.js hasta PostgreSQL. La verificación visual en navegador queda pendiente. Detalles y evidencias: [docs/02-core-mvc.md](docs/02-core-mvc.md).

## Dependencias pendientes de revisar antes del despliegue

La auditoría inicial de npm reportó 5 avisos altos en dependencias de ESLint/Next y 4 en herramientas de Prisma. Las soluciones automáticas sugeridas cambiaban versiones mayores; no se aplicó `npm audit fix --force`. Esta entrega es local y todavía requiere revisar versiones y configuración de producción antes de desplegar.
