import type { Metadata } from "next";
import AuthBrand from "@/components/auth-brand";
import RegisterForm from "@/components/register-form";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Crea tu cuenta | Plot",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className={styles.page}>
      <AuthBrand />
      <section className={styles.access} aria-labelledby="register-title">
        <div className={styles.content}>
          <p className={styles.eyebrow}>Empieza a crear planes</p>
          <h2 id="register-title">Crea tu cuenta</h2>
          <p className={styles.subtitle}>
            Con una sola cuenta puedes crear planes y sumarte a los de tus
            amigos.
          </p>
          <RegisterForm returnTo={next} />
        </div>
      </section>
    </main>
  );
}
