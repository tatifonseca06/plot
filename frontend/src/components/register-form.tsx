"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";

export default function RegisterForm() {
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const confirmation = confirmationRef.current;

    if (confirmation && confirmation.value !== passwordRef.current?.value) {
      confirmation.setCustomValidity("Las contraseñas deben coincidir.");
      confirmation.reportValidity();
      return;
    }

    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify(Object.fromEntries(data)) });
      router.replace("/?registro=correcto");
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setPending(false); }
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
          <input ref={passwordRef} id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" minLength={8} maxLength={128} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password">Confirmar contraseña</label>
          <input ref={confirmationRef} id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repite tu contraseña" minLength={8} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="role">Tipo de cuenta</label>
          <select id="role" name="role" defaultValue="PARTICIPANT">
            <option value="PARTICIPANT">Participante — descubrir experiencias</option>
            <option value="ORGANIZER">Organizador — crear experiencias</option>
          </select>
        </div>
        <button className={styles.submit} type="submit" disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta"}</button>
      </form>
      <p className={styles.registration}>
        ¿Ya tienes cuenta? <Link href="/">Inicia sesión</Link>
      </p>
      <p className={styles.feedback} role="status">{message}</p>
    </>
  );
}
