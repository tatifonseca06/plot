"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import CategoryFields from "../category-fields";
import { useResource } from "../community/shared";
import { date, type Experience } from "../community/types";
import StudioShell, { s, useActor } from "./shell";
import { Cover, Icon } from "./icons";

const steps = [
  "Lo esencial",
  "El plan",
  "Fecha y cupos",
  "Misiones",
  "Revisión",
];
const themes = [
  { value: "LAVENDER", name: "Lavanda", color: "#e5daf8" },
  { value: "SAGE", name: "Salvia", color: "#d5e7db" },
  { value: "PEACH", name: "Durazno", color: "#f5dfcc" },
  { value: "NIGHT", name: "Noche", color: "#39334e" },
];
function localNow() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function ExperienceForm({ experience }: { experience?: Experience }) {
  const actor = useActor();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const nextMission = useRef(0);
  const [step, setStep] = useState(0);
  const [missions, setMissions] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Record<string, string>>({
    title: experience?.title ?? "",
    description: experience?.description ?? "",
    category: experience?.category ?? "",
    city: experience?.city ?? "",
    coverTheme: experience?.coverTheme ?? "LAVENDER",
  });
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);
  function snapshot() {
    if (form.current)
      setPreview(
        Object.fromEntries(new FormData(form.current)) as Record<
          string,
          string
        >,
      );
  }
  function validate(all = false) {
    const controls = form.current?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(
      all
        ? "input,textarea,select"
        : `[data-step="${step}"] input,[data-step="${step}"] textarea,[data-step="${step}"] select`,
    );
    const invalid = Array.from(controls ?? []).find(
      (input) => !input.checkValidity(),
    );
    if (invalid) {
      const target = Number(
        invalid.closest<HTMLElement>("[data-step]")?.dataset.step ?? step,
      );
      setStep(target);
      requestAnimationFrame(() => invalid.reportValidity());
      return false;
    }
    if (!experience && (all || step === 2)) {
      const data = new FormData(form.current!);
      const starts = new Date(String(data.get("startsAt")));
      const ends = new Date(String(data.get("endsAt")));
      if (!(starts > new Date()) || !(ends > starts)) {
        setError(
          "El inicio debe ser futuro y la hora de fin debe ser posterior al inicio.",
        );
        setStep(2);
        return false;
      }
    }
    return true;
  }
  function go(target: number) {
    if (target > step && !validate()) return;
    snapshot();
    setError("");
    setStep(target);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (step !== 4) {
      go(step + 1);
      return;
    }
    if (!validate(true)) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const body: Record<string, unknown> = Object.fromEntries(
      [
        "title",
        "description",
        "category",
        "subcategoryId",
        "city",
        "itinerary",
        "included",
        "requirements",
        "coverTheme",
      ].map((key) => [key, data.get(key)]),
    );
    if (!experience) {
      body.firstOccurrence = {
        startsAt: new Date(String(data.get("startsAt"))).toISOString(),
        endsAt: new Date(String(data.get("endsAt"))).toISOString(),
        location: data.get("location"),
        capacity: Number(data.get("capacity")),
      };
      body.missions = missions.map((key) => ({
        title: data.get(`missionTitle-${key}`),
        description: data.get(`missionDescription-${key}`),
        points: Number(data.get(`missionPoints-${key}`)),
      }));
    }
    try {
      const result = await api<Experience>(
        experience ? `/experiences/${experience.id}` : "/experiences",
        { method: experience ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      setDirty(false);
      router.push(`/gestionar/${result.id}`);
    } catch (failure) {
      setError(errorMessage(failure));
      setPending(false);
    }
  }
  if (!actor)
    return (
      <div className={s.empty}>
        <h1>Creación para organizadores</h1>
        <p>
          Desde administración puedes crear experiencias y asignarlas a un
          organizador.
        </p>
        <Link className={s.primary} href="/admin">
          Ir a administración
        </Link>
      </div>
    );
  return (
    <>
      <Link
        className={s.back}
        href={experience ? `/gestionar/${experience.id}` : "/experiencias"}
        onClick={(e) => {
          if (
            dirty &&
            !window.confirm("Tienes cambios sin guardar. ¿Quieres salir?")
          )
            e.preventDefault();
        }}
      >
        <Icon name="arrow" size={16} />
        {experience ? "Volver a la experiencia" : "Mis experiencias"}
      </Link>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>DALE FORMA A TU PRÓXIMO PLAN</p>
          <h1>
            {experience ? "Edita tu plan" : "Crea algo que valga la pena vivir"}
          </h1>
          <p>
            Prepara los detalles para que tus participantes solo tengan que
            disfrutar.
          </p>
        </div>
        <span className={s.badge}>Borrador</span>
      </div>
      <ol className={s.stepper} aria-label="Pasos de creación">
        {steps.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              aria-current={step === i ? "step" : undefined}
              data-complete={step > i}
              disabled={pending || i > step + 1}
              onClick={() => go(i)}
            >
              <span>
                {step > i ? <Icon name="check" size={13} /> : `0${i + 1}`}
              </span>
              <strong>{label}</strong>
            </button>
          </li>
        ))}
      </ol>
      <div className={s.editorLayout}>
        <form
          ref={form}
          noValidate
          onSubmit={save}
          onChange={() => {
            setDirty(true);
            snapshot();
          }}
        >
          <div className={s.panel}>
            <div className={s.panelHead}>
              <span>
                <Icon
                  name={
                    (["spark", "compass", "calendar", "check", "eye"] as const)[
                      step
                    ]
                  }
                />
              </span>
              <div>
                <h2 ref={heading} tabIndex={-1}>
                  {steps[step]}
                </h2>
                <p>
                  {
                    [
                      "Empieza con una idea y dale tu estilo.",
                      "Los detalles hacen que reservar sea más fácil.",
                      "Define dónde y cuándo se van a encontrar.",
                      "Pequeños retos para hacer el plan inolvidable.",
                      "Una última mirada antes de guardar tu experiencia.",
                    ][step]
                  }
                </p>
              </div>
            </div>
            {error && (
              <div className={s.error} role="alert">
                {error}
              </div>
            )}
            <fieldset
              disabled={pending}
              style={{ border: 0, margin: 0, padding: 0 }}
            >
              <section hidden={step !== 0} data-step="0">
                <div className={s.formFields}>
                  <label>
                    Nombre de la experiencia
                    <input
                      name="title"
                      required
                      maxLength={100}
                      pattern=".*\S.*"
                      defaultValue={experience?.title}
                      placeholder="Ej. Una tarde entre cafés y buenas historias"
                    />
                    <small>
                      Un nombre claro y fácil de recordar. Máximo 100
                      caracteres.
                    </small>
                  </label>
                  <div className={s.categoryFields}>
                    <CategoryFields
                      prefix="studio-experience"
                      initialCategory={experience?.category}
                      initialSubcategoryId={experience?.subcategoryId}
                    />
                  </div>
                  <label>
                    Descripción
                    <textarea
                      name="description"
                      required={!experience}
                      maxLength={500}
                      rows={4}
                      defaultValue={experience?.description}
                      placeholder="¿Qué van a vivir? Cuenta qué hace especial esta experiencia."
                    />
                    <small>
                      {preview.description?.length ?? 0}/500 caracteres ·
                      Cuéntalo como se lo contarías a un amigo.
                    </small>
                  </label>
                  <div className={s.field}>
                    <span>Estilo de la portada</span>
                    <div className={s.swatches}>
                      {themes.map((t) => (
                        <label key={t.value}>
                          <input
                            name="coverTheme"
                            type="radio"
                            value={t.value}
                            defaultChecked={
                              (experience?.coverTheme ?? "LAVENDER") === t.value
                            }
                          />
                          <i style={{ background: t.color }} />
                          {t.name}
                        </label>
                      ))}
                    </div>
                    <small>
                      Este estilo acompañará tu experiencia en el panel.
                    </small>
                  </div>
                </div>
              </section>
              <section hidden={step !== 1} data-step="1">
                <div className={s.formFields}>
                  <label>
                    Ciudad
                    <input
                      name="city"
                      required={!experience}
                      maxLength={100}
                      defaultValue={experience?.city}
                      placeholder="Ej. Quito"
                    />
                  </label>
                  <label>
                    Así será el plan
                    <textarea
                      name="itinerary"
                      required={!experience}
                      maxLength={2000}
                      rows={5}
                      defaultValue={experience?.itinerary}
                      placeholder={
                        "Nos encontramos en el punto de inicio.\nVisitamos dos cafeterías y conocemos sus historias.\nCerramos con una conversación y una foto del grupo."
                      }
                    />
                    <small>
                      Describe las actividades en orden. Puedes escribir una por
                      línea.
                    </small>
                  </label>
                  <div className={s.twoFields}>
                    <label>
                      ¿Qué incluye?
                      <textarea
                        name="included"
                        maxLength={1000}
                        rows={4}
                        defaultValue={experience?.included}
                        placeholder="Ej. Guía durante el recorrido y materiales de la actividad."
                      />
                    </label>
                    <label>
                      ¿Qué deben llevar o saber?
                      <textarea
                        name="requirements"
                        maxLength={1000}
                        rows={4}
                        defaultValue={experience?.requirements}
                        placeholder="Ej. Zapatos cómodos, agua y llegar 10 minutos antes."
                      />
                    </label>
                  </div>
                </div>
              </section>
              <section hidden={step !== 2} data-step="2">
                <div className={s.formFields}>
                  {experience ? (
                    <div className={s.notice}>
                      <strong>
                        Tus fechas y reservas se gestionan por separado.
                      </strong>
                      <p>
                        Para proteger los cupos ya reservados, esta edición no
                        cambia fechas ni participantes.
                      </p>
                      <Link href={`/gestionar/${experience.id}`}>
                        Ver fechas y reservas →
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className={s.twoFields}>
                        <label>
                          Fecha y hora de inicio
                          <input
                            name="startsAt"
                            type="datetime-local"
                            min={localNow()}
                            required
                          />
                        </label>
                        <label>
                          Fecha y hora de fin
                          <input
                            name="endsAt"
                            type="datetime-local"
                            min={preview.startsAt || localNow()}
                            required
                          />
                        </label>
                      </div>
                      <label>
                        Punto de encuentro
                        <input
                          name="location"
                          required
                          minLength={3}
                          maxLength={200}
                          placeholder="Dirección y referencia para encontrarse"
                        />
                        <small>
                          Se mostrará a los participantes en el detalle y en su
                          reserva.
                        </small>
                      </label>
                      <label>
                        Cupos disponibles
                        <input
                          name="capacity"
                          type="number"
                          min={1}
                          max={500}
                          required
                          placeholder="Ej. 12"
                        />
                        <small>
                          Una reserva equivale a una persona. Puedes crear más
                          fechas después.
                        </small>
                      </label>
                      <div className={s.notice}>
                        <strong>Reservas claras, sin sorpresas.</strong>
                        <p>
                          Los participantes pueden cancelar antes del inicio. Si
                          cancelas la fecha, se cancelan sus reservas. Las horas
                          se guardan según tu zona horaria.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </section>
              <section hidden={step !== 3} data-step="3">
                <div className={s.formFields}>
                  {experience ? (
                    <div className={s.notice}>
                      Las misiones existentes se conservan. Puedes agregar
                      nuevas desde la gestión de tu plan.
                    </div>
                  ) : (
                    <>
                      <p className={s.muted}>
                        Las misiones son opcionales. Propón una actividad y
                        asigna puntos para que los asistentes registren su
                        progreso.
                      </p>
                      {missions.map((key, i) => (
                        <div key={key} className={s.missionRow}>
                          <div className={s.missionHeading}>
                            <span>
                              <Icon name="spark" size={17} />
                              Misión {i + 1}
                            </span>
                            <button
                              type="button"
                              className={s.textButton}
                              aria-label={`Eliminar misión ${i + 1}`}
                              onClick={() => {
                                setMissions((keys) =>
                                  keys.filter((k) => k !== key),
                                );
                                setDirty(true);
                              }}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                          <label>
                            Nombre de la misión
                            <input
                              name={`missionTitle-${key}`}
                              required
                              maxLength={100}
                              placeholder="Ej. Descubre la historia de un lugar"
                            />
                          </label>
                          <label>
                            Qué debe hacer el participante
                            <textarea
                              name={`missionDescription-${key}`}
                              required
                              maxLength={500}
                              rows={2}
                              placeholder="Describe una actividad sencilla y concreta."
                            />
                          </label>
                          <label>
                            Puntos
                            <input
                              name={`missionPoints-${key}`}
                              type="number"
                              required
                              min={1}
                              max={100}
                              defaultValue={10}
                            />
                          </label>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={s.secondary}
                        disabled={missions.length >= 10}
                        onClick={() => {
                          setMissions((keys) => [
                            ...keys,
                            nextMission.current++,
                          ]);
                          setDirty(true);
                        }}
                      >
                        <Icon name="plus" size={16} />
                        Agregar misión{" "}
                        {missions.length > 0 && `(${missions.length}/10)`}
                      </button>
                      <div className={s.notice}>
                        Las misiones se habilitan cuando confirmes la
                        asistencia. Los puntos reconocen la participación dentro
                        de Plot.
                      </div>
                    </>
                  )}
                </div>
              </section>
              <section hidden={step !== 4} data-step="4">
                <div className={s.formFields}>
                  <dl className={s.reviewList}>
                    {[
                      ["Experiencia", preview.title],
                      ["Categoría", preview.category],
                      ["Ciudad", preview.city],
                      [
                        "Primera fecha",
                        experience
                          ? "Se conservan las fechas existentes"
                          : preview.startsAt
                            ? date(preview.startsAt)
                            : "Por definir",
                      ],
                      [
                        "Punto de encuentro",
                        experience ? "Sin cambios" : preview.location,
                      ],
                      ["Cupos", experience ? "Sin cambios" : preview.capacity],
                      [
                        "Misiones",
                        experience
                          ? "Se conservan las existentes"
                          : `${missions.length} actividades`,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || "Por definir"}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className={s.notice}>
                    <strong>
                      {experience
                        ? "Los cambios se guardan en tu plan."
                        : "Guarda los detalles de tu plan."}
                    </strong>
                    <p>
                      Los cambios estarán disponibles para tu grupo al guardar.
                      No necesitas aprobación para organizar un plan.
                    </p>
                  </div>
                  <ul className={s.checklist}>
                    <li>
                      <Icon name="check" size={18} />
                      <div>
                        <strong>Reservas por persona</strong>Los cupos se
                        confirman al reservar.
                      </div>
                    </li>
                    <li>
                      <Icon name="lock" size={18} />
                      <div>
                        <strong>Salas por invitación</strong>Comparte un código
                        para reunir a tu grupo y votar.
                      </div>
                    </li>
                    <li>
                      <Icon name="spark" size={18} />
                      <div>
                        <strong>Tu comunidad, conectada</strong>Confirma
                        asistencia y habilita misiones y reseñas.
                      </div>
                    </li>
                  </ul>
                </div>
              </section>
            </fieldset>
          </div>
          <div className={s.formFooter}>
            <small>
              Paso {step + 1} de {steps.length} ·{" "}
              {dirty ? "Cambios sin guardar" : "Prepara tu experiencia"}
            </small>
            <div className={s.actions}>
              {step > 0 && (
                <button
                  className={s.secondary}
                  type="button"
                  disabled={pending}
                  onClick={() => go(step - 1)}
                >
                  Atrás
                </button>
              )}
              <button className={s.primary} type="submit" disabled={pending}>
                {pending
                  ? "Guardando experiencia…"
                  : step === 4
                    ? "Guardar experiencia"
                    : "Continuar"}
                <Icon name={step === 4 ? "check" : "arrow"} size={16} />
              </button>
            </div>
          </div>
        </form>
        <aside className={s.preview}>
          <h3>Así empieza a verse</h3>
          <article className={s.experienceCard}>
            <Cover
              category={preview.category || "Tu próximo plan"}
              theme={preview.coverTheme}
            />
            <div className={s.cardContent}>
              <span className={s.badge}>Vista previa</span>
              <h2 style={{ marginTop: 16 }}>
                {preview.title || "El nombre de tu experiencia"}
              </h2>
              <p className={s.cardDescription}>
                {preview.description ||
                  "Una buena historia empieza con una idea. Aquí aparecerá la descripción de tu plan."}
              </p>
              <div className={s.cardMeta}>
                <p>
                  <Icon name="pin" size={15} />
                  {preview.city || "Tu ciudad"}
                </p>
                <p>
                  <Icon name="calendar" size={15} />
                  {preview.startsAt
                    ? date(preview.startsAt)
                    : "Fecha por definir"}
                </p>
                <p>
                  <Icon name="users" size={15} />
                  {preview.capacity
                    ? `${preview.capacity} cupos disponibles`
                    : "Tu grupo, tu experiencia"}
                </p>
              </div>
            </div>
          </article>
          <p className={s.previewHint}>
            Un título claro y detalles completos ayudan a que más personas se
            animen a vivir tu experiencia.
          </p>
        </aside>
      </div>
    </>
  );
}
function EditLoader({ id }: { id: string }) {
  const result = useResource<Experience>(`/manage/${id}`);
  const actor = useActor();
  if (result.loading) return <p className={s.loading}>Cargando experiencia…</p>;
  if (result.error)
    return (
      <div className={s.error} role="alert">
        {result.error}
        <button className={s.textButton} onClick={result.refresh}>
          Reintentar
        </button>
      </div>
    );
  if (!result.data || result.data.ownerId !== actor.id)
    return (
      <div className={s.notice}>
        Solo el organizador propietario puede usar este editor.{" "}
        <Link href="/admin">Administrar experiencias</Link>
      </div>
    );
  return <ExperienceForm experience={result.data} />;
}
export default function Editor({ id }: { id?: string }) {
  return (
    <StudioShell breadcrumb={id ? "Editar experiencia" : "Nueva experiencia"}>
      {id ? <EditLoader id={id} /> : <ExperienceForm />}
    </StudioShell>
  );
}
