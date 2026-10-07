# Frontend de Plot

Interfaz con Next.js, React, TypeScript, Tailwind CSS y Motion.

Desde esta carpeta:

```sh
npm run dev
```

Abrir http://localhost:3000. La página muestra el login basado en la referencia de Figma. El enlace «Regístrate» abre `/registro`, con nombre, correo, contraseña y confirmación. La autenticación y el registro todavía no están conectados al backend.

- `src/app/page.tsx`: página inicial.
- `src/app/layout.tsx`: estructura compartida y metadatos.
- `src/app/globals.css`: estilos globales.
- `src/app/page.module.css`: estilos de la pantalla de login, aislados mediante CSS Modules.
- `src/components/auth-brand.tsx`: panel de marca compartido por login y registro.
- `src/components/register-form.tsx`: formulario de registro con campos obligatorios y comprobación de contraseñas coincidentes.
- `src/components/login-form.tsx`: formulario interactivo con validaciones HTML y mensajes de disponibilidad.
- `postcss.config.mjs`: integración de Tailwind.

Usamos Webpack para desarrollo y compilación porque Turbopack encontró una restricción al abrir un puerto interno en este entorno.

Consultar el [README general](../README.md) para ejecutar el backend y revisar el estado del proyecto.

## Vista previa de experiencias

`/experiencias` reproduce la página «Mis experiencias» con datos de ejemplo. Se accede desde «Explorar la demo de Plot» en el login. Crear, editar y eliminar funcionan solo en memoria de React: al recargar o abandonar la página, se restauran los ejemplos. La eliminación pide confirmación.

No hay autenticación, permisos ni persistencia en esta vista previa. «Salir de la demo» vuelve al login. La gestión real de experiencias corresponderá al organizador y requerirá permisos del backend.

Los tamaños de login y registro se ajustan según la altura de la ventana en escritorio. En ventanas pequeñas se mantiene el desplazamiento necesario para no ocultar controles.

Verificación de esta entrega: compilación de producción y ESLint. No se ha verificado visualmente ni probado la interacción en navegador en esta entrega.
