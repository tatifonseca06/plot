# Interfaz de Plot

Next.js, React y TypeScript. Estilos de autenticación y experiencias en CSS Modules. Tailwind y Motion siguen disponibles.

```sh
npm run dev
npm run lint
npm run build
```

Express y PostgreSQL deben estar funcionando; consultar el [README principal](../README.md).

- `/`: login; abre `/experiencias` después de autenticar.
- `/registro`: crea la cuenta y vuelve al login.
- `/experiencias`: comprueba la sesión, carga datos reales y permite al organizador gestionar sus experiencias.

`src/lib/api.ts` centraliza las peticiones a `/api`. Next.js reenvía esas rutas a Express. Los permisos se verifican siempre en el backend.

Los tamaños son compactos. La tabla tiene cinco filas por página y desplazamiento interno cuando hace falta. En móvil el contenido puede desplazarse para mantener legibles los controles. Los formularios muestran errores del servidor y bloquean botones mientras procesan la petición.

No hay datos ni credenciales ficticios. El registro permite elegir participante u organizador; las cuentas de participante no pueden utilizar el CRUD de organizadores.
