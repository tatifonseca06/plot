"use client";
import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/lib/api";
import { useResource } from "../community/shared";
import WorkspaceFrame from "./frame";
import s from "./studio.module.css";
export { s };
const Actor = createContext<User | null>(null);
export const useActor = () => useContext(Actor)!;
export default function StudioShell({
  children,
  breadcrumb = "Mis planes",
}: {
  children: ReactNode;
  breadcrumb?: string;
}) {
  const me = useResource<User>("/auth/me");
  return (
    <WorkspaceFrame user={me.data} breadcrumb={breadcrumb}>
      {me.loading ? (
        <div className={s.empty} role="status">
          Preparando tu espacio…
        </div>
      ) : me.error ? (
        <div className={s.empty}>
          <h1>Entra a tu espacio</h1>
          <p role="alert">{me.error}</p>
          <Link className={s.primary} href="/">
            Iniciar sesión
          </Link>
        </div>
      ) : me.data ? (
        <Actor.Provider value={me.data}>{children}</Actor.Provider>
      ) : (
        <div className={s.empty}>
          <h1>Encuentra tu próximo plan</h1>
          <p>Crea una cuenta para organizar planes e invitar a tus amigos.</p>
          <Link className={s.primary} href="/catalogo">
            Explorar experiencias
          </Link>
        </div>
      )}
    </WorkspaceFrame>
  );
}
