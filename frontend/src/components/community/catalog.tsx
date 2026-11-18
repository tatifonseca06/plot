"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Shell, Feedback, useResource, styles } from "./shared";
import { date, type Experience } from "./types";

export default function Catalog() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const result = useResource<{
    items: Experience[];
    total: number;
    pages: number;
  }>(`/catalog?page=${page}&${query}`);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPage(1);
    setQuery(
      new URLSearchParams({
        q: String(form.get("q")),
        category: String(form.get("category")),
      }).toString(),
    );
  }
  return (
    <Shell
      title="El próximo plan empieza aquí."
      eyebrow="Descubre · Conecta · Vive"
    >
      <p>
        Descubre experiencias, invita a tus amigos a una sala y decidan juntos
        qué hacer.
      </p>
      <form onSubmit={search} className={styles.filters}>
        <label>
          Buscar experiencia
          <input
            name="q"
            maxLength={100}
            placeholder="Una ruta, un café, una aventura…"
          />
        </label>
        <label>
          Categoría
          <select name="category">
            <option value="">Todas</option>
            <option>Cultura</option>
            <option>Gastronomía</option>
            <option>Aventura</option>
          </select>
        </label>
        <button>Buscar</button>
      </form>
      <Feedback {...result} />
      {result.data && (
        <>
          <p className={styles.meta}>
            {result.data.total} experiencias publicadas
          </p>
          <div className={styles.grid}>
            {result.data.items.map((e) => (
              <article className={styles.card} key={e.id}>
                <div className={styles.cover}>
                  <span aria-hidden="true">✦</span>
                  {e.category}
                </div>
                <span className={styles.badge}>
                  {e.subcategory?.name ?? e.category}
                </span>
                <h2>{e.title}</h2>
                <p>{e.description}</p>
                <p className={styles.meta}>Por {e.owner?.fullName}</p>
                <p className={styles.meta}>
                  {e.occurrences[0]
                    ? `Próxima fecha: ${date(e.occurrences[0].startsAt)}`
                    : "Próximamente nuevas fechas"}
                </p>
                <Link className={styles.link} href={`/catalogo/${e.id}`}>
                  Ver experiencia →
                </Link>
              </article>
            ))}
          </div>
          {result.data.items.length === 0 && (
            <p className={styles.empty}>
              No hay experiencias para esta búsqueda. Prueba otra categoría o
              vuelve pronto.
            </p>
          )}
          <div className={styles.actions}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>
              Página {page} de {Math.max(1, result.data.pages)}
            </span>
            <button
              disabled={page >= result.data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}
