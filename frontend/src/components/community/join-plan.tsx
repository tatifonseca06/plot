"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/api";
import { api } from "@/lib/api";
import { Shell, useResource, ActionButton, styles } from "./shared";
export default function JoinPlan({ code }: { code: string }) {
  const me = useResource<User>("/auth/me");
  const router = useRouter();
  const next = encodeURIComponent(`/unirse/${code}`);
  return (
    <Shell title="Tus amigos tienen un plan contigo." eyebrow="ESTÁS INVITADO">
      <section className={styles.card} style={{ maxWidth: 600 }}>
        <h2>Entra al grupo para ver los detalles</h2>
        <p>
          Podrás proponer opciones, votar y confirmar si vas. El plan privado
          solo se muestra a quienes se unen.
        </p>
        {me.loading ? (
          <p role="status">Comprobando tu sesión…</p>
        ) : me.data ? (
          <ActionButton
            onAction={async () => {
              const room = await api<{ id: string }>("/rooms/join", {
                method: "POST",
                body: JSON.stringify({ code }),
              });
              router.replace(`/salas/${room.id}`);
            }}
          >
            Unirme al plan
          </ActionButton>
        ) : (
          <>
            <p>
              Inicia sesión o crea una cuenta. Guardaremos esta invitación para
              que puedas continuar.
            </p>
            <div className={styles.actions}>
              <Link className={styles.link} href={`/?next=${next}`}>
                Iniciar sesión y continuar
              </Link>
              <Link href={`/registro?next=${next}`}>Crear una cuenta</Link>
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}
