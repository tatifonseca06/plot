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
- `GET/POST /api/experiences`: listar planes propios y del grupo / crear un borrador del editor anterior.
- `GET/PUT/DELETE /api/experiences/:id`: consultar, actualizar o eliminar una experiencia propia.
- `GET /api/health`: estado del proceso HTTP, sin consultar la base.

Para las escrituras se debe enviar `Origin: http://localhost:3000` (o el FRONTEND_URL configurado). El navegador lo envía al usar el frontend. Las operaciones protegidas requieren también la cookie de sesión.

Contrato de respuestas, MVC y pruebas: [README principal](../README.md).

Los módulos finales incorporan catálogo, fechas, reservas, salas, votaciones, misiones, asistencia y reseñas. Los servicios de reservas y salas encapsulan sus transacciones. Consulta [ENTREGA_FINAL.md](../ENTREGA_FINAL.md) para las rutas nuevas y reglas.

- `POST /api/plans`: crea inmediatamente un plan activo y su grupo; privado por defecto, sin aprobación.
- `POST /api/rooms/:id/options`: permite a miembros proponer fecha y lugar dentro de su plan.
- Los planes privados no aparecen en el catálogo y su detalle requiere pertenecer al grupo.
