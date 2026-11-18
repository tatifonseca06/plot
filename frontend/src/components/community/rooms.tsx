"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Shell, Feedback, useResource, ActionForm, styles } from "./shared";
import type { Room } from "./types";
export default function Rooms() {
  const result = useResource<{ items: Room[] }>("/rooms");
  const router = useRouter();
  return (
    <Shell
      title="Los mejores planes se deciden juntos."
      eyebrow="Invitaciones y grupos"
    >
      <Feedback {...result} />
      <div className={styles.columns}>
        <section className={styles.card}>
          <h2>¿Tienes una idea?</h2>
          <p>
            Crea un plan y tendrás su grupo listo para invitar a tus amigos.
          </p>
          <Link className={styles.link} href="/experiencias/nueva">
            Crear un plan →
          </Link>
        </section>
        <section className={styles.card}>
          <h2>¿Te invitaron?</h2>
          <ActionForm
            label="Unirme"
            onSave={async (data) => {
              const room = await api<Room>("/rooms/join", {
                method: "POST",
                body: JSON.stringify({ code: data.get("code") }),
              });
              router.push(`/salas/${room.id}`);
            }}
          >
            <label>
              Código de invitación
              <input
                name="code"
                required
                minLength={20}
                maxLength={20}
                placeholder="Pega el código de la sala"
              />
            </label>
          </ActionForm>
        </section>
      </div>
      <h2>Tus grupos</h2>
      <div className={styles.grid}>
        {result.data?.items.map((r) => (
          <article className={styles.card} key={r.id}>
            <span className={styles.badge}>
              {r.closed ? "Plan elegido" : "Votación abierta"}
            </span>
            <h2>{r.name}</h2>
            <Link className={styles.link} href={`/salas/${r.id}`}>
              Abrir el plan →
            </Link>
          </article>
        ))}
      </div>
      {result.data?.items.length === 0 && (
        <p className={styles.empty}>
          Crea un plan o únete con el código que te compartieron.
        </p>
      )}
    </Shell>
  );
}
