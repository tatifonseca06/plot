"use client";
import Link from "next/link";
import {
  Shell,
  Feedback,
  useResource,
  ActionForm,
  send,
  styles,
} from "./shared";
import { labels, type Experience, type Review } from "./types";
export default function Moderation() {
  const experiences = useResource<{ items: Experience[] }>(
    "/admin/experiences",
  );
  const reviews = useResource<{ items: Review[] }>("/moderation/reviews");
  return (
    <Shell title="Una comunidad que se cuida." eyebrow="Moderación">
      <p>
        Revisa las publicaciones y modera reseñas con un motivo visible para su
        autor.
      </p>
      <Feedback {...experiences} />
      <h2>Publicaciones</h2>
      {experiences.data?.items
        .filter((e) => ["PENDING", "PUBLISHED"].includes(e.status))
        .map((e) => (
          <section key={e.id} className={styles.card}>
            <span className={styles.badge}>{labels[e.status]}</span>
            <h3>{e.title}</h3>
            <p>{e.description}</p>
            <p className={styles.meta}>
              {e.category} · {e.owner?.fullName}
            </p>
            <Link href={`/gestionar/${e.id}`}>Revisar fechas y misiones</Link>
            <ActionForm
              label="Guardar decisión"
              onSave={async (data) => {
                await send(
                  `/moderation/experiences/${e.id}`,
                  {
                    status: data.get("status"),
                    moderationNote: data.get("moderationNote"),
                  },
                  "PATCH",
                );
                experiences.refresh();
              }}
            >
              <label>
                Decisión
                <select name="status" required>
                  {e.status === "PENDING" ? (
                    <>
                      <option value="PUBLISHED">Aprobar y publicar</option>
                      <option value="REJECTED">Rechazar</option>
                    </>
                  ) : (
                    <option value="ARCHIVED">Retirar del catálogo</option>
                  )}
                </select>
              </label>
              <label>
                Motivo (obligatorio al rechazar o retirar)
                <textarea name="moderationNote" maxLength={500} />
              </label>
            </ActionForm>
          </section>
        ))}
      {experiences.data &&
        !experiences.data.items.some((e) =>
          ["PENDING", "PUBLISHED"].includes(e.status),
        ) && <p className={styles.empty}>No hay publicaciones para revisar.</p>}
      <h2>Reseñas</h2>
      <Feedback {...reviews} />
      {reviews.data?.items.map((r) => (
        <section className={styles.card} key={r.id}>
          <span className={styles.badge}>
            {r.hidden ? "Oculta" : "Visible"}
          </span>
          <h3>
            {r.reservation.occurrence?.experience.title} · {r.rating}/5
          </h3>
          <p>{r.comment}</p>
          <p className={styles.meta}>{r.reservation.user.fullName}</p>
          {r.moderationNote && <p>Motivo anterior: {r.moderationNote}</p>}
          <ActionForm
            label={r.hidden ? "Restaurar reseña" : "Ocultar reseña"}
            onSave={async (data) => {
              await send(
                `/moderation/reviews/${r.id}`,
                { hidden: !r.hidden, moderationNote: data.get("reason") },
                "PATCH",
              );
              reviews.refresh();
            }}
          >
            <label>
              Motivo
              <input name="reason" required minLength={3} maxLength={500} />
            </label>
          </ActionForm>
        </section>
      ))}
      {reviews.data?.items.length === 0 && (
        <p className={styles.empty}>Aún no hay reseñas.</p>
      )}
    </Shell>
  );
}
