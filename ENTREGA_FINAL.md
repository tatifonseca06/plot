# Plot: planes entre amigos

## Recorrido principal

1. Registrarse o iniciar sesión. Cualquier cuenta puede crear y participar.
2. En **Mis planes**, elegir **Crear un plan** o **Tengo una invitación**.
3. Crear en tres pasos: nombre e idea; privacidad y organización; resumen e invitación.
4. El plan queda activo inmediatamente, sin revisión administrativa. Es privado por defecto; puede elegirse público al crearlo.
5. Si la fecha y el lugar están definidos, el grupo confirma asistencia directamente. Si se decide juntos, los miembros proponen opciones, votan y quien organiza elige una de las más votadas.
6. Compartir el enlace `/unirse/[code]` o el código. Login y registro conservan la invitación. Entrar al grupo no reserva un cupo.
7. Cada persona pulsa **Me apunto**, incluido quien organiza. Ver quiénes van en el plan; cancelar desde **Me apunté** antes del inicio.
8. Gestionar detalles, asistencia efectiva y misiones desde el enlace del plan. Las reseñas requieren participación verificada.

## Reglas del producto

- Un plan tiene su propio grupo: no hay que crear otra sala después.
- Un plan privado no aparece en Explorar. Su detalle solo lo ve el propietario o un miembro; quien recibe un código válido puede unirse con su cuenta.
- El catálogo público permite entrar al grupo del plan. Unirse no equivale a confirmar asistencia.
- Una reserva por persona y fecha; cupos protegidos frente a peticiones simultáneas.
- Un voto por miembro, modificable hasta que se elija la opción. Solo el creador cierra la votación; en empate elige entre las más votadas.
- Cancelar la fecha elegida cancela sus reservas y reabre el grupo para decidir una nueva fecha. Las opciones canceladas no admiten votos.
- Editar no desactiva el plan y conserva sus relaciones. Cambiar el título actualiza también el nombre del grupo.
- La administración puede moderar contenido publicado; no hay aprobación previa para crear planes.
- Las salas anteriores se conservan como grupos independientes. El nuevo recorrido utiliza siempre el grupo asociado al plan.
- No hay pagos, correos automáticos, mapas ni chat. Los votos se actualizan bajo demanda. Los puntos de misiones no son canjeables.

## Entorno local

Seguir el README principal para iniciar PostgreSQL, aplicar migraciones y arrancar frontend y backend. Abrir `http://localhost:3000/experiencias`. No se crean cuentas ni planes ficticios.

## Verificación del nuevo recorrido

40 pruebas pasan contra PostgreSQL local (`plot_test`): autenticación, permisos, privacidad, concurrencia, votos, confirmaciones, cancelaciones, edición, misiones y reseñas. También pasan lint, TypeScript y compilación de producción. La revisión visual interactiva sigue pendiente porque no hay un navegador conectado en esta sesión.

## Arquitectura y consistencia

MVC sigue separando las vistas Next.js, los controladores Express y el modelo PostgreSQL/Prisma. Los servicios `reservation.service.ts` y `room.service.ts` concentran las operaciones con varias escrituras. `transaction.ts` comparte la política de transacciones y permisos de gestión.

Las reservas y las decisiones de sala utilizan aislamiento Serializable y hasta cuatro intentos. Se reconocen tanto el error Prisma P2034 como el conflicto de serialización que puede exponer directamente adapter-pg al confirmar. Las restricciones únicas refuerzan una reserva por persona/fecha, un voto por persona/sala, una propuesta por fecha/sala, una reseña por reserva y una finalización por misión/reserva. PostgreSQL también valida cupos, orden de fechas, puntuación de reseñas y puntos.

## API añadida

Todas las escrituras requieren el `Origin` configurado. El catálogo lista únicamente planes públicos. El detalle privado exige sesión y pertenecer al grupo; las demás rutas requieren sesión. Se aplica autorización de propietario, miembro o administrador dentro del servidor.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/catalog?q=&category=&page=1` | Catálogo público, 12 por página |
| GET | `/api/catalog/:id` | Detalle según privacidad, fechas, misiones y reseñas |
| GET | `/api/manage/:id` | Gestión de fechas, misiones y asistentes |
| POST | `/api/manage/:id/submit` | Activar un borrador anterior directamente |
| POST | `/api/manage/:id/occurrences` | Crear fecha |
| POST | `/api/manage/:id/missions` | Crear misión |
| PATCH | `/api/occurrences/:id` | Cancelar o finalizar fecha |
| POST | `/api/occurrences/:id/reservations` | Reservar un cupo |
| GET | `/api/reservations` | Reservas y progreso propios |
| DELETE | `/api/reservations/:id` | Cancelar reserva propia |
| PATCH | `/api/reservations/:id/attendance` | Confirmar asistencia |
| POST | `/api/reservations/:id/missions/:missionId` | Completar misión |
| POST | `/api/reservations/:id/review` | Escribir reseña |
| GET / POST | `/api/rooms` | Listar propias / crear sala |
| POST | `/api/rooms/join` | Unirse con código |
| GET | `/api/rooms/:id` | Sala privada y resultado de votos |
| POST | `/api/rooms/:id/proposals` | Proponer fecha |
| PUT | `/api/rooms/:id/vote` | Emitir o cambiar voto |
| POST | `/api/rooms/:id/close` | Elegir propuesta ganadora |
| PATCH | `/api/moderation/experiences/:id` | Aprobar, rechazar o retirar |
| GET | `/api/moderation/reviews` | Revisar reseñas |
| PATCH | `/api/moderation/reviews/:id` | Ocultar/restaurar con motivo |

## Verificar

```sh
npm run check
npm run build
npm --prefix backend run db:deploy:test
npm --prefix backend test
```

Las pruebas rechazan cualquier base cuyo nombre no sea `plot_test`. Comprueban permisos y estados, concurrencia por el último cupo, idempotencia, votos ajenos y entre salas, cancelación, moderación y participación. La compilación no sustituye la comprobación visual en navegador.

## Publicación

La compilación de producción de Vercel aplica las migraciones a Neon dentro del entorno protegido mediante `backend/scripts/vercel-build.mjs`, genera Prisma y comprueba tipos. Una migración fallida detiene el despliegue. Verificar después login y catálogo y realizar el recorrido con cuentas de prueba. No ejecutar `backend test` contra Neon ni publicar archivos `.env`.

La migración `20261118020000_friends_plans` conserva la visibilidad pública de los datos anteriores y activa los que estaban pendientes. Los borradores anteriores se activan desde su gestión, sin aprobación.



## Endpoints del recorrido entre amigos

- `POST /api/plans`: crea plan, grupo e invitación atómicamente. `schedule` es `FIXED` (requiere `firstOccurrence`) o `TOGETHER`. `visibility` es `PRIVATE` por defecto o `PUBLIC`.
- `POST /api/rooms/:id/options`: un miembro agrega una opción de fecha, lugar y cupos al plan.
