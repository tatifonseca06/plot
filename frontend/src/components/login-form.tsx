"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import styles from "@/app/page.module.css";

export default function LoginForm({
  registered = false,
}: {
  registered?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      router.replace("/experiencias");
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {registered && (
        <p className={styles.notice} role="status">
          Cuenta creada correctamente. Ya puedes iniciar sesión.
        </p>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />
        </div>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>
      <p className={styles.registration}>
        ¿No tienes cuenta? <Link href="/registro">Regístrate</Link>
      </p>
      <p className={styles.feedback} role="status">
        {message}
      </p>
    </>
  );
}
