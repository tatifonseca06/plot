# Plot

<p align="center">
  <img src="frontend/public/plot-logo.png" alt="Logo de Plot: tres personas sobre un camino y el nombre de la aplicación" width="260">
</p>

**Organiza experiencias con amigos, desde la idea hasta un plan real.**

Plot es un proyecto universitario de Ingeniería Web. La versión final implementa **autenticación, catálogo público, moderación, fechas con cupos, salas, votaciones, reservas, misiones y reseñas**, con MVC, servicios transaccionales, una API de Express y persistencia en PostgreSQL.

Cualquier cuenta puede crear planes e invitar amigos. El grupo decide los detalles y cada persona confirma su cupo. La implementación de los módulos finales está preparada y verificada localmente. El despliegue de [Plot](https://plot-sable-kappa.vercel.app) aplica las migraciones comprometidas durante la compilación de producción antes de activar la nueva API.

## Contenido

- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Arquitectura MVC](#arquitectura-mvc)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Cómo probar la aplicación](#cómo-probar-la-aplicación)
- [API](#api)
- [Pruebas](#pruebas)
- [Solución de problemas](#solución-de-problemas)
- [Despliegue](#despliegue)
- [Alcance y documentación](#alcance-y-documentación)
- [Autoría](#autoría)

## Funcionalidades

- Registrar una cuenta que permite crear y participar en planes.
- Iniciar sesión con correo y contraseña y cerrar sesión.
- Crear planes privados o públicos, invitar amigos y administrar los propios.
- Usar un panel con tarjetas, filtros, reservas y próximas fechas, y un creador guiado con vista previa.
- Guardar ciudad, itinerario, qué incluye y recomendaciones junto con la primera fecha y las misiones.
- Elegir categoría y subcategoría mediante dropdowns dependientes cargados desde PostgreSQL.
- Validar título, categoría y descripción tanto en los formularios como en el backend.
- Conservar los registros en PostgreSQL después de recargar o cerrar la aplicación.
- Proteger la API con sesiones y comprobar el propietario al consultar, editar o eliminar.
- Mostrar formularios adaptables y una lista completa con desplazamiento de la página.

Las contraseñas se guardan mediante scrypt con sal aleatoria. Las sesiones tienen vencimiento y se utilizan mediante cookies HttpOnly. Cualquier usuario autenticado puede crear planes; únicamente el propietario administra los suyos.

## Tecnologías

| Parte | Herramientas |
|---|---|
| Interfaz | Next.js 16, React 19, TypeScript y CSS Modules |
| API | Node.js 22 y Express 5 |
| Validación | Zod |
| Base de datos | PostgreSQL 17 |
| Persistencia | Prisma ORM 7 y migraciones versionadas |
| Entorno local | Docker Compose |
| Verificación | TypeScript, ESLint y pruebas HTTP con `node:test` |

Tailwind CSS y Motion están instalados; las pantallas actuales utilizan principalmente CSS Modules. Los lockfiles fijan las versiones resueltas de las dependencias.

## Arquitectura MVC

```mermaid
flowchart LR
    V["Vista: Next.js / React"] -->|Petición JSON| R["Rutas de Express"]
    R --> A["Middleware: sesión y rol"]
    A --> C["Controladores"]
    C --> M["Datos y validaciones / Prisma"]
    M --> DB[(PostgreSQL)]
    C -->|Respuesta JSON| V
```

- **Modelo:** entidades, relaciones y restricciones del backend. Prisma implementa el acceso a PostgreSQL; no constituye por sí solo toda la capa Modelo.
- **Vista:** páginas y componentes de Next.js.
- **Controlador:** funciones de Express que reciben peticiones, validan los datos, consultan Prisma y construyen respuestas.

Los controladores validan entradas y traducen resultados a HTTP. Los servicios de reservas y salas concentran las reglas transaccionales. `atomic` encapsula el aislamiento Serializable y los reintentos acotados ante conflictos de PostgreSQL; evita sobreventa y protege el cierre de votaciones. Prisma implementa el acceso a datos. Las vistas consumen la API JSON. Se usa el patrón Service Layer para separar estos flujos del transporte, sin añadir repositorios que solo repitan las llamadas del ORM.

```text
plot/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Usuarios, sesiones y experiencias
│   │   └── migrations/           # Cambios versionados de PostgreSQL
│   ├── src/
│   │   ├── routes/               # URL y método → controlador
│   │   ├── controllers/          # Autenticación, CRUD y comunidad
│   │   ├── services/             # Reservas, salas y transacciones
│   │   ├── middleware/auth.ts    # Sesión y permisos
│   │   ├── security/password.ts  # Hash de contraseñas
│   │   ├── validations.ts        # Validación de entradas
│   │   ├── db.ts                 # Cliente Prisma
│   │   ├── app.ts                # Configuración de Express y errores
│   │   └── server.ts             # Inicio del servidor
│   └── tests/api.test.ts         # Pruebas funcionales de la API
├── frontend/
│   └── src/
│       ├── app/                  # Login, registro y experiencias
│       ├── components/           # Formularios, tabla y estilos
│       └── lib/api.ts            # Peticiones a Express
├── compose.yaml                  # PostgreSQL local y volumen persistente
└── README.md
```

## Instalación y ejecución

### Requisitos

- Git.
- Node.js **22.23.1**, versión utilizada en desarrollo, y npm.
- Docker en ejecución y Docker Compose v2. En macOS puede utilizarse Docker Desktop o Colima.
- Puertos locales 3000, 4000 y 5433 disponibles.

Los comandos siguientes usan `docker compose`. Si tu instalación proporciona `docker-compose`, utiliza ese comando equivalente. Los atajos `npm run db:up` y `npm run db:stop` de este repositorio usan `docker-compose`.

### 1. Clonar el repositorio

```sh
git clone https://github.com/tatifonseca06/plot.git
cd plot
```

Si utilizas nvm, puedes seleccionar la versión indicada con `nvm use`.

### 2. Preparar la configuración local

```sh
cp backend/.env.example backend/.env
```

Editar `backend/.env`. Reemplazar la contraseña de ejemplo **en ambos lugares** por la misma contraseña local; usar caracteres alfanuméricos facilita escribir la URL:

```dotenv
PORT=4000
FRONTEND_URL=http://localhost:3000
POSTGRES_PASSWORD=replace-with-a-local-password
DATABASE_URL=postgresql://plot:replace-with-a-local-password@localhost:5433/plot
NODE_ENV=development
```

Los valores anteriores son marcadores de ejemplo, no credenciales del proyecto. `.env` y `.env.test` están excluidos de Git. En Windows puede copiarse el archivo con el explorador o `Copy-Item` en PowerShell.

`frontend/.env.example` documenta la variable opcional `API_URL`. Su valor predeterminado, `http://localhost:4000`, funciona para esta instalación local.

### 3. Instalar dependencias y preparar PostgreSQL

```sh
npm --prefix backend ci
npm --prefix frontend ci
docker compose up -d --wait db
npm --prefix backend run db:deploy
npm --prefix backend run generate
```

`db:deploy` aplica las migraciones existentes. `generate` genera el cliente Prisma. PostgreSQL guarda los datos en un volumen Docker exclusivo de Plot.

### 4. Ejecutar la aplicación

Desde la raíz del repositorio, abrir dos terminales.

Terminal 1:

```sh
npm run dev:backend
```

Terminal 2:

```sh
npm run dev:frontend
```

Abrir **http://localhost:3000**. La API escucha en **http://localhost:4000** y PostgreSQL se expone localmente en el puerto **5433**.

Next.js reenvía `/api/*` a Express; el navegador utiliza un solo origen. El backend conserva la validación, los permisos y el acceso a la base.

Para detener los servidores, pulsar `Ctrl+C` en sus terminales. Para detener la base conservando los datos:

```sh
docker compose stop db
```

## Cómo probar la aplicación

1. Abrir `/registro` y crear una cuenta.
2. Iniciar sesión con el correo y la contraseña registrados.
3. Pulsar **Crear un plan**, completar los tres pasos y compartir la invitación.
4. Recargar para comprobar la persistencia.
5. Editar la experiencia y comprobar sus cambios.
6. Eliminarla mediante la confirmación.
7. Cerrar sesión e intentar entrar a `/experiencias` nuevamente.

No existen cuentas preinsertadas ni contraseñas públicas de demostración.

La página consulta la sesión y redirige al login cuando no es válida. Independientemente de esa redirección en el navegador, **todos los endpoints del CRUD comprueban la sesión en Express** y rechazan el acceso sin autenticación con HTTP 401. Un recurso privado ajeno responde 404.

## API

| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/auth/register` | Crear una cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Consultar el usuario autenticado |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/experiences` | Listar todas las experiencias propias |
| GET | `/api/experiences/:id` | Consultar una experiencia propia |
| POST | `/api/experiences` | Crear una experiencia |
| PUT | `/api/experiences/:id` | Actualizar una experiencia propia |
| DELETE | `/api/experiences/:id` | Eliminar una experiencia propia |
| GET | `/api/health` | Comprobar que el servidor HTTP responde |

Ejemplo del cuerpo para crear o actualizar una experiencia:

```json
{
  "title": "Ruta de cafés",
  "category": "Gastronomía",
  "subcategoryId": "10000000-0000-4000-8000-000000000004",
  "description": "Una tarde para descubrir cafeterías locales."
}
```

El catálogo inicial incluye `Cultura`, `Gastronomía` y `Aventura`, con tres subcategorías cada una. `GET /api/categories` devuelve las categorías y sus subcategorías desde PostgreSQL y requiere sesión. Al cambiar de categoría se limpia la subcategoría seleccionada; el backend y una clave foránea compuesta impiden guardar combinaciones incorrectas. Las experiencias anteriores se conservan sin subcategoría hasta su próxima edición, cuando debe seleccionarse una. El propietario se obtiene de la sesión, no del cuerpo de la petición.

Las respuestas correctas usan `{ "data": ... }` y los errores `{ "error": { "code": "...", "message": "..." } }`. El borrado y el logout responden 204 sin cuerpo. Para probar escrituras desde Postman o curl, enviar `Origin: http://localhost:3000` y conservar la cookie del login para las rutas protegidas.

## Pruebas

Comprobar tipos, estilo y compilación:

```sh
npm run check
npm run build
```

Las pruebas funcionales utilizan una base independiente llamada **plot_test**. Para prepararla por primera vez, con el contenedor encendido:

```sh
docker compose exec -T db psql -U plot -d postgres -c "CREATE DATABASE plot_test;"
cp backend/.env backend/.env.test
```

Editar `backend/.env.test`: cambiar el nombre de base al final de `DATABASE_URL` de `/plot` a `/plot_test` y establecer `NODE_ENV=test`. Mantener el mismo usuario y contraseña locales.

```sh
npm --prefix backend run db:deploy:test
npm --prefix backend test
```

El comando de creación de base solo se ejecuta una vez. Las pruebas se niegan a utilizar otra base y limpian únicamente sus propios usuarios y registros.

**Resultado comprobado:** 40 pruebas correctas (36 subcasos y 4 casos padre). `plans.test.ts` comprueba creación inmediata, privacidad, invitaciones, votación, confirmación y edición de planes entre amigos. `api.test.ts` cubre autenticación, CRUD, roles y persistencia. `community.test.ts` cubre el flujo final: privacidad de borradores y salas, moderación, fechas, votos únicos, reservas simultáneas, cancelaciones, asistencia, misiones y reseñas. Se ejecutan contra PostgreSQL real en `plot_test`, con limpieza de los registros creados por cada prueba.

No se presenta esta comprobación HTTP como una prueba visual automatizada en navegador.

## Solución de problemas

| Situación | Qué revisar |
|---|---|
| Docker no responde | Iniciar Docker Desktop o ejecutar `colima start` si se utiliza Colima. |
| El backend no conecta a PostgreSQL | Ejecutar `docker compose ps` y revisar `DATABASE_URL`, contraseña y puerto 5433. |
| La interfaz muestra error de conexión | Comprobar que Express esté funcionando en el puerto 4000. |
| Una escritura devuelve 403 por origen | Abrir exactamente `http://localhost:3000` o ajustar `FRONTEND_URL` al origen utilizado. |
| No aparece Crear un plan | Iniciar sesión y abrir `/experiencias`. Cualquier cuenta puede crear. |
| Aparece 429 al iniciar sesión | El límite es de veinte solicitudes de login/registro por IP cada quince minutos; esperar antes de reintentar. |
| Cambiar la contraseña del `.env` no cambia la de PostgreSQL | La contraseña inicial solo configura un volumen nuevo; no modifica automáticamente un volumen ya creado. |

## Despliegue

**Aplicación:** https://plot-sable-kappa.vercel.app

Next.js y Express se alojan en un proyecto de Vercel mediante los servicios definidos en `vercel.json`. Las rutas `/api/*` llegan a Express; las demás llegan al frontend. PostgreSQL se aloja en Neon y es independiente de la base local de Docker.

El proyecto de Vercel está conectado al repositorio de GitHub. La configuración utiliza Node.js 22 y requiere estas variables en producción:

- `DATABASE_URL`: conexión PostgreSQL proporcionada por Neon.
- `FRONTEND_URL`: `https://plot-sable-kappa.vercel.app`.
- `NODE_ENV`: `production`.

Vercel aplica las migraciones en producción con `backend/scripts/vercel-build.mjs`, usando la conexión protegida del entorno. Una migración fallida detiene la publicación. Para aplicarlas manualmente se usa `npm --prefix backend run db:deploy`, con la conexión del entorno correspondiente. No se deben ejecutar las pruebas locales de `plot_test` contra producción.

Se verificaron por HTTP las páginas, registro, login, cookies seguras, CRUD de organizador y administrador, permisos, rechazo de orígenes ajenos y cierre de sesión. Las cuentas y experiencias temporales de comprobación se eliminaron al finalizar.

## Alcance y documentación

Los módulos finales están implementados. Consulta [la guía de entrega y demostración](ENTREGA_FINAL.md) para los recorridos, permisos, decisiones de alcance y publicación.

- Catálogo público con búsqueda, categorías, paginación, fechas y reseñas.
- Moderación de publicaciones y reseñas por administrador.
- Sesiones de experiencias (fechas) con inicio, fin, lugar, cupos, cancelación y finalización.
- Salas privadas con invitación por código, propuestas, un voto por miembro y elección del plan ganador.
- Reservas individuales persistentes, sin duplicados ni sobreventa, con cancelación antes del inicio.
- Asistencia confirmada por el organizador, misiones con puntos y reseñas verificadas.

Las reservas no procesan pagos. La votación no reserva automáticamente al grupo. Los puntos de misiones no son canjeables. La revisión visual en navegador sigue pendiente porque no había un navegador conectado durante la implementación.

- [Notas del backend](backend/README.md).
- [Notas del frontend](frontend/README.md).

## Autoría

Proyecto académico desarrollado para Ingeniería Web por:

- [Tatiana Fonseca](https://github.com/tatifonseca06).
- Josue Chiriboga.
