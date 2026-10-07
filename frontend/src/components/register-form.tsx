"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import styles from "@/app/page.module.css";

export default function RegisterForm() {
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmation = confirmationRef.current;

    if (confirmation && confirmation.value !== passwordRef.current?.value) {
      confirmation.setCustomValidity("Las contraseñas deben coincidir.");
      confirmation.reportValidity();
      return;
    }

    // La creación de cuentas se conectará a Express en la siguiente etapa.
    setMessage("El registro todavía no está disponible. Tus datos no se han enviado ni guardado.");
  }

  function handleInput() {
    confirmationRef.current?.setCustomValidity("");
    setMessage("");
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} onInput={handleInput}>
        <div className={styles.field}>
          <label htmlFor="full-name">Nombre completo</label>
          <input id="full-name" name="fullName" type="text" autoComplete="name" placeholder="Ej. Sofía Martínez" pattern={".*\\S.*"} title="Escribe tu nombre; no puede contener solo espacios." maxLength={120} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <input ref={passwordRef} id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" minLength={8} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password">Confirmar contraseña</label>
          <input ref={confirmationRef} id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repite tu contraseña" minLength={8} required />
        </div>
        <button className={styles.submit} type="submit">Crear cuenta</button>
      </form>
      <p className={styles.registration}>
        ¿Ya tienes cuenta? <Link href="/">Inicia sesión</Link>
      </p>
      <p className={styles.feedback} role="status">{message}</p>
    </>
  );
}
