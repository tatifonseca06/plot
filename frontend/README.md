# Frontend de Plot

Interfaz con Next.js, React, TypeScript, Tailwind CSS y Motion.

Desde esta carpeta:

```sh
npm run dev
```

Abrir http://localhost:3000. La página actual es provisional; el login de Figma se construirá en el siguiente paso.

- `src/app/page.tsx`: página inicial.
- `src/app/layout.tsx`: estructura compartida y metadatos.
- `src/app/globals.css`: estilos globales.
- `postcss.config.mjs`: integración de Tailwind.

Usamos Webpack para desarrollo y compilación porque Turbopack encontró una restricción al abrir un puerto interno en este entorno.

Consultar el [README general](../README.md) para ejecutar el backend y revisar el estado del proyecto.
