# Interfaz de Plot

Next.js, React y TypeScript. Estilos de autenticación y experiencias en CSS Modules. Tailwind y Motion siguen disponibles.

```sh
npm run dev
npm run lint
npm run build
```

Express y PostgreSQL deben estar funcionando; consultar el [README principal](../README.md).

- `/`: login; abre Mis planes o recupera una invitación pendiente.
- `/registro`: crea la cuenta y vuelve al login.
- `/catalogo` y `/catalogo/[id]`: búsqueda pública, detalle, reservas y propuestas para salas.
- `/reservas`: reservas, cancelaciones, misiones, puntos y reseñas.
- `/salas` y `/salas/[id]`: invitaciones, propuestas y votaciones.
- `/gestionar/[id]`: publicación, fechas, asistentes y misiones.
- `/moderacion`: moderación administrativa de publicaciones y reseñas. No interviene en la creación de planes.
- `/experiencias/nueva`: tres pasos: idea, privacidad/fecha e invitación; el grupo se crea automáticamente.
- `/experiencias/[id]/editar`: editor que conserva las reservas y fechas existentes.
- `/experiencias`: comprueba la sesión, carga datos reales y muestra planes propios y aquellos a los que te invitaron.

`src/lib/api.ts` centraliza las peticiones a `/api`. Next.js reenvía esas rutas a Express. Los permisos se verifican siempre en el backend.

El panel presenta tarjetas, filtros, estados vacíos y acciones para crear o unirse. En móvil el contenido puede desplazarse para mantener legibles los controles. Los formularios muestran errores del servidor y bloquean botones mientras procesan la petición.

No hay datos ni credenciales ficticios. Cualquier cuenta puede crear y participar. `/unirse/[code]` conserva la invitación durante login y registro.

## Acceso a páginas

Las páginas privadas comprueban la sesión en el servidor antes de renderizar. Sin sesión válida redirigen a `/?next=...`; después del login se recupera únicamente una ruta interna conocida. `/admin` y `/moderacion` requieren ADMIN y redirigen a usuarios normales a Mis planes. Login, registro, catálogo e invitaciones siguen siendo públicos. Las rutas inexistentes devuelven 404.

`server-auth.ts` valida la cookie contra Express con `cache: no-store`. En local usa `API_URL` o localhost:4000; en Vercel usa `API_URL`, `FRONTEND_URL` o el dominio de producción del proyecto. Nunca obtiene el destino de la cabecera Host de una petición. Los endpoints mantienen sus comprobaciones independientes de sesión, propietario y rol.

Después de `npm run build` desde la raíz, `npm --prefix backend run test:pages` verifica redirecciones, sesiones caducadas, permisos y rutas públicas con Next.js y PostgreSQL de pruebas.
