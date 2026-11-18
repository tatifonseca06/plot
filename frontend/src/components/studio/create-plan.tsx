"use client";
import Link from "next/link";
import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import StudioShell, { s } from "./shell";
import { Icon, Cover } from "./icons";
import { date } from "../community/types";
const steps = ["Tu idea", "Con quién y cuándo", "Invita a tus amigos"];
function Creator() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [schedule, setSchedule] = useState("TOGETHER");
  const [summary, setSummary] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function next() {
    const invalid = [
      ...form.current!.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        `[data-stage="${step}"] input,[data-stage="${step}"] textarea`,
      ),
    ].find((input) => !input.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    const values = Object.fromEntries(new FormData(form.current!)) as Record<
      string,
      string
    >;
    if (
      step === 1 &&
      schedule === "FIXED" &&
      (!(new Date(values.startsAt) > new Date()) ||
        !(new Date(values.endsAt) > new Date(values.startsAt)))
    ) {
      setError("Elige un inicio futuro y una hora de fin posterior.");
      return;
    }
    setError("");
    setSummary(values);
    setStep((current) => current + 1);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (step < 2) {
      next();
      return;
    }
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ roomId: string }>("/plans", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          visibility,
          schedule,
          ...(schedule === "FIXED"
            ? {
                firstOccurrence: {
                  startsAt: new Date(
                    String(data.get("startsAt")),
                  ).toISOString(),
                  endsAt: new Date(String(data.get("endsAt"))).toISOString(),
                  location: data.get("location"),
                  capacity: Number(data.get("capacity")),
                },
              }
            : {}),
        }),
      });
      router.push(`/salas/${result.roomId}?creado=1`);
    } catch (failure) {
      setError(errorMessage(failure));
      setPending(false);
    }
  }
  return (
    <>
      <Link className={s.back} href="/experiencias">
        <Icon name="arrow" size={16} />
        Mis planes
      </Link>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>DEL “HAY QUE VERNOS” AL “NOS VEMOS AHÍ”</p>
          <h1>¿Qué plan tienes en mente?</h1>
          <p>Empieza con una idea. Lo demás pueden decidirlo juntos.</p>
        </div>
      </div>
      <ol className={s.stepper}>
        {steps.map((name, i) => (
          <li key={name}>
            <button
              type="button"
              disabled={i > step || pending}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
            >
              <span>{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
              <strong>{name}</strong>
            </button>
          </li>
        ))}
      </ol>
      <div className={s.editorLayout}>
        <form ref={form} noValidate onSubmit={submit}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <span>
                <Icon
                  name={step === 0 ? "spark" : step === 1 ? "users" : "check"}
                />
              </span>
              <div>
                <h2>{steps[step]}</h2>
                <p>
                  {step === 0
                    ? "No necesitas tener todo resuelto para empezar."
                    : step === 1
                      ? "Tú eliges cómo se organiza el grupo."
                      : "El plan se crea al instante. Tú decides con quién compartirlo."}
                </p>
              </div>
            </div>
            {error && (
              <p role="alert" className={s.error}>
                {error}
              </p>
            )}
            <fieldset
              disabled={pending}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              <div hidden={step !== 0} data-stage="0">
                <div className={s.formFields}>
                  <label>
                    ¿Cómo se llama el plan?
                    <input
                      name="title"
                      autoComplete="off"
                      required
                      pattern=".*\S.*"
                      maxLength={100}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Café y chisme el sábado"
                    />
                    <small>
                      Puede ser algo tan sencillo como ir a comer o salir a
                      caminar.
                    </small>
                  </label>
                  <label>
                    Cuéntales la idea{" "}
                    <span className={s.muted}>(opcional)</span>
                    <textarea
                      name="description"
                      maxLength={500}
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Hace rato no nos vemos. ¿Nos reunimos por un café y nos ponemos al día?"
                    />
                  </label>
                </div>
              </div>
              <div hidden={step !== 1} data-stage="1">
                <div className={s.formFields}>
                  <div>
                    <h3>¿Quién puede verlo?</h3>
                    <div className={s.choiceGrid}>
                      <label
                        className={s.choice}
                        data-selected={visibility === "PRIVATE"}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value="PRIVATE"
                          checked={visibility === "PRIVATE"}
                          onChange={() => setVisibility("PRIVATE")}
                        />
                        <Icon name="lock" />
                        <strong>Solo con invitación</strong>
                        <small>
                          Tu plan no aparece en Explorar. Entran quienes tengan
                          tu enlace o código.
                        </small>
                      </label>
                      <label
                        className={s.choice}
                        data-selected={visibility === "PUBLIC"}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value="PUBLIC"
                          checked={visibility === "PUBLIC"}
                          onChange={() => setVisibility("PUBLIC")}
                        />
                        <Icon name="compass" />
                        <strong>Abierto a la comunidad</strong>
                        <small>
                          Aparece en Explorar para que otras personas también
                          puedan sumarse.
                        </small>
                      </label>
                    </div>
                  </div>
                  <div>
                    <h3>¿Ya saben cuándo y dónde?</h3>
                    <div className={s.choiceGrid}>
                      <label
                        className={s.choice}
                        data-selected={schedule === "TOGETHER"}
                      >
                        <input
                          type="radio"
                          name="schedule"
                          value="TOGETHER"
                          checked={schedule === "TOGETHER"}
                          onChange={() => setSchedule("TOGETHER")}
                        />
                        <Icon name="users" />
                        <strong>Lo decidimos juntos</strong>
                        <small>
                          Invita primero. Después proponen fechas y lugares y
                          votan.
                        </small>
                      </label>
                      <label
                        className={s.choice}
                        data-selected={schedule === "FIXED"}
                      >
                        <input
                          type="radio"
                          name="schedule"
                          value="FIXED"
                          checked={schedule === "FIXED"}
                          onChange={() => setSchedule("FIXED")}
                        />
                        <Icon name="calendar" />
                        <strong>Ya tengo los detalles</strong>
                        <small>
                          Fija la fecha y el lugar. Tus amigos solo tendrán que
                          confirmar si van.
                        </small>
                      </label>
                    </div>
                  </div>
                  {schedule === "FIXED" && (
                    <>
                      <div className={s.twoFields}>
                        <label>
                          Inicio
                          <input
                            name="startsAt"
                            type="datetime-local"
                            required
                          />
                        </label>
                        <label>
                          Fin aproximado
                          <input name="endsAt" type="datetime-local" required />
                        </label>
                      </div>
                      <label>
                        ¿Dónde se encuentran?
                        <input
                          name="location"
                          minLength={3}
                          maxLength={200}
                          required
                          placeholder="Nombre del lugar, dirección o punto de encuentro"
                        />
                      </label>
                      <label>
                        ¿Cuántas personas pueden ir?
                        <input
                          name="capacity"
                          type="number"
                          min={1}
                          max={500}
                          defaultValue={12}
                          required
                        />
                        <small>
                          Inclúyete en el total. Cada persona confirma su propio
                          cupo.
                        </small>
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div hidden={step !== 2} data-stage="2">
                <div className={s.formFields}>
                  <div className={s.notice}>
                    <strong>{title || "Tu nuevo plan"}</strong>
                    <p>
                      {description ||
                        "El grupo ya tendrá un espacio para empezar a organizarse."}
                    </p>
                  </div>
                  <dl className={s.reviewList}>
                    <div>
                      <dt>Visibilidad</dt>
                      <dd>
                        {visibility === "PRIVATE"
                          ? "Solo con invitación"
                          : "Visible en Explorar"}
                      </dd>
                    </div>
                    <div>
                      <dt>Fecha y lugar</dt>
                      <dd>
                        {schedule === "TOGETHER"
                          ? "Los deciden dentro del grupo"
                          : `${summary.startsAt ? date(summary.startsAt) : ""} · ${summary.location ?? ""}`}
                      </dd>
                    </div>
                    {schedule === "FIXED" && (
                      <div>
                        <dt>Cupos</dt>
                        <dd>{summary.capacity} personas, incluyéndote</dd>
                      </div>
                    )}
                  </dl>
                  <ul className={s.checklist}>
                    <li>
                      <Icon name="check" size={18} />
                      <div>
                        <strong>Creas el plan ahora</strong>No necesita
                        aprobación de nadie.
                      </div>
                    </li>
                    <li>
                      <Icon name="users" size={18} />
                      <div>
                        <strong>Compartes la invitación</strong>El enlace y el
                        código aparecen en la siguiente pantalla.
                      </div>
                    </li>
                    <li>
                      <Icon name="ticket" size={18} />
                      <div>
                        <strong>Cada amigo confirma si va</strong>
                        {schedule === "TOGETHER"
                          ? "Primero votan; después se apuntan al plan elegido."
                          : "Entrar al grupo no ocupa un cupo hasta pulsar “Me apunto”."}
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </fieldset>
          </section>
          <div className={s.formFooter}>
            <small>Paso {step + 1} de 3</small>
            <div className={s.actions}>
              {step > 0 && (
                <button
                  disabled={pending}
                  type="button"
                  className={s.secondary}
                  onClick={() => setStep(step - 1)}
                >
                  Atrás
                </button>
              )}
              <button disabled={pending} className={s.primary} type="submit">
                {pending
                  ? "Creando tu plan…"
                  : step === 2
                    ? "Crear plan y obtener invitación"
                    : "Continuar"}
                <Icon name={step === 2 ? "check" : "arrow"} size={16} />
              </button>
            </div>
          </div>
        </form>
        <aside className={s.preview}>
          <h3>Así se verá tu plan</h3>
          <div className={s.experienceCard}>
            <Cover category="Entre amigos" />
            <div className={s.cardContent}>
              <span className={s.badge}>
                {visibility === "PRIVATE" ? "Solo con invitación" : "Público"}
              </span>
              <h2 style={{ marginTop: 16 }}>
                {title || "Tu próxima buena historia"}
              </h2>
              <p className={s.cardDescription}>
                {description ||
                  "Un espacio para reunir a tu gente y hacer que el plan suceda."}
              </p>
              <div className={s.cardMeta}>
                <p>
                  <Icon name="calendar" size={16} />
                  {schedule === "TOGETHER"
                    ? "Fecha por decidir juntos"
                    : "Fecha definida por ti"}
                </p>
                <p>
                  <Icon name="users" size={16} />
                  Invita a tus amigos después de crear
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
export default function CreatePlan() {
  return (
    <StudioShell breadcrumb="Crear un plan">
      <Creator />
    </StudioShell>
  );
}
