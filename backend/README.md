# API Express de Plot

MVC sencillo: rutas → controladores → Prisma/PostgreSQL. Las vistas están en Next.js.

```sh
npm run dev
npm run build
npm test
```

`npm test` requiere la base aislada `plot_test` y `.env.test`. Consultar el [README principal](../README.md) para preparar el entorno.

- `POST /api/auth/register`: fullName, email, password, confirmPassword y role (PARTICIPANT u ORGANIZER).
- `POST /api/auth/login`: email y password.
- `GET /api/auth/me`: usuario autenticado.
- `POST /api/auth/logout`: cierra la sesión.
- `GET/POST /api/experiences`: listar o crear experiencias propias del organizador.
- `GET/PUT/DELETE /api/experiences/:id`: consultar, actualizar o eliminar una experiencia propia.
- `GET /api/health`: estado del proceso HTTP, sin consultar la base.

Para las escrituras se debe enviar `Origin: http://localhost:3000` (o el FRONTEND_URL configurado). El navegador lo envía al usar el frontend. Las operaciones protegidas requieren también la cookie de sesión.

Contrato de respuestas, MVC y pruebas: [docs/02-core-mvc.md](../docs/02-core-mvc.md).
