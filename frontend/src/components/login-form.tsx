"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import styles from "@/app/page.module.css";

export default function LoginForm() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // La autenticación se conectará a Express en la siguiente etapa.
    setMessage("El inicio de sesión todavía no está disponible. Pronto podrás acceder a tu cuenta.");
  }

  return (
    <>
      <div className={styles.notice}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 11v6M12 7v1" stroke="currentColor" strokeWidth="2" />
        </svg>
        <p>Debes iniciar sesión para acceder a esta sección.</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Mínimo 8 caracteres" minLength={8} required />
        </div>
        <button className={styles.submit} type="submit">Iniciar sesión</button>
      </form>
      <p className={styles.registration}>
        ¿No tienes cuenta?{" "}
        <Link href="/registro">Regístrate</Link>
      </p>
      <p className={styles.demo}><Link href="/experiencias">Explorar la demo de Plot →</Link></p>
      <p className={styles.feedback} role="status">{message}</p>
    </>
  );
}
