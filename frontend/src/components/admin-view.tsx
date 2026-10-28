"use client";

import Link from "next/link";
import CategoryFields from "./category-fields";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage, type User } from "@/lib/api";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./experiences.module.css";

const categories = ["Cultura", "Gastronomía", "Aventura"] as const;
type Category = (typeof categories)[number];

type Organizer = { id: string; fullName: string; email: string };
type Experience = {
  id: string;
  title: string;
  category: Category;
  subcategoryId: string | null;
  description: string;
  ownerId: string;
  owner: { fullName: string; email: string };
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

export default function AdminView() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
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
        if (currentUser.role !== "ADMIN") {
          router.replace("/");
          return;
        }
        setUser(currentUser);
        const [expResult, orgResult] = await Promise.all([
          api<{ items: Experience[]; total: number }>("/admin/experiences"),
          api<{ items: Organizer[] }>("/admin/organizers"),
        ]);
        if (!active) return;
        setExperiences(expResult.items);
        setTotal(expResult.total);
        setOrganizers(orgResult.items);
      } catch (failure) {
        if (!active) return;
        if (failure instanceof ApiError && failure.status === 401) {
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
        editing ? `/admin/experiences/${editing.id}` : "/admin/experiences",
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
      await api(`/admin/experiences/${deleting.id}`, { method: "DELETE" });
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.logo} aria-label="Plot, administración">
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
            <p className={styles.eyebrow}>Panel de administración</p>
            <h1>Todas las experiencias</h1>
            <p className={styles.subtitle}>
              Gestiona las experiencias de todos los organizadores.
            </p>
          </div>
          <button
            className={styles.primary}
            onClick={() => openEditor(null)}
            disabled={pending || loading || organizers.length === 0}
          >
            <Icon name="plus" />
            Nueva experiencia
          </button>
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

        {organizers.length === 0 && !loading && !error && (
          <p className={styles.notice}>
            No hay organizadores registrados aún. Crea una cuenta de tipo
            Organizador para poder agregar experiencias.
          </p>
        )}

        {!error && (loading || message) && (
          <p className={styles.notice} role="status">
            {!loading && (
              <span className={styles.check}>
                <Icon name="check" />
              </span>
            )}
            {loading ? "Cargando experiencias…" : message}
          </p>
        )}

        <div className={styles.collection} aria-busy={loading}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                Todas las experiencias registradas en Plot
              </caption>
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Organizador</th>
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
                      <td>{experience.owner.fullName}</td>
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
            <p className={styles.empty}>No hay experiencias registradas aún.</p>
          )}
          <p className={styles.count}>
            {total}{" "}
            {total === 1 ? "experiencia registrada" : "experiencias registradas"}
          </p>
        </div>
      </main>

      {/* Modal crear / editar */}
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
            {editing
              ? "Modifica los datos de esta experiencia."
              : "Completa los datos y asigna un organizador."}
          </p>

          <label htmlFor="admin-title">Título</label>
          <input
            id="admin-title"
            name="title"
            defaultValue={editing?.title ?? ""}
            required
            maxLength={100}
            pattern={".*\\S.*"}
          />

          <CategoryFields
            prefix="admin"
            initialCategory={editing?.category}
            initialSubcategoryId={editing?.subcategoryId}
          />

          {/* Dropdown de organizadores — satisface el requisito de FK con select */}
          <label htmlFor="admin-owner">Organizador</label>
          <select
            id="admin-owner"
            name="ownerId"
            defaultValue={editing?.ownerId ?? ""}
            required
          >
            {!editing && <option value="">Selecciona un organizador…</option>}
            {organizers.map((org) => (
              <option key={org.id} value={org.id}>
                {org.fullName} — {org.email}
              </option>
            ))}
          </select>

          <label htmlFor="admin-description">Descripción</label>
          <textarea
            id="admin-description"
            name="description"
            defaultValue={editing?.description ?? ""}
            required
            maxLength={500}
            rows={4}
            onInput={(event) =>
              event.currentTarget.setCustomValidity(
                event.currentTarget.value.trim() ? "" : "Escribe una descripción.",
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

      {/* Diálogo de confirmación para eliminar */}
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
