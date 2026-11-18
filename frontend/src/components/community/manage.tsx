"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useResource, ActionButton, ActionForm, send } from "./shared";
import { date, labels, type Experience, type Room } from "./types";
import StudioShell, { s, useActor } from "../studio/shell";
import { Icon, Cover, type IconName } from "../studio/icons";

const sections: { id: string; label: string; icon: IconName }[] = [
  { id: "overview", label: "Vista general", icon: "grid" },
  { id: "dates", label: "Fechas y cupos", icon: "calendar" },
  { id: "reservations", label: "Quiénes van", icon: "ticket" },
  { id: "missions", label: "Misiones", icon: "spark" },
  { id: "rooms", label: "Grupo e invitación", icon: "users" },
];
function ManageContent({ id }: { id: string }) {
  const result = useResource<Experience>(`/manage/${id}`);
  const [section, setSection] = useState("overview");
  const [dateFilter, setDateFilter] = useState("");
  const [missionFormOpen, setMissionFormOpen] = useState(false);
  const actor = useActor();
  const router = useRouter();
  const e = result.data;
  if (result.loading && !e)
    return (
      <p className={s.loading} role="status">
        Preparando tu experiencia…
      </p>
    );
  if (!e)
    return (
      <div className={s.error} role="alert">
        {result.error || "No encontramos la experiencia."}
        <button className={s.textButton} onClick={result.refresh}>
          Reintentar
        </button>
      </div>
    );
  const upcoming = e.occurrences.filter(
    (o) => o.status === "SCHEDULED" && new Date(o.startsAt) > new Date(),
  );
  const confirmed = e.occurrences
    .flatMap((o) => o.reservations ?? [])
    .filter((r) => r.status === "CONFIRMED");
  const rooms = [
    ...new Map(
      e.occurrences.flatMap((o) =>
        (o.proposals ?? []).map((p) => [p.room.id, p.room] as const),
      ),
    ).values(),
  ];
  const editable = actor.id === e.ownerId;
  const editableMissions = e.status !== "ARCHIVED";
  const nextDate = upcoming[0];
  const canSubmit = ["DRAFT", "REJECTED", "ARCHIVED"].includes(e.status);
  const selectedDates = e.occurrences.filter(
    (o) => !dateFilter || o.id === dateFilter,
  );
  return (
    <>
      <Link
        className={s.back}
        href={actor.role === "ADMIN" ? "/admin" : "/experiencias"}
      >
        <Icon name="arrow" size={16} />
        {actor.role === "ADMIN" ? "Administración" : "Mis planes"}
      </Link>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>TU PLAN, BIEN ORGANIZADO</p>
          <h1>{e.title}</h1>
          <p>Prepara cada detalle y acompaña a tu grupo de principio a fin.</p>
        </div>
        <div className={s.actions}>
          {editable && (
            <Link className={s.secondary} href={`/experiencias/${id}/editar`}>
              <Icon name="edit" size={16} />
              Editar experiencia
            </Link>
          )}
          {e.status === "PUBLISHED" && (
            <Link className={s.primary} href={`/catalogo/${id}`}>
              <Icon name="eye" size={16} />
              Ver publicación
            </Link>
          )}
        </div>
      </div>
      {result.error && (
        <p className={s.error} role="alert">
          {result.error}
        </p>
      )}
      {e.moderationNote && (
        <div className={s.notice} style={{ marginBottom: 24 }}>
          <strong>Comentario de moderación</strong>
          <p>{e.moderationNote}</p>
        </div>
      )}
      <div className={s.manageIntro}>
        <Cover compact theme={e.coverTheme} category={e.category} />
        <div>
          <span className={s.badge} data-status={e.status}>
            {labels[e.status]}
          </span>
          <h2>
            {e.subcategory?.name ?? e.category}
            {e.city ? ` · ${e.city}` : ""}
          </h2>
          <p>{e.description}</p>
          <div className={s.actions}>
            <span className={s.muted}>
              {nextDate
                ? `Próximo encuentro: ${date(nextDate.startsAt)}`
                : "Todavía no hay una fecha próxima programada."}
            </span>
          </div>
        </div>
      </div>
      <section className={s.stats} aria-label="Resumen del plan">
        {[
          {
            value: upcoming.length,
            title: "Fechas próximas",
            icon: "calendar" as const,
          },
          {
            value: confirmed.length,
            title: "Reservas confirmadas",
            icon: "ticket" as const,
          },
          {
            value: confirmed.filter((r) => r.attended).length,
            title: "Asistencias",
            icon: "check" as const,
          },
          {
            value: e.missions.length,
            title: "Misiones",
            icon: "spark" as const,
          },
        ].map((stat) => (
          <div key={stat.title} className={s.stat}>
            <span>
              <Icon name={stat.icon} />
            </span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.title}</small>
            </div>
          </div>
        ))}
      </section>
      <div
        className={s.tabs}
        role="group"
        aria-label="Secciones de la experiencia"
      >
        {sections.map((tab) => (
          <button
            key={tab.id}
            aria-pressed={section === tab.id}
            onClick={() => setSection(tab.id)}
          >
            <Icon name={tab.icon} size={17} />
            {tab.label}
          </button>
        ))}
      </div>
      {section === "overview" && (
        <div className={s.manageColumns}>
          <div className={s.stack}>
            <section className={s.panel}>
              <div className={s.panelHead}>
                <span>
                  <Icon name="compass" />
                </span>
                <div>
                  <h2>Así se vive la experiencia</h2>
                  <p>Lo que conocerán tus participantes antes de reservar.</p>
                </div>
              </div>
              {e.itinerary ? (
                <p className={s.preline}>{e.itinerary}</p>
              ) : (
                <p className={s.muted}>
                  Agrega un itinerario desde Editar experiencia para contar cómo
                  será el encuentro.
                </p>
              )}
              <div className={s.row}>
                <h3>Qué incluye</h3>
                <p className={s.preline}>
                  {e.included || "No especificado todavía."}
                </p>
              </div>
              <div className={s.row}>
                <h3>Qué llevar y recomendaciones</h3>
                <p className={s.preline}>
                  {e.requirements || "No hay recomendaciones adicionales."}
                </p>
              </div>
            </section>
            <section className={s.panel}>
              <div className={s.panelHead}>
                <span>
                  <Icon name="calendar" />
                </span>
                <div>
                  <h2>Tu próximo encuentro</h2>
                  <p>Prepara la bienvenida a tu grupo.</p>
                </div>
              </div>
              {nextDate ? (
                <>
                  <h3>{date(nextDate.startsAt)}</h3>
                  <p className={s.muted} style={{ marginTop: 8 }}>
                    {nextDate.location}
                  </p>
                  <div className={s.occupancy}>
                    <progress
                      max={nextDate.capacity}
                      value={
                        nextDate.reservations?.filter(
                          (r) => r.status === "CONFIRMED",
                        ).length ?? 0
                      }
                      aria-label="Cupos reservados en la próxima fecha"
                    />
                    <small>
                      {nextDate.reservations?.filter(
                        (r) => r.status === "CONFIRMED",
                      ).length ?? 0}{" "}
                      de {nextDate.capacity} cupos reservados
                    </small>
                  </div>
                  <button
                    className={s.secondary}
                    onClick={() => setSection("reservations")}
                  >
                    Ver participantes <Icon name="arrow" size={15} />
                  </button>
                </>
              ) : (
                <>
                  <p className={s.muted}>
                    Agrega una fecha para empezar a recibir reservas cuando
                    publiques.
                  </p>
                  <button
                    className={s.secondary}
                    style={{ marginTop: 16 }}
                    onClick={() => setSection("dates")}
                  >
                    <Icon name="plus" size={16} />
                    Programar una fecha
                  </button>
                </>
              )}
            </section>
          </div>
          <div className={s.stack}>
            <section className={s.panel}>
              <div className={s.panelHead}>
                <span>
                  <Icon name="check" />
                </span>
                <div>
                  <h2>Lista para compartir</h2>
                  <p>Revisa los detalles de tu publicación.</p>
                </div>
              </div>
              <ul className={s.checklist}>
                {[
                  {
                    done: !!e.title && !!e.description,
                    title: "Información esencial",
                    text: "Título, categoría y descripción.",
                  },
                  {
                    done: !!e.city && !!e.itinerary,
                    title: "Detalles del encuentro",
                    text: "Ciudad e itinerario para tus participantes.",
                  },
                  {
                    done: upcoming.length > 0,
                    title: "Una fecha disponible",
                    text: "Lugar y cupos para reservar.",
                  },
                  {
                    done: e.missions.length > 0,
                    title: "Misiones (opcional)",
                    text: "Actividades para disfrutar el plan.",
                  },
                ].map((check) => (
                  <li key={check.title}>
                    <Icon name={check.done ? "check" : "clock"} size={18} />
                    <div>
                      <strong>{check.title}</strong>
                      {check.text}
                    </div>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 24 }}>
                {canSubmit ? (
                  <ActionButton
                    onAction={async () => {
                      await send(`/manage/${id}/submit`);
                      result.refresh();
                    }}
                  >
                    Activar plan
                  </ActionButton>
                ) : (
                  <p className={s.notice}>
                    {e.status === "PENDING"
                      ? "Tu plan está listo para activarse."
                      : "Tu experiencia está publicada. Ya puedes compartirla y recibir reservas."}
                  </p>
                )}
              </div>
            </section>
            <aside className={s.tip} style={{ margin: 0 }}>
              <Icon name="lock" size={26} />
              <div>
                <strong>¿Ya tienes un grupo?</strong>
                <p>
                  Abre tu grupo y comparte la invitación para organizarse
                  juntos.
                </p>
                <button
                  className={s.textButton}
                  onClick={() => setSection("rooms")}
                >
                  Preparar una sala →
                </button>
              </div>
            </aside>
            <details className={s.panel}>
              <summary>Opciones de la experiencia</summary>
              <p className={s.muted}>
                Solo se puede eliminar si no tiene reservas ni propuestas en
                salas. Las fechas con participantes se cancelan desde Fechas y
                cupos.
              </p>
              <div style={{ marginTop: 16 }}>
                <ActionButton
                  className={s.danger}
                  confirm={`¿Eliminar «${e.title}»? Esta acción no se puede deshacer.`}
                  onAction={async () => {
                    await send(
                      actor.role === "ADMIN"
                        ? `/admin/experiences/${id}`
                        : `/experiences/${id}`,
                      undefined,
                      "DELETE",
                    );
                    router.push(
                      actor.role === "ADMIN" ? "/admin" : "/experiencias",
                    );
                  }}
                >
                  Eliminar experiencia
                </ActionButton>
              </div>
            </details>
          </div>
        </div>
      )}
      {section === "dates" && (
        <div className={s.manageColumns}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <span>
                <Icon name="calendar" />
              </span>
              <div>
                <h2>Fechas programadas</h2>
                <p>Cada fecha tiene sus propios cupos y participantes.</p>
              </div>
            </div>
            {e.occurrences.length === 0 && (
              <p className={s.muted}>
                Aún no hay fechas. Programa la primera desde el formulario.
              </p>
            )}
            {e.occurrences.map((o) => {
              const booked =
                o.reservations?.filter((r) => r.status === "CONFIRMED")
                  .length ?? 0;
              return (
                <div key={o.id} className={s.row}>
                  <div className={s.rowHeader}>
                    <h3>{date(o.startsAt)}</h3>
                    <span className={s.badge} data-status={o.status}>
                      {labels[o.status]}
                    </span>
                  </div>
                  <p>
                    Hasta {date(o.endsAt)} · {o.location}
                  </p>
                  <div className={s.occupancy}>
                    <progress
                      max={o.capacity}
                      value={booked}
                      aria-label={`Cupos reservados para ${date(o.startsAt)}`}
                    />
                    <small>
                      {booked} / {o.capacity} cupos reservados
                    </small>
                  </div>
                  {o.status === "SCHEDULED" && (
                    <div className={s.actions}>
                      <ActionButton
                        disabled={new Date(o.endsAt) > new Date()}
                        onAction={async () => {
                          await send(
                            `/occurrences/${o.id}`,
                            { status: "COMPLETED" },
                            "PATCH",
                          );
                          result.refresh();
                        }}
                      >
                        Finalizar encuentro
                      </ActionButton>
                      <ActionButton
                        className={s.secondary}
                        confirm="¿Cancelar esta fecha y todas sus reservas?"
                        onAction={async () => {
                          await send(
                            `/occurrences/${o.id}`,
                            { status: "CANCELLED" },
                            "PATCH",
                          );
                          result.refresh();
                        }}
                      >
                        Cancelar fecha
                      </ActionButton>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <span>
                <Icon name="plus" />
              </span>
              <div>
                <h2>Agregar una fecha</h2>
                <p>Las horas corresponden a tu zona local.</p>
              </div>
            </div>
            <ActionForm
              label="Guardar fecha"
              onSave={async (data) => {
                await send(`/manage/${id}/occurrences`, {
                  startsAt: new Date(
                    String(data.get("startsAt")),
                  ).toISOString(),
                  endsAt: new Date(String(data.get("endsAt"))).toISOString(),
                  location: data.get("location"),
                  capacity: Number(data.get("capacity")),
                });
                result.refresh();
              }}
            >
              <label>
                Inicio
                <input type="datetime-local" name="startsAt" required />
              </label>
              <label>
                Fin
                <input type="datetime-local" name="endsAt" required />
              </label>
              <label>
                Punto de encuentro
                <input
                  name="location"
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="Dirección y referencia"
                />
              </label>
              <label>
                Cupos
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={500}
                  required
                  placeholder="Ej. 12"
                />
              </label>
            </ActionForm>
            <p className={s.notice}>
              Una fecha con reservas no se reprograma. Cancélala y crea una
              nueva para mantener informados a tus participantes.
            </p>
          </section>
        </div>
      )}
      {section === "reservations" && (
        <section className={s.panel}>
          <div className={s.panelHead}>
            <span>
              <Icon name="ticket" />
            </span>
            <div>
              <h2>Las personas que se suman al plan</h2>
              <p>Confirma la asistencia desde el inicio de cada encuentro.</p>
            </div>
          </div>
          <div className={s.searchRow}>
            <label className={s.field}>
              Fecha
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option value="">Todas las fechas</option>
                {e.occurrences.map((o) => (
                  <option key={o.id} value={o.id}>
                    {date(o.startsAt)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedDates.map((o) => (
            <div key={o.id} className={s.row}>
              <div className={s.rowHeader}>
                <h3>{date(o.startsAt)}</h3>
                <span className={s.badge}>
                  {o.reservations?.filter((r) => r.status === "CONFIRMED")
                    .length ?? 0}{" "}
                  reservas confirmadas
                </span>
              </div>
              <p style={{ marginBottom: 16 }}>{o.location}</p>
              {!o.reservations?.length && (
                <p>No hay reservas para esta fecha todavía.</p>
              )}
              {o.reservations?.map((r) => (
                <div className={s.attendance} key={r.id}>
                  <span className={s.avatar}>
                    {r.user?.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div>
                    <strong>{r.user?.fullName}</strong>
                    <small>
                      {labels[r.status]}
                      {r.attended ? " · Asistencia confirmada" : ""}
                    </small>
                  </div>
                  {!r.attended &&
                    r.status === "CONFIRMED" &&
                    o.status !== "CANCELLED" && (
                      <ActionButton
                        disabled={new Date(o.startsAt) > new Date()}
                        onAction={async () => {
                          await send(
                            `/reservations/${r.id}/attendance`,
                            { attended: true },
                            "PATCH",
                          );
                          result.refresh();
                        }}
                      >
                        Confirmar asistencia
                      </ActionButton>
                    )}
                  {r.attended && (
                    <span className={s.badge} data-status="CONFIRMED">
                      Asistió
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
          {!selectedDates.length && (
            <div className={s.empty}>
              <Icon name="ticket" size={32} />
              <h3>Todo empieza con una fecha</h3>
              <p>Programa un encuentro para que tu comunidad pueda reservar.</p>
              <button
                className={s.secondary}
                onClick={() => setSection("dates")}
              >
                Programar fecha
              </button>
            </div>
          )}
        </section>
      )}
      {section === "missions" && (
        <section className={`${s.panel} ${s.missionsPanel}`}>
          <div className={s.missionsHeader}>
            <div className={s.panelHead}>
              <span>
                <Icon name="spark" />
              </span>
              <div>
                <h2>Un reto para recordar el plan</h2>
                <p>
                  Las misiones son opcionales. Propón algo sencillo para
                  disfrutar juntos.
                </p>
              </div>
            </div>
            {editableMissions && (
              <button
                type="button"
                className={s.primary}
                aria-expanded={missionFormOpen}
                aria-controls="mission-form"
                onClick={() => setMissionFormOpen((open) => !open)}
              >
                <Icon name={missionFormOpen ? "chevron" : "plus"} size={16} />
                {missionFormOpen ? "Cerrar formulario" : "Agregar misión"}
              </button>
            )}
          </div>
          {missionFormOpen && editableMissions && (
            <div id="mission-form" className={s.missionComposer}>
              <div>
                <p className={s.eyebrow}>NUEVA MISIÓN</p>
                <h3>¿Qué harán juntos?</h3>
                <p className={s.muted}>
                  Por ejemplo: tomar una foto del grupo, probar algo nuevo o
                  descubrir una historia del lugar.
                </p>
              </div>
              <ActionForm
                label="Agregar al plan"
                onSave={async (data) => {
                  await send(`/manage/${id}/missions`, {
                    title: data.get("title"),
                    description: data.get("description"),
                    points: Number(data.get("points")),
                  });
                  result.refresh();
                }}
              >
                <div className={s.missionFields}>
                  <label>
                    Nombre de la misión
                    <input
                      name="title"
                      maxLength={100}
                      required
                      placeholder="Ej. Nuestra foto del encuentro"
                    />
                  </label>
                  <label>
                    Puntos
                    <input
                      name="points"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={10}
                      required
                    />
                  </label>
                </div>
                <label>
                  ¿Cómo se completa?
                  <textarea
                    name="description"
                    maxLength={500}
                    rows={3}
                    required
                    placeholder="Tomen una foto juntos en su rincón favorito del lugar."
                  />
                </label>
                <p className={s.missionHelp}>
                  Los puntos reconocen la participación. No tienen valor
                  monetario.
                </p>
              </ActionForm>
            </div>
          )}
          {e.missions.length ? (
            <div className={s.missionList}>
              <div className={s.rowHeader}>
                <h3>Misiones del plan</h3>
                <span className={s.badge}>
                  {e.missions.length}{" "}
                  {e.missions.length === 1 ? "misión" : "misiones"}
                </span>
              </div>
              {e.missions.map((m, i) => (
                <article key={m.id} className={s.missionItem}>
                  <span className={s.missionNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{m.title}</h3>
                    <p>{m.description}</p>
                  </div>
                  <span className={s.badge}>{m.points} puntos</span>
                </article>
              ))}
            </div>
          ) : (
            !missionFormOpen && (
              <div className={s.missionEmpty}>
                <span>
                  <Icon name="spark" size={28} />
                </span>
                <h3>Un buen recuerdo puede empezar con un pequeño reto</h3>
                <p>
                  Aún no hay misiones. Agrega la primera cuando tengas una idea;
                  tu plan funciona también sin ellas.
                </p>
              </div>
            )
          )}
          {!editableMissions && (
            <p className={s.notice}>
              Reactiva el plan para agregar nuevas misiones.
            </p>
          )}
        </section>
      )}
      {section === "rooms" && e.group && (
        <section className={s.panel}>
          <h2>Tu grupo ya está listo</h2>
          <p>
            Comparte la invitación, decidan los detalles y confirmen quién va
            desde el mismo lugar.
          </p>
          <Link className={s.primary} href={`/salas/${e.group.id}`}>
            Abrir el grupo e invitar →
          </Link>
        </section>
      )}
      {section === "rooms" && !e.group && (
        <div className={s.manageColumns}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <span>
                <Icon name="users" />
              </span>
              <div>
                <h2>Un espacio para tu grupo</h2>
                <p>Salas de esta experiencia en las que participas.</p>
              </div>
            </div>
            {rooms.map((room) => (
              <div className={s.row} key={room.id}>
                <div className={s.rowHeader}>
                  <h3>{room.name}</h3>
                  <span className={s.badge}>
                    {room.closed ? "Plan elegido" : "Votación abierta"}
                  </span>
                </div>
                <p>{room._count.members} integrantes</p>
                <Link
                  className={s.secondary}
                  style={{ marginTop: 16 }}
                  href={`/salas/${room.id}`}
                >
                  Entrar a la sala <Icon name="arrow" size={15} />
                </Link>
              </div>
            ))}
            {!rooms.length && (
              <div
                className={s.empty}
                style={{ border: 0, padding: "32px 12px" }}
              >
                <Icon name="lock" size={32} />
                <h3>Tu grupo merece su propio espacio</h3>
                <p>
                  Crea una sala con una fecha propuesta y comparte el código
                  para empezar a decidir juntos.
                </p>
              </div>
            )}
            <p className={s.muted} style={{ marginTop: 20 }}>
              Por privacidad, solo ves las salas de las que eres miembro. Cada
              integrante reserva su propio cupo.
            </p>
          </section>
          <section className={s.panel}>
            <h2>Crear una sala privada</h2>
            {e.status === "PUBLISHED" && upcoming.length ? (
              <ActionForm
                label="Crear sala e invitar"
                onSave={async (data) => {
                  const room = await api<Room>("/rooms", {
                    method: "POST",
                    body: JSON.stringify({
                      name: data.get("name"),
                      occurrenceId: data.get("occurrenceId"),
                    }),
                  });
                  router.push(`/salas/${room.id}`);
                }}
              >
                <label>
                  Nombre del grupo
                  <input
                    name="name"
                    maxLength={100}
                    required
                    placeholder="Ej. Los planes del sábado"
                  />
                </label>
                <label>
                  Fecha propuesta
                  <select name="occurrenceId" required>
                    <option value="">Selecciona una fecha</option>
                    {upcoming.map((o) => (
                      <option key={o.id} value={o.id}>
                        {date(o.startsAt)} · {o.location}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={s.notice}>
                  La sala nace con esta propuesta. Tus amigos podrán votar y
                  proponer otras opciones. El código se mostrará al entrar.
                </p>
              </ActionForm>
            ) : (
              <div style={{ marginTop: 20 }}>
                <p className={s.notice}>
                  Primero necesitas una experiencia publicada y una fecha futura
                  para crear una sala con este plan.
                </p>
                <button
                  className={s.textButton}
                  style={{ marginTop: 12 }}
                  onClick={() =>
                    setSection(e.status === "PUBLISHED" ? "dates" : "overview")
                  }
                >
                  {e.status === "PUBLISHED"
                    ? "Programar una fecha →"
                    : "Revisar publicación →"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
export default function Manage({ id }: { id: string }) {
  return (
    <StudioShell breadcrumb="Gestionar experiencia">
      <ManageContent id={id} />
    </StudioShell>
  );
}
