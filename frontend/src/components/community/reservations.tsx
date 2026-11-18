"use client";
import Link from "next/link";
import {
  Shell,
  Feedback,
  useResource,
  ActionButton,
  ActionForm,
  send,
  styles,
} from "./shared";
import { date, labels, type Reservation } from "./types";
export default function Reservations() {
  const result = useResource<{ items: Reservation[] }>("/reservations");
  const points =
    result.data?.items.reduce(
      (sum, r) =>
        sum +
        r.occurrence.experience.missions
          .filter((m) => r.completions.some((c) => c.missionId === m.id))
          .reduce((n, m) => n + m.points, 0),
      0,
    ) ?? 0;
  return (
    <Shell title="Tus próximos recuerdos." eyebrow="Mis reservas">
      <p>Gestiona tus cupos, completa misiones y comparte lo que viviste.</p>
      <span className={styles.badge}>{points} puntos de misiones</span>
      <Feedback {...result} />
      {result.data?.items.length === 0 && (
        <p className={styles.empty}>
          Todavía no tienes reservas.{" "}
          <Link href="/catalogo">Explora experiencias.</Link>
        </p>
      )}
      {result.data?.items.map((r) => (
        <article className={styles.card} key={r.id}>
          <span className={styles.badge}>
            {labels[r.status]} · {labels[r.occurrence.status]}
          </span>
          <h2>{r.occurrence.experience.title}</h2>
          <p>
            {date(r.occurrence.startsAt)} — {date(r.occurrence.endsAt)}
            <br />
            {r.occurrence.location}
          </p>
          <p className={styles.meta}>Referencia: {r.id}</p>
          {r.status === "CONFIRMED" &&
            r.occurrence.status === "SCHEDULED" &&
            new Date(r.occurrence.startsAt) > new Date() && (
              <ActionButton
                confirm="¿Cancelar esta reserva y liberar tu cupo?"
                onAction={async () => {
                  await send(`/reservations/${r.id}`, undefined, "DELETE");
                  result.refresh();
                }}
              >
                Cancelar reserva
              </ActionButton>
            )}
          {r.status === "CONFIRMED" && (
            <>
              <p className={styles.meta}>
                {r.attended
                  ? "Asistencia confirmada por el organizador."
                  : "El organizador confirmará tu asistencia durante la experiencia."}
              </p>
              {r.occurrence.experience.missions.length > 0 && (
                <h3>Tus misiones</h3>
              )}
              {r.occurrence.experience.missions.map((m) => (
                <div key={m.id} className={styles.row}>
                  <strong>
                    {m.title} · {m.points} puntos
                  </strong>
                  <p>{m.description}</p>
                  {r.completions.some((c) => c.missionId === m.id) ? (
                    <span className={styles.badge}>✓ Completada</span>
                  ) : (
                    <ActionButton
                      disabled={!r.attended}
                      onAction={async () => {
                        await send(`/reservations/${r.id}/missions/${m.id}`);
                        result.refresh();
                      }}
                    >
                      Marcar como completada
                    </ActionButton>
                  )}
                </div>
              ))}
              {r.review ? (
                <p className={styles.success}>
                  Tu reseña: {r.review.rating}/5 — {r.review.comment}
                  {r.review.hidden &&
                    ` (Oculta por moderación: ${r.review.moderationNote})`}
                </p>
              ) : (
                r.attended &&
                r.occurrence.status === "COMPLETED" && (
                  <ActionForm
                    label="Publicar reseña"
                    onSave={async (data) => {
                      await send(`/reservations/${r.id}/review`, {
                        rating: Number(data.get("rating")),
                        comment: data.get("comment"),
                      });
                      result.refresh();
                    }}
                  >
                    <h3>¿Cómo estuvo el plan?</h3>
                    <label>
                      Calificación
                      <select name="rating" required>
                        <option value="">Selecciona</option>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tu experiencia
                      <textarea
                        name="comment"
                        required
                        minLength={3}
                        maxLength={1000}
                        rows={3}
                      />
                    </label>
                  </ActionForm>
                )
              )}
            </>
          )}
        </article>
      ))}
    </Shell>
  );
}
