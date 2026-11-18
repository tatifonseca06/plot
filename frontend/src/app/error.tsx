"use client";
import Link from "next/link";
import s from "@/components/studio/studio.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className={s.studio}>
      <section className={s.empty} role="alert">
        <h1>No pudimos abrir esta página</h1>
        <p>Comprueba tu conexión y vuelve a intentarlo.</p>
        <div className={s.actions}>
          <button className={s.primary} onClick={reset}>
            Reintentar
          </button>
          <Link className={s.secondary} href="/">
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
