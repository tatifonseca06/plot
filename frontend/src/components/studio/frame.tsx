"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api, errorMessage, type User } from "@/lib/api";
import { Icon, type IconName } from "./icons";
import s from "./studio.module.css";

export default function WorkspaceFrame({
  user,
  children,
  breadcrumb,
}: {
  user: User | null;
  children: ReactNode;
  breadcrumb: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const creator = !!user;
  const links: { href: string; label: string; icon: IconName }[] = [
    ...(creator
      ? [
          {
            href: "/experiencias",
            label: "Mis planes",
            icon: "grid" as const,
          },
        ]
      : []),
    { href: "/catalogo", label: "Explorar planes", icon: "compass" },
    { href: "/salas", label: "Tengo una invitación", icon: "users" },
    { href: "/reservas", label: "Me apunté", icon: "ticket" },
  ];
  return (
    <div className={s.studio}>
      <a className={s.skipLink} href="#studio-content">
        Saltar al contenido
      </a>
      <aside className={s.sidebar}>
        <Link className={s.brand} href={user ? "/experiencias" : "/catalogo"}>
          <span>
            <Icon name="spark" size={26} />
          </span>
          plot<span className={s.brandDot}>.</span>
        </Link>
        <div className={s.workspace}>
          <span className={s.workspaceIcon}>
            <Icon name={creator ? "spark" : "compass"} />
          </span>
          <div>
            <strong>
              {creator ? "Tus planes con amigos" : "Tu próximo encuentro"}
            </strong>
            <small>Haz que los planes sucedan</small>
          </div>
        </div>
        <p className={s.navLabel}>TU ESPACIO</p>
        <nav aria-label="Tu espacio">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={
                path.startsWith(l.href) ||
                (l.href === "/experiencias" && path.startsWith("/gestionar"))
                  ? "page"
                  : undefined
              }
            >
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
          {user?.role === "ADMIN" && (
            <>
              <Link href="/admin">
                <Icon name="grid" />
                Administración
              </Link>
              <Link href="/moderacion">
                <Icon name="check" />
                Moderación
              </Link>
            </>
          )}
        </nav>
        <div className={s.sidebarNote}>
          <Icon name="users" size={26} />
          <strong>Un buen plan se comparte.</strong>
          <p>
            Crea un plan y comparte la invitación. Cada amigo confirma si va.
          </p>
          <Link href="/salas">
            Unirme con un código <Icon name="arrow" size={16} />
          </Link>
        </div>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <div className={s.account}>
          {user ? (
            <>
              <span className={s.avatar}>
                {user.fullName
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </span>
              <div>
                <strong>{user.fullName}</strong>
                <small>
                  {user.role === "ADMIN" ? "Administrador" : "Mi cuenta"}
                </small>
              </div>
              <button
                disabled={pending}
                aria-label="Cerrar sesión"
                onClick={async () => {
                  setPending(true);
                  setError("");
                  try {
                    await api("/auth/logout", { method: "POST" });
                    router.replace("/");
                    router.refresh();
                  } catch (failure) {
                    setError(errorMessage(failure));
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <Icon name="exit" size={18} />
              </button>
            </>
          ) : (
            <Link className={s.secondary} href="/">
              Iniciar sesión <Icon name="arrow" size={16} />
            </Link>
          )}
        </div>
      </aside>
      <div className={s.body}>
        <header className={s.topbar}>
          <div>
            <span>Mi espacio</span>
            <Icon name="chevron" size={14} />
            <strong>{breadcrumb}</strong>
          </div>
          <Link href={creator ? "/experiencias/nueva" : "/catalogo"}>
            {creator ? "Crear plan" : "Ver catálogo"}
            <Icon name={creator ? "plus" : "arrow"} size={16} />
          </Link>
        </header>
        <main className={s.main} id="studio-content">
          {children}
        </main>
        <footer className={s.footer}>
          Hecho para salir del chat y vivir el plan.
          <span>Plot · Experiencias que conectan</span>
        </footer>
      </div>
    </div>
  );
}
