# Plot

<p align="center">
  <img src="frontend/public/plot-logo.png" alt="Logo de Plot: tres personas sobre un camino y el nombre de la aplicación" width="260">
</p>

**Organiza experiencias con amigos, desde la idea hasta un plan real.**

Plot es un proyecto universitario de Ingeniería Web. Esta primera entrega implementa **registro, login y un CRUD de experiencias**, con una estructura MVC sencilla, una API de Express y persistencia en PostgreSQL.

El concepto general contempla experiencias grupales; la versión actual permite a cada organizador administrar sus propias experiencias. No está desplegada todavía.

## Contenido

- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Arquitectura MVC](#arquitectura-mvc)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Cómo probar la aplicación](#cómo-probar-la-aplicación)
- [API](#api)
- [Pruebas](#pruebas)
- [Solución de problemas](#solución-de-problemas)
- [Alcance y documentación](#alcance-y-documentación)
- [Autoría](#autoría)

## Funcionalidades

- Registrar cuentas de participante u organizador.
- Iniciar sesión con correo y contraseña y cerrar sesión.
- Crear, listar, consultar, editar y eliminar experiencias propias como organizador.
- Validar título, categoría y descripción tanto en los formularios como en el backend.
- Conservar los registros en PostgreSQL después de recargar o cerrar la aplicación.
- Proteger la API con sesiones y comprobar el propietario al consultar, editar o eliminar.
- Mostrar formularios adaptables y una lista completa con desplazamiento de la página.

Las contraseñas se guardan mediante scrypt con sal aleatoria. Las sesiones tienen vencimiento y se utilizan mediante cookies HttpOnly. Los participantes pueden autenticarse, pero no acceder al CRUD reservado a organizadores.

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

En esta primera versión los controladores contienen también reglas como asignar y comprobar el propietario. No hay capas adicionales de servicios o repositorios. Las vistas están separadas y consumen la API JSON del mismo proyecto.

```text
plot/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Usuarios, sesiones y experiencias
│   │   └── migrations/           # Cambios versionados de PostgreSQL
│   ├── src/
│   │   ├── routes/               # URL y método → controlador
│   │   ├── controllers/          # Autenticación y CRUD
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

1. Abrir `/registro` y crear una cuenta de tipo **Organizador**.
2. Iniciar sesión con el correo y la contraseña registrados.
3. Pulsar **Nueva experiencia**, completar los campos y guardar.
4. Recargar para comprobar la persistencia.
5. Editar la experiencia y comprobar sus cambios.
6. Eliminarla mediante la confirmación.
7. Cerrar sesión e intentar entrar a `/experiencias` nuevamente.

No existen cuentas preinsertadas ni contraseñas públicas de demostración.

La página consulta la sesión y redirige al login cuando no es válida. Independientemente de esa redirección en el navegador, **todos los endpoints del CRUD comprueban la sesión en Express** y rechazan el acceso sin autenticación con HTTP 401. Los participantes reciben 403 y un recurso ajeno responde 404.

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
  "description": "Una tarde para descubrir cafeterías locales."
}
```

Las categorías permitidas son `Cultura`, `Gastronomía` y `Aventura`. El propietario se obtiene de la sesión, no del cuerpo de la petición.

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

**Resultado comprobado:** 15 subcasos funcionales correctos (16 pruebas contando el caso padre), incluyendo registro, login, CRUD persistente, listado completo, acceso a recursos ajenos, roles, vencimiento y cierre de sesión. También se comprobó la integración HTTP de Next.js con Express y PostgreSQL.

No se presenta esta comprobación HTTP como una prueba visual automatizada en navegador.

## Solución de problemas

| Situación | Qué revisar |
|---|---|
| Docker no responde | Iniciar Docker Desktop o ejecutar `colima start` si se utiliza Colima. |
| El backend no conecta a PostgreSQL | Ejecutar `docker compose ps` y revisar `DATABASE_URL`, contraseña y puerto 5433. |
| La interfaz muestra error de conexión | Comprobar que Express esté funcionando en el puerto 4000. |
| Una escritura devuelve 403 por origen | Abrir exactamente `http://localhost:3000` o ajustar `FRONTEND_URL` al origen utilizado. |
| No aparece Nueva experiencia | La cuenta debe ser de tipo Organizador. |
| Aparece 429 al iniciar sesión | El límite es de veinte solicitudes de login/registro por IP cada quince minutos; esperar antes de reintentar. |
| Cambiar la contraseña del `.env` no cambia la de PostgreSQL | La contraseña inicial solo configura un volumen nuevo; no modifica automáticamente un volumen ya creado. |

## Alcance y documentación

Esta entrega cubre el módulo básico de **CRUD y Login con MVC**. Quedan pendientes el catálogo público, moderación, sesiones de experiencias, salas, votaciones, reservas, misiones, reseñas y despliegue. Los patrones y mejoras SOLID de la entrega posterior no se presentan como implementados.

- [Notas del backend](backend/README.md).
- [Notas del frontend](frontend/README.md).

## Autoría

Proyecto académico desarrollado para Ingeniería Web por:

- [Tatiana Fonseca](https://github.com/tatifonseca06).
- Josue Chiriboga.
