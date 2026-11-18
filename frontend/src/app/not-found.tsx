import Link from "next/link";
import s from "@/components/studio/studio.module.css";
export default function NotFound() {
  return (
    <main className={s.studio}>
      <section className={s.empty}>
        <p>404</p>
        <h1>Esta página no existe</h1>
        <p>Comprueba la dirección o vuelve al inicio para continuar.</p>
        <Link className={s.primary} href="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
