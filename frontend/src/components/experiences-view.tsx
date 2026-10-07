"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage, type User } from "@/lib/api";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./experiences.module.css";

const categories = ["Cultura", "Gastronomía", "Aventura"] as const;
type Category = (typeof categories)[number];
type Experience = {
  id: string;
  title: string;
  category: Category;
  description: string;
};

type ExperienceList = {
  items: Experience[];
  total: number;
};

function Icon({
  name,
}: {
  name: "plus" | "edit" | "delete" | "exit" | "check";
}) {
  const paths = {
    plus: "M12 5v14M5 12h14",
    edit: "m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z",
    delete: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7",
    exit: "M14 4h6v16h-6M3 12h12M10 7l5 5-5 5",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function ExperiencesView() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [editing, setEditing] = useState<Experience | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [deleting, setDeleting] = useState<Experience | null>(null);
  const editor = useRef<HTMLDialogElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const currentUser = await api<User>("/auth/me");
        if (!active) return;
        setUser(currentUser);
        if (currentUser.role === "ORGANIZER") {
          const result = await api<ExperienceList>("/experiences");
          if (!active) return;
          setExperiences(result.items);
          setTotal(result.total);
        }
      } catch (failure) {
        if (!active) return;
        if (failure instanceof ApiError && failure.status === 401) {
          setUser(null);
          router.replace("/");
        } else setError(errorMessage(failure));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [revision, router]);

  useEffect(() => {
    if (editorVersion > 0) editor.current?.showModal();
  }, [editorVersion]);

  function reportFailure(failure: unknown, inDialog = false) {
    if (failure instanceof ApiError && failure.status === 401) {
      editor.current?.close();
      confirmation.current?.close();
      setUser(null);
      router.replace("/");
    } else if (inDialog) setDialogError(errorMessage(failure));
    else setError(errorMessage(failure));
  }

  function openEditor(experience: Experience | null) {
    setDialogError("");
    setEditing(experience);
    setEditorVersion((current) => current + 1);
  }

  async function saveExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setDialogError("");
    try {
      await api<Experience>(
        editing ? `/experiences/${editing.id}` : "/experiences",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(Object.fromEntries(data)),
        },
      );
      setMessage(
        editing
          ? "Experiencia actualizada correctamente."
          : "Experiencia creada correctamente.",
      );
      editor.current?.close();
      setRevision((current) => current + 1);
    } catch (failure) {
      reportFailure(failure, true);
    } finally {
      setPending(false);
    }
  }

  async function deleteExperience() {
    if (!deleting || pending) return;
    setPending(true);
    setDialogError("");
    try {
      await api(`/experiences/${deleting.id}`, { method: "DELETE" });
      setMessage("Experiencia eliminada correctamente.");
      confirmation.current?.close();
      setRevision((current) => current + 1);
    } catch (failure) {
      reportFailure(failure, true);
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      router.replace("/");
      router.refresh();
    } catch (failure) {
      reportFailure(failure);
    } finally {
      setPending(false);
    }
  }

  if (!user)
    return (
      <main className={styles.sessionState} aria-busy={loading}>
        <h1>Plot</h1>
        <p role="status">{error || "Comprobando tu sesión…"}</p>
        {error && (
          <button
            className={styles.secondary}
            onClick={() => setRevision((current) => current + 1)}
          >
            Reintentar
          </button>
        )}
        <Link href="/">Volver al inicio de sesión</Link>
      </main>
    );
  const canManage = user.role === "ORGANIZER";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link
          href="/experiencias"
          className={styles.logo}
          aria-label="Plot, mis experiencias"
        >
          <span className={styles.logoIcon} aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="currentColor">
              <path d="m25 7 3.5 10.5L39 21l-10.5 3.5L25 35l-3.5-10.5L11 21l10.5-3.5L25 7Zm-14 23 1.7 5.3L18 37l-5.3 1.7L11 44l-1.7-5.3L4 37l5.3-1.7L11 30Zm27-3 1.5 4.5L44 33l-4.5 1.5L38 39l-1.5-4.5L32 33l4.5-1.5L38 27Z" />
            </svg>
          </span>
          plot
        </Link>
        <button className={styles.exit} onClick={logout} disabled={pending}>
          <Icon name="exit" />
          <span>Cerrar sesión</span>
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Tu colección</p>
            <h1>Mis experiencias</h1>
            <p className={styles.subtitle}>
              Ideas simples para convertir el chat en un plan real.
            </p>
          </div>
          {canManage && (
            <button
              className={styles.primary}
              onClick={() => openEditor(null)}
              disabled={pending || loading}
            >
              <Icon name="plus" />
              Nueva experiencia
            </button>
          )}
        </div>
        {error && (
          <div className={styles.error} role="alert">
            {error}{" "}
            <button
              className={styles.secondary}
              onClick={() => setRevision((current) => current + 1)}
            >
              Reintentar
            </button>
          </div>
        )}
        {!canManage && (
          <p className={styles.notice}>
            Tienes una cuenta de participante. La creación de experiencias está
            reservada a organizadores. El catálogo para participantes llegará en
            una siguiente etapa.
          </p>
        )}
        {canManage && !error && (loading || message) && (
          <p className={styles.notice} role="status">
            {!loading && !error && (
              <span className={styles.check}>
                <Icon name="check" />
              </span>
            )}
            {loading ? "Cargando experiencias…" : message}
          </p>
        )}
        {canManage && (
          <>
            <div className={styles.collection} aria-busy={loading}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>
                    Mis experiencias guardadas en Plot
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Título</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Descripción</th>
                      <th scope="col" className={styles.actionsHeading}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading &&
                      !error &&
                      experiences.map((experience) => (
                        <tr key={experience.id}>
                          <th scope="row">{experience.title}</th>
                          <td>
                            <span
                              className={`${styles.category} ${styles[`category${categories.indexOf(experience.category)}`]}`}
                            >
                              {experience.category}
                            </span>
                          </td>
                          <td className={styles.description}>
                            {experience.description}
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                disabled={pending}
                                className={styles.secondary}
                                aria-label={`Editar ${experience.title}`}
                                onClick={() => openEditor(experience)}
                              >
                                <Icon name="edit" />
                                Editar
                              </button>
                              <button
                                disabled={pending}
                                className={styles.danger}
                                aria-label={`Eliminar ${experience.title}`}
                                onClick={() => {
                                  setDialogError("");
                                  setDeleting(experience);
                                  confirmation.current?.showModal();
                                }}
                              >
                                <Icon name="delete" />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!loading && !error && experiences.length === 0 && (
                <p className={styles.empty}>
                  Tu colección está vacía. Crea tu primera experiencia.
                </p>
              )}
              <p className={styles.count}>
                {total} {total === 1 ? "experiencia guardada" : "experiencias guardadas"}
              </p>
            </div>
          </>
        )}
      </main>

      <dialog
        ref={editor}
        className={styles.dialog}
        aria-labelledby="editor-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <form key={editorVersion} onSubmit={saveExperience}>
          <h2 id="editor-title">
            {editing ? "Editar experiencia" : "Nueva experiencia"}
          </h2>
          <p>
            Guarda los datos básicos de tu experiencia. Todavía no se publicará
            en un catálogo.
          </p>
          <label htmlFor="experience-title">Título</label>
          <input
            id="experience-title"
            name="title"
            defaultValue={editing?.title ?? ""}
            required
            maxLength={100}
            pattern={".*\\S.*"}
          />
          <label htmlFor="experience-category">Categoría</label>
          <select
            id="experience-category"
            name="category"
            defaultValue={editing?.category ?? "Cultura"}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <label htmlFor="experience-description">Descripción</label>
          <textarea
            id="experience-description"
            name="description"
            defaultValue={editing?.description ?? ""}
            required
            maxLength={500}
            rows={4}
            onInput={(event) =>
              event.currentTarget.setCustomValidity(
                event.currentTarget.value.trim()
                  ? ""
                  : "Escribe una descripción.",
              )
            }
          />
          {dialogError && (
            <p className={styles.error} role="alert">
              {dialogError}
            </p>
          )}
          <div className={styles.dialogActions}>
            <button
              disabled={pending}
              type="button"
              className={styles.secondary}
              onClick={() => editor.current?.close()}
            >
              Cancelar
            </button>
            <button disabled={pending} className={styles.primary} type="submit">
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </dialog>
      <dialog
        ref={confirmation}
        className={styles.dialog}
        aria-labelledby="delete-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <h2 id="delete-title">¿Eliminar experiencia?</h2>
        <p>
          Se eliminará «{deleting?.title}». Esta acción no se puede deshacer.
        </p>
        {dialogError && (
          <p className={styles.error} role="alert">
            {dialogError}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button
            disabled={pending}
            className={styles.secondary}
            onClick={() => confirmation.current?.close()}
          >
            Cancelar
          </button>
          <button
            disabled={pending}
            className={styles.danger}
            onClick={deleteExperience}
          >
            {pending ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
