"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, errorMessage, type User } from "@/lib/api";
import {
  Shell,
  Feedback,
  useResource,
  ActionButton,
  ActionForm,
  send,
  styles,
} from "./shared";
import { date, type Experience, type Room } from "./types";

export default function Detail({ id }: { id: string }) {
  const result = useResource<Experience>(`/catalog/${id}`);
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    api<User>("/auth/me")
      .then(async (u) => {
        if (active) setUser(u);
        const r = await api<{ items: Room[] }>("/rooms");
        if (active) setRooms(r.items.filter((x) => !x.closed && !x.experience));
      })
      .catch((e) => {
        if (active && !(e instanceof ApiError && e.status === 401))
          setNotice(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const e = result.data;
  return (
    <Shell
      title={e?.title ?? "Experiencia"}
      eyebrow={e?.category ?? "Explorar"}
    >
      <Link href="/catalogo">← Todas las experiencias</Link>
      <Feedback {...result} />
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      {e && (
        <div className={styles.columns}>
          <div>
            <section className={styles.card}>
              <span className={styles.badge}>{e.subcategory?.name}</span>
              <h2>Un plan para recordar</h2>
              <p>{e.description}</p>
              {e.city && <p className={styles.meta}>Ciudad: {e.city}</p>}
              {e.itinerary && (
                <>
                  <h3>Así será el plan</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{e.itinerary}</p>
                </>
              )}
              {e.included && (
                <>
                  <h3>Qué incluye</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{e.included}</p>
                </>
              )}
              {e.requirements && (
                <>
                  <h3>Qué llevar y recomendaciones</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{e.requirements}</p>
                </>
              )}
              <p className={styles.meta}>Organiza {e.owner?.fullName}</p>
              <h3>Misiones de la experiencia</h3>
              {e.missions.length ? (
                e.missions.map((m) => (
                  <div className={styles.row} key={m.id}>
                    <strong>
                      {m.title} · {m.points} puntos
                    </strong>
                    <p>{m.description}</p>
                  </div>
                ))
              ) : (
                <p>Esta experiencia todavía no tiene misiones.</p>
              )}
            </section>
            <section className={styles.card}>
              <h2>Lo que vivieron otros</h2>
              <p>
                {e.rating
                  ? `${e.rating.toFixed(1)} / 5 · ${e.reviewCount} reseñas`
                  : "Aún no hay reseñas."}
              </p>
              {e.reviews?.map((r) => (
                <article key={r.id} className={styles.row}>
                  <strong>
                    {r.reservation.user.fullName} · {r.rating}/5
                  </strong>
                  <p>{r.comment}</p>
                </article>
              ))}
            </section>
          </div>
          <section className={styles.card}>
            {e.group?.code && (
              <>
                <h2>Únete al plan</h2>
                <p>
                  {e.group.closed
                    ? "Entra al grupo y pulsa Me apunto para confirmar tu cupo."
                    : "Entra al grupo para proponer y votar fecha y lugar."}
                </p>
                <Link className={styles.link} href={`/unirse/${e.group.code}`}>
                  Unirme al plan →
                </Link>
              </>
            )}
            {!e.group && (
              <>
                <h2>Elige tu fecha</h2>
                <p className={styles.meta}>
                  Las fechas se muestran en tu zona horaria. Cada reserva ocupa
                  un cupo.
                </p>
                {!user && (
                  <p>
                    <Link href="/">Inicia sesión</Link> o{" "}
                    <Link href="/registro">regístrate</Link> para reservar.
                  </p>
                )}
                {e.occurrences.length === 0 && (
                  <p>No hay fechas disponibles por ahora.</p>
                )}
                {e.occurrences.map((o) => (
                  <div key={o.id} className={styles.row}>
                    <h3>{date(o.startsAt)}</h3>
                    <p>
                      Hasta {date(o.endsAt)}
                      <br />
                      {o.location}
                    </p>
                    <p className={styles.meta}>
                      {o.capacity - (o._count?.reservations ?? 0)} de{" "}
                      {o.capacity} cupos disponibles
                    </p>
                    {user && (
                      <ActionButton
                        disabled={(o._count?.reservations ?? 0) >= o.capacity}
                        onAction={async () => {
                          await send(`/occurrences/${o.id}/reservations`);
                          setNotice(
                            "Tu reserva está confirmada. Puedes verla en Mis reservas.",
                          );
                          result.refresh();
                        }}
                      >
                        Reservar mi cupo
                      </ActionButton>
                    )}
                    {user && (
                      <>
                        {rooms.length ? (
                          <ActionForm
                            label="Proponer en sala"
                            onSave={async (data) => {
                              await send(
                                `/rooms/${data.get("room")}/proposals`,
                                {
                                  occurrenceId: o.id,
                                },
                              );
                              setNotice(
                                "Propuesta agregada. Abre Mis salas para votar.",
                              );
                            }}
                          >
                            <label>
                              Sala
                              <select name="room" required>
                                <option value="">Elige una sala</option>
                                {rooms.map((r) => (
                                  <option value={r.id} key={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </ActionForm>
                        ) : (
                          <p>
                            <Link href="/salas">
                              Crea una sala para decidir con amigos →
                            </Link>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <p>
                  <Link href="/reservas">Ir a mis reservas →</Link>
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </Shell>
  );
}
