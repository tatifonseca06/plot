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
