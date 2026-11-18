"use client";
import Link from "next/link";
import { useState } from "react";
import { useResource } from "./community/shared";
import { date, type Experience } from "./community/types";
import StudioShell, { s, useActor } from "./studio/shell";
import { Icon, Cover } from "./studio/icons";
function Dashboard() {
  const actor = useActor();
  const result = useResource<{ items: Experience[] }>("/experiences");
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const plans = result.data?.items ?? [];
  const filtered = plans.filter(
    (p) =>
      (filter === "ALL" ||
        (filter === "MINE"
          ? p.ownerId === actor.id
          : p.ownerId !== actor.id)) &&
      p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>MENOS “ALGÚN DÍA”. MÁS “NOS VEMOS”.</p>
          <h1>¿Qué hacemos, {actor.fullName.split(" ")[0]}?</h1>
          <p>Crea un plan, invita a tus amigos y confirmen quién se apunta.</p>
        </div>
        <Link className={s.primary} href="/experiencias/nueva">
          <Icon name="plus" size={18} />
          Crear un plan
        </Link>
      </div>
      <div className={s.choiceGrid} style={{ marginBottom: 32 }}>
        <Link className={s.choice} href="/experiencias/nueva">
          <Icon name="spark" size={24} />
          <strong>Tengo una idea</strong>
          <small>
            Un café, una salida o lo que se les ocurra. Crea el plan y decide
            los detalles con tu grupo.
          </small>
          <span className={s.muted}>Crear plan →</span>
        </Link>
        <Link className={s.choice} href="/salas">
          <Icon name="users" size={24} />
          <strong>Me invitaron a un plan</strong>
          <small>
            Si te compartieron un código, pégalo aquí para entrar al grupo.
          </small>
          <span className={s.muted}>Usar una invitación →</span>
        </Link>
      </div>
      <div className={s.toolbar}>
        <div className={s.filters} role="group" aria-label="Filtrar planes">
          {[
            { id: "ALL", label: "Todos mis planes" },
            { id: "MINE", label: "Los que organizo" },
            { id: "INVITED", label: "Me invitaron" },
          ].map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className={s.searchRow}>
        <label className={s.search}>
          <span className={s.srOnly}>Buscar un plan</span>
          <Icon name="search" size={18} />
          <input
            placeholder="Busca un plan por su nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {result.error && (
        <p className={s.error} role="alert">
          {result.error}
          <button className={s.textButton} onClick={result.refresh}>
            Reintentar
          </button>
        </p>
      )}
      {result.loading ? (
        <p role="status" className={s.loading}>
          Buscando tus planes…
        </p>
      ) : (
        <div className={s.grid}>
          {filtered.map((p) => {
            const next = p.occurrences.find(
              (o) =>
                o.status === "SCHEDULED" && new Date(o.startsAt) > new Date(),
            );
            const destination = p.group
              ? `/salas/${p.group.id}`
              : `/gestionar/${p.id}`;
            return (
              <article className={s.experienceCard} key={p.id}>
                <div className={s.coverWrap}>
                  <Cover theme={p.coverTheme} category={p.category} />
                  <span className={s.badge}>
                    {p.visibility === "PRIVATE"
                      ? "Solo con invitación"
                      : "Público"}
                  </span>
                </div>
                <div className={s.cardContent}>
                  <h2>
                    <Link href={destination}>{p.title}</Link>
                  </h2>
                  <p className={s.cardDescription}>
                    {p.description ||
                      "El próximo encuentro empieza aquí. Entren al plan para organizarse."}
                  </p>
                  <div className={s.cardMeta}>
                    <p>
                      <Icon name="calendar" size={15} />
                      {p.group && !p.group.closed
                        ? "Elijan una fecha juntos"
                        : next
                          ? date(next.startsAt)
                          : "Ver fechas del plan"}
                    </p>
                    <p>
                      <Icon name="users" size={15} />
                      {p.group?._count?.members ?? 1} en el grupo ·{" "}
                      {p.ownerId === actor.id ? "Tú organizas" : "Te invitaron"}
                    </p>
                  </div>
                  <Link className={s.primary} href={destination}>
                    Abrir plan
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!result.loading && !result.error && !filtered.length && (
        <div className={s.empty}>
          <Icon name="users" size={40} />
          <h2>
            {plans.length
              ? "No encontramos ese plan"
              : "Tu primer plan está a una idea de distancia"}
          </h2>
          <p>
            {plans.length
              ? "Prueba otro nombre o cambia el filtro."
              : "No hace falta tener fecha ni lugar: puedes crear el grupo y decidirlo con tus amigos."}
          </p>
          <Link className={s.primary} href="/experiencias/nueva">
            Crear mi primer plan <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
      <aside className={s.tip}>
        <Icon name="compass" size={24} />
        <div>
          <strong>¿Buscas inspiración?</strong>
          <p>Descubre los planes abiertos de la comunidad y súmate a uno.</p>
        </div>
        <Link href="/catalogo">Explorar planes →</Link>
      </aside>
    </>
  );
}
export default function ExperiencesView() {
  return (
    <StudioShell>
      <Dashboard />
    </StudioShell>
  );
}
