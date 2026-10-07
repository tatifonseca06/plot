import AuthBrand from "@/components/auth-brand";
import LoginForm from "@/components/login-form";
import styles from "./page.module.css";

export default async function Home({ searchParams }: { searchParams: Promise<{ registro?: string }> }) {
  const { registro } = await searchParams;
  return (
    <main className={styles.page}>
      <AuthBrand />

      <section className={styles.access} aria-labelledby="login-title">
        <div className={styles.content}>
          <h2 id="login-title">Inicia sesión</h2>
          <p className={styles.subtitle}>Tus experiencias están esperándote.</p>
          <LoginForm registered={registro === "correcto"} />
        </div>
      </section>
    </main>
  );
}
