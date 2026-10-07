import styles from "@/app/page.module.css";

export default function AuthBrand() {
  return (
    <section className={styles.brand} aria-label="Bienvenido a Plot">
      <div className={styles.logo}>
        <span className={styles.logoIcon} aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="currentColor">
            <path d="m25 7 3.5 10.5L39 21l-10.5 3.5L25 35l-3.5-10.5L11 21l10.5-3.5L25 7Z" />
            <path d="m11 30 1.7 5.3L18 37l-5.3 1.7L11 44l-1.7-5.3L4 37l5.3-1.7L11 30Zm27-3 1.5 4.5L44 33l-4.5 1.5L38 39l-1.5-4.5L32 33l4.5-1.5L38 27Z" />
          </svg>
        </span>
        <span>plot</span>
      </div>
      <div className={styles.brandMessage}>
        <p className={styles.badge}>Tu próximo plan empieza aquí</p>
        <h1>
          Menos “algún
          <br className={styles.desktopBreak} /> día”.
          <br />
          Más historias.
        </h1>
        <p className={styles.description}>
          Organiza experiencias memorables y sal a vivirlas con tu gente.
        </p>
      </div>
      <p className={styles.tagline}>Planes simples. Recuerdos enormes.</p>
    </section>
  );
}
