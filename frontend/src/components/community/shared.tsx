"use client";
import Link from "next/link";
import WorkspaceFrame from "../studio/frame";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { api, ApiError, errorMessage, type User } from "@/lib/api";
import styles from "./community.module.css";
export { styles };

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await api<T>(path);
        if (active) setData(result);
      } catch (e) {
        if (active) {
          setData(null);
          setError(errorMessage(e));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error, loading, refresh: () => setRevision((v) => v + 1) };
}
export function Shell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    let active = true;
    api<User>("/auth/me")
      .then((u) => {
        if (active) setUser(u);
      })
      .catch((e) => {
        if (active && !(e instanceof ApiError && e.status === 401))
          setAuthError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <WorkspaceFrame user={user} breadcrumb={eyebrow}>
      <div className={styles.page}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        {authError && <p role="alert">{authError}</p>}
        {children}
      </div>
    </WorkspaceFrame>
  );
}

export function Feedback({
  loading,
  error,
  refresh,
}: {
  loading: boolean;
  error: string;
  refresh: () => void;
}) {
  return (
    <>
      {loading && <p role="status">Cargando…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error} <button onClick={refresh}>Reintentar</button>{" "}
          <Link href="/">Iniciar sesión</Link>
        </div>
      )}
    </>
  );
}
export function ActionButton({
  onAction,
  children,
  disabled = false,
  confirm,
  className,
}: {
  onAction: () => Promise<unknown>;
  children: ReactNode;
  disabled?: boolean;
  confirm?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <span className={styles.action}>
      <button
        className={className}
        disabled={disabled || pending}
        onClick={async () => {
          if (pending || (confirm && !window.confirm(confirm))) return;
          setPending(true);
          setMessage("");
          try {
            await onAction();
          } catch (e) {
            setMessage(errorMessage(e));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Guardando…" : children}
      </button>
      {message && (
        <span role="alert" className={styles.error}>
          {message}
        </span>
      )}
    </span>
  );
}
export function ActionForm({
  onSave,
  children,
  label = "Guardar",
  reset = true,
}: {
  onSave: (data: FormData) => Promise<unknown>;
  children: ReactNode;
  label?: string;
  reset?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setError("");
    setDone(false);
    try {
      await onSave(new FormData(form));
      if (reset) form.reset();
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className={styles.form}>
      <fieldset disabled={pending}>
        {children}
        <button type="submit">{pending ? "Guardando…" : label}</button>
      </fieldset>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className={styles.success} role="status">
          Guardado correctamente.
        </p>
      )}
    </form>
  );
}
export async function send(path: string, body?: unknown, method = "POST") {
  return api(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
