import type { Metadata } from "next";
import AuthBrand from "@/components/auth-brand";
import RegisterForm from "@/components/register-form";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Crea tu cuenta | Plot",
};

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <AuthBrand />
      <section className={styles.access} aria-labelledby="register-title">
        <div className={styles.content}>
          <p className={styles.eyebrow}>Empieza a crear planes</p>
          <h2 id="register-title">Crea tu cuenta</h2>
          <p className={styles.subtitle}>Completa tus datos para comenzar.</p>
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
