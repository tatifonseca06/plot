"use client";
import Link from "next/link";
import { useState } from "react";
import type { User } from "@/lib/api";
import {
  Shell,
  Feedback,
  useResource,
  ActionButton,
  ActionForm,
  send,
  styles,
} from "./shared";
import { type Occurrence, type Room } from "./types";
import { Icon } from "../studio/icons";
import s from "../studio/studio.module.css";
function MeetingDetails({
  occurrence,
  chosen = false,
}: {
  occurrence: Occurrence;
  chosen?: boolean;
}) {
  const start = new Date(occurrence.startsAt);
  const end = new Date(occurrence.endsAt);
  const day = start.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = (value: Date) =>
    value.toLocaleTimeString("es-EC", { hour: "numeric", minute: "2-digit" });
  const finish =
    start.toDateString() === end.toDateString()
      ? time(end)
      : `${end.toLocaleDateString("es-EC", { day: "numeric", month: "short" })}, ${time(end)}`;
  return (
    <>
      <div className={styles.proposalPlace}>
        <span className={styles.placeIcon}>
          <Icon name="pin" size={24} />
        </span>
        <div>
          <span className={styles.detailLabel}>
            {chosen ? "Lugar elegido · Nos vemos aquí" : "Lugar propuesto"}
          </span>
          <h3>{occurrence.location}</h3>
        </div>
      </div>
      <dl className={styles.proposalFacts}>
        <div>
          <Icon name="calendar" size={18} />
          <dt>Fecha</dt>
          <dd>{day}</dd>
        </div>
        <div>
          <Icon name="clock" size={18} />
          <dt>Horario</dt>
          <dd>
            {time(start)} – {finish}
          </dd>
        </div>
        <div>
          <Icon name="users" size={18} />
          <dt>Capacidad del plan</dt>
          <dd>Hasta {occurrence.capacity} personas</dd>
        </div>
      </dl>
    </>
  );
}
export default function RoomDetail({ id }: { id: string }) {
  const result = useResource<Room>(`/rooms/${id}`);
  const me = useResource<User>("/auth/me");
  const [notice, setNotice] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const r = result.data;
  const selected = r?.proposals.find((p) => p.id === r.selectedProposalId);
  const going = selected?.occurrence.reservations ?? [];
  const mine = going.some((person) => person.userId === me.data?.id);
  const available =
    selected?.occurrence.status === "SCHEDULED" &&
    new Date(selected.occurrence.startsAt) > new Date();
  const owner = r?.ownerId === me.data?.id;
  const highestVotes = Math.max(
    0,
    ...(r?.proposals
      .filter(
        (p) =>
          p.occurrence.status === "SCHEDULED" &&
          new Date(p.occurrence.startsAt) > new Date(),
      )
      .map((p) => p._count.votes) ?? []),
  );
  return (
    <Shell
      title={r?.name ?? "Tu plan"}
      eyebrow="UN PLAN, UN GRUPO, UN BUEN RECUERDO"
    >
      <Link
        className={`${styles.navigationButton} ${styles.backButton}`}
        href="/experiencias"
      >
        <Icon name="arrow" size={16} /> Mis planes
      </Link>
      <Feedback {...result} />
      {r && (
        <>
          <div className={s.nextStep}>
            <Icon name={r.closed ? "ticket" : "users"} size={28} />
            <div>
              <h2>
                {r.closed
                  ? mine
                    ? "Ya estás en la lista. Nos vemos ahí."
                    : available
                      ? "El plan está definido. ¿Te apuntas?"
                      : "Este encuentro ya terminó o se canceló"
                  : r.proposals.length
                    ? "Ahora toca elegir. Vota tu opción favorita."
                    : "El grupo está listo. Invita y propongan una opción."}
              </h2>
              <p>
                {r.closed
                  ? "Entrar al grupo no confirma asistencia. Cada persona ocupa un cupo al pulsar Me apunto."
                  : "Pueden proponer fecha y lugar, votar y elegir una opción. Después confirman quién va."}
              </p>
            </div>
            {r.closed && available && !mine && (
              <ActionButton
                onAction={async () => {
                  await send(
                    `/occurrences/${selected!.occurrence.id}/reservations`,
                  );
                  setNotice("¡Listo! Tu asistencia está confirmada.");
                  result.refresh();
                }}
              >
                Me apunto
              </ActionButton>
            )}
          </div>
          {notice && (
            <p className={styles.success} role="status">
              {notice}
            </p>
          )}
          <div className={styles.columns}>
            <div>
              <section className={styles.card}>
                <span className={styles.badge}>
                  {r.experience?.visibility === "PUBLIC"
                    ? "Plan público"
                    : "Solo con invitación"}
                </span>
                <h2 style={{ marginTop: 16 }}>La idea del plan</h2>
                <p>
                  {r.experience?.description ||
                    "Un espacio para ponerse de acuerdo y compartir un buen momento."}
                </p>
                {selected && (
                  <div className={styles.chosenMeeting}>
                    <span className={styles.chosenLabel}>
                      <Icon name="check" size={16} /> Encuentro definido
                    </span>
                    <MeetingDetails occurrence={selected.occurrence} chosen />
                    <p className={styles.meta}>
                      {going.length} de {selected.occurrence.capacity} cupos
                      confirmados
                    </p>
                  </div>
                )}
                {owner && r.experience && (
                  <div className={styles.manageAction}>
                    <Link
                      className={styles.navigationButton}
                      href={`/gestionar/${r.experience.id}`}
                    >
                      <Icon name="edit" size={18} /> Gestionar mi plan{" "}
                      <Icon name="arrow" size={16} />
                    </Link>
                    <p>Edita los detalles y gestiona asistentes y misiones.</p>
                  </div>
                )}
              </section>
              {!r.closed && (
                <section className={styles.card}>
                  <h2>¿Dónde y cuándo nos vemos?</h2>
                  <p className={styles.meta}>
                    Cada propuesta combina un lugar y una fecha. Vota por el
                    encuentro que prefieras; puedes cambiar tu voto hasta que se
                    confirme el plan.
                  </p>
                  {!r.proposals.length && (
                    <p>Aún no hay opciones. Agrega la primera abajo.</p>
                  )}
                  <div className={styles.proposalList}>
                    {r.proposals.map((p, index) => {
                      const valid =
                        p.occurrence.status === "SCHEDULED" &&
                        new Date(p.occurrence.startsAt) > new Date();
                      const leading =
                        valid &&
                        highestVotes > 0 &&
                        p._count.votes === highestVotes;
                      const voted = r.myVote === p.id;
                      return (
                        <article
                          key={p.id}
                          className={styles.proposalCard}
                          data-voted={voted}
                          aria-label={`Propuesta ${index + 1}: ${p.occurrence.location}`}
                        >
                          <div className={styles.proposalHeader}>
                            <span className={styles.proposalNumber}>
                              Propuesta {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className={styles.proposalBadges}>
                              {voted && (
                                <span className={styles.badge}>
                                  ✓ Tu elección
                                </span>
                              )}
                              <span className={styles.badge}>
                                {p._count.votes}{" "}
                                {p._count.votes === 1 ? "voto" : "votos"}
                              </span>
                              {leading && (
                                <span className={styles.leadingLabel}>
                                  Más votada
                                </span>
                              )}
                              {!valid && (
                                <span className={styles.meta}>
                                  No disponible
                                </span>
                              )}
                            </div>
                          </div>
                          {!r.experience && (
                            <p className={styles.meta}>
                              {p.occurrence.experience.title}
                            </p>
                          )}
                          <MeetingDetails occurrence={p.occurrence} />
                          <div className={styles.proposalFooter}>
                            <ActionButton
                              disabled={voted || !valid}
                              onAction={async () => {
                                await send(
                                  `/rooms/${id}/vote`,
                                  { proposalId: p.id },
                                  "PUT",
                                );
                                result.refresh();
                              }}
                            >
                              {voted
                                ? "Ya votaste por esta propuesta"
                                : "Votar por esta propuesta"}
                            </ActionButton>
                            <span className={styles.voteHint}>
                              Tu voto expresa tu preferencia; todavía no reserva
                              un cupo.
                            </span>
                          </div>
                          {owner && (
                            <div className={styles.organizerDecision}>
                              <div>
                                <strong>Como organizador</strong>
                                <p>
                                  {!valid
                                    ? "Esta opción ya no se puede confirmar."
                                    : highestVotes === 0
                                      ? "Espera el primer voto para confirmar una propuesta."
                                      : leading
                                        ? "Puedes confirmar esta propuesta para todo el grupo. Esto cierra la votación."
                                        : "Solo puedes confirmar una de las propuestas con más votos."}
                                </p>
                              </div>
                              <ActionButton
                                className={styles.outlineButton}
                                disabled={!leading}
                                confirm={`¿Confirmar el encuentro en ${p.occurrence.location} y cerrar la votación? Después, cada persona podrá apuntarse.`}
                                onAction={async () => {
                                  await send(`/rooms/${id}/close`, {
                                    proposalId: p.id,
                                  });
                                  result.refresh();
                                }}
                              >
                                Confirmar este encuentro
                              </ActionButton>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                  {r.experience ? (
                    <details open={r.proposals.length === 0}>
                      <summary className={styles.proposalToggle}>
                        Proponer fecha y lugar
                        <Icon name="chevron" size={18} />
                      </summary>
                      <ActionForm
                        label="Compartir propuesta"
                        onSave={async (data) => {
                          await send(`/rooms/${id}/options`, {
                            startsAt: new Date(
                              String(data.get("startsAt")),
                            ).toISOString(),
                            endsAt: new Date(
                              String(data.get("endsAt")),
                            ).toISOString(),
                            location: data.get("location"),
                            capacity: Number(data.get("capacity")),
                          });
                          result.refresh();
                        }}
                      >
                        <div className={s.twoFields}>
                          <label>
                            Inicio
                            <input
                              type="datetime-local"
                              name="startsAt"
                              required
                            />
                          </label>
                          <label>
                            Fin aproximado
                            <input
                              type="datetime-local"
                              name="endsAt"
                              required
                            />
                          </label>
                        </div>
                        <label>
                          Lugar y punto de encuentro
                          <input
                            name="location"
                            required
                            minLength={3}
                            maxLength={200}
                            placeholder="Ej. Café Central, Av. Amazonas 123 · entrada principal"
                          />
                        </label>
                        <label>
                          Cupos para todo el grupo
                          <input
                            type="number"
                            name="capacity"
                            min={1}
                            max={500}
                            defaultValue={12}
                            required
                          />
                        </label>
                      </ActionForm>
                    </details>
                  ) : (
                    <Link className={styles.navigationButton} href="/catalogo">
                      <Icon name="search" size={18} /> Buscar un plan para
                      proponer <Icon name="arrow" size={16} />
                    </Link>
                  )}
                </section>
              )}
              {r.closed && (
                <section className={styles.card}>
                  <h2>Quiénes van</h2>
                  {going.length ? (
                    going.map((person) => (
                      <p key={person.userId}>
                        ✓ {person.user?.fullName}
                        {person.userId === me.data?.id ? " (tú)" : ""}
                      </p>
                    ))
                  ) : (
                    <p>Aún nadie ha confirmado. Sé el primero en apuntarte.</p>
                  )}
                  <Link className={styles.navigationButton} href="/reservas">
                    <Icon name="ticket" size={18} /> Gestionar mi asistencia{" "}
                    <Icon name="arrow" size={16} />
                  </Link>
                </section>
              )}
            </div>
            <aside>
              <section className={styles.card}>
                <h2>Invita a tus amigos</h2>
                <p>
                  Comparte el enlace o el código. Tus amigos entran al mismo
                  plan.
                </p>
                <div className={styles.actions}>
                  <ActionButton
                    onAction={async () => {
                      const link = `${window.location.origin}/unirse/${r.code}`;
                      setInviteLink(link);
                      try {
                        await navigator.clipboard.writeText(link);
                        setNotice("Enlace copiado. Envíalo a tus amigos.");
                      } catch {
                        setNotice(
                          "Selecciona y copia el enlace que aparece abajo.",
                        );
                      }
                    }}
                  >
                    Copiar enlace de invitación
                  </ActionButton>
                </div>
                {inviteLink && (
                  <label className={s.field}>
                    Enlace para compartir
                    <input
                      readOnly
                      value={inviteLink}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </label>
                )}
                <p className={styles.meta}>O comparte este código:</p>
                <code className={styles.code}>{r.code}</code>
              </section>
              <section className={styles.card}>
                <h2>{r.members.length} en el grupo</h2>
                <p className={styles.meta}>
                  Estar en el grupo no significa que ya confirmó asistencia.
                </p>
                {r.members.map((member) => (
                  <p key={member.userId}>
                    {member.user.fullName}
                    {r.ownerId === member.userId ? " · Organiza" : ""}
                    {member.userId === me.data?.id ? " (tú)" : ""}
                  </p>
                ))}
                <button
                  className={styles.outlineButton}
                  disabled={result.loading}
                  onClick={result.refresh}
                  aria-busy={result.loading}
                >
                  {result.loading
                    ? "Actualizando…"
                    : r.closed
                      ? "Actualizar participantes"
                      : "Actualizar grupo y votos"}
                </button>
              </section>
            </aside>
          </div>
        </>
      )}
    </Shell>
  );
}
