"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./experiences.module.css";

const categories = ["Cultura", "Gastronomía", "Aventura"] as const;
type Category = (typeof categories)[number];
type Experience = { id: string; title: string; category: Category; description: string };

const examples: Experience[] = [
  { id: "1", title: "Atardecer y reto fotográfico", category: "Cultura", description: "Caminata urbana para capturar la hora dorada y compartir nuestras mejores fotos." },
  { id: "2", title: "Ruta de cafés de especialidad", category: "Gastronomía", description: "Una tarde para descubrir cafeterías independientes y conocer a sus baristas." },
  { id: "3", title: "Escapada a la laguna", category: "Aventura", description: "Senderismo suave, picnic compartido y una pausa junto al agua con amigos." },
];

function Icon({ name }: { name: "plus" | "edit" | "delete" | "exit" | "check" }) {
  const paths = {
    plus: "M12 5v14M5 12h14",
    edit: "m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z",
    delete: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7",
    exit: "M14 4h6v16h-6M3 12h12M10 7l5 5-5 5",
    check: "m5 12 4 4L19 6",
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function ExperiencesView() {
  // Datos temporales para explorar la interfaz. Se reinician al recargar.
  const [experiences, setExperiences] = useState(examples);
  const [message, setMessage] = useState("Vista previa con datos de ejemplo. Los cambios se reinician al recargar.");
  const [editing, setEditing] = useState<Experience | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [deleting, setDeleting] = useState<Experience | null>(null);
  const editor = useRef<HTMLDialogElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (editorVersion > 0) editor.current?.showModal();
  }, [editorVersion]);

  function openEditor(experience: Experience | null) {
    setEditing(experience);
    setEditorVersion(current => current + 1);
  }

  function saveExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const category = String(data.get("category")) as Category;
    if (!title || !description || !categories.includes(category)) return;
    const next = { id: editing?.id ?? crypto.randomUUID(), title, description, category };
    setExperiences(current => editing ? current.map(item => item.id === editing.id ? next : item) : [...current, next]);
    setMessage(`${editing ? "Experiencia actualizada" : "Experiencia creada"} en esta vista previa. Los cambios se reinician al recargar.`);
    editor.current?.close();
  }

  function deleteExperience() {
    if (!deleting) return;
    setExperiences(current => current.filter(item => item.id !== deleting.id));
    setMessage("Experiencia eliminada de esta vista previa. Los cambios se reinician al recargar.");
    confirmation.current?.close();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/experiencias" className={styles.logo} aria-label="Plot, mis experiencias">
          <span className={styles.logoIcon} aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="currentColor"><path d="m25 7 3.5 10.5L39 21l-10.5 3.5L25 35l-3.5-10.5L11 21l10.5-3.5L25 7Zm-14 23 1.7 5.3L18 37l-5.3 1.7L11 44l-1.7-5.3L4 37l5.3-1.7L11 30Zm27-3 1.5 4.5L44 33l-4.5 1.5L38 39l-1.5-4.5L32 33l4.5-1.5L38 27Z" /></svg>
          </span>plot
        </Link>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">SM</span>
          <div className={styles.accountText}><strong>Sofía Martínez</strong><span>Cuenta de demostración</span></div>
          <Link href="/" className={styles.exit}><Icon name="exit" /><span>Salir de la demo</span></Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.heading}>
          <div><p className={styles.eyebrow}>Tu colección</p><h1>Mis experiencias</h1><p className={styles.subtitle}>Ideas simples para convertir el chat en un plan real.</p></div>
          <button className={styles.primary} onClick={() => openEditor(null)}><Icon name="plus" />Nueva experiencia</button>
        </div>
        <p className={styles.notice} role="status"><span className={styles.check}><Icon name="check" /></span>{message}</p>
        <div className={styles.collection}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Experiencias de demostración de Plot</caption>
              <thead><tr><th scope="col">Título</th><th scope="col">Categoría</th><th scope="col">Descripción</th><th scope="col" className={styles.actionsHeading}>Acciones</th></tr></thead>
              <tbody>{experiences.map(experience => (
                <tr key={experience.id}>
                  <th scope="row">{experience.title}</th>
                  <td><span className={`${styles.category} ${styles[`category${categories.indexOf(experience.category)}`]}`}>{experience.category}</span></td>
                  <td className={styles.description}>{experience.description}</td>
                  <td><div className={styles.actions}>
                    <button className={styles.secondary} aria-label={`Editar ${experience.title}`} onClick={() => openEditor(experience)}><Icon name="edit" />Editar</button>
                    <button className={styles.danger} aria-label={`Eliminar ${experience.title}`} onClick={() => { setDeleting(experience); confirmation.current?.showModal(); }}><Icon name="delete" />Eliminar</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {experiences.length === 0 && <p className={styles.empty}>Tu colección está vacía. Crea tu primera experiencia.</p>}
          <p className={styles.count}>{experiences.length} {experiences.length === 1 ? "experiencia" : "experiencias"} en la demo</p>
        </div>
      </main>

      <dialog ref={editor} className={styles.dialog} aria-labelledby="editor-title">
        <form key={editorVersion} onSubmit={saveExperience}>
          <h2 id="editor-title">{editing ? "Editar experiencia" : "Nueva experiencia"}</h2>
          <p>Los cambios solo se conservan en esta vista previa.</p>
          <label htmlFor="experience-title">Título</label>
          <input id="experience-title" name="title" defaultValue={editing?.title ?? ""} required maxLength={100} pattern={".*\\S.*"} />
          <label htmlFor="experience-category">Categoría</label>
          <select id="experience-category" name="category" defaultValue={editing?.category ?? "Cultura"}>{categories.map(category => <option key={category}>{category}</option>)}</select>
          <label htmlFor="experience-description">Descripción</label>
          <textarea id="experience-description" name="description" defaultValue={editing?.description ?? ""} required maxLength={500} rows={4} onInput={event => event.currentTarget.setCustomValidity(event.currentTarget.value.trim() ? "" : "Escribe una descripción.")} />
          <div className={styles.dialogActions}><button type="button" className={styles.secondary} onClick={() => editor.current?.close()}>Cancelar</button><button className={styles.primary} type="submit">Guardar</button></div>
        </form>
      </dialog>
      <dialog ref={confirmation} className={styles.dialog} aria-labelledby="delete-title">
        <h2 id="delete-title">¿Eliminar experiencia?</h2>
        <p>Se quitará «{deleting?.title}» de esta vista previa.</p>
        <div className={styles.dialogActions}><button className={styles.secondary} onClick={() => confirmation.current?.close()}>Cancelar</button><button className={styles.danger} onClick={deleteExperience}>Eliminar</button></div>
      </dialog>
    </div>
  );
}
