import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "./api";
import { safeReturnTo } from "./return-to";

// Use a configured origin, never a request Host header, to forward the session.
const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get("plot_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const origin =
    process.env.API_URL ??
    (process.env.VERCEL
      ? (process.env.FRONTEND_URL ??
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : undefined))
      : "http://localhost:4000");
  if (!origin) throw new Error("Falta configurar el origen de la API.");
  const response = await fetch(new URL("/api/auth/me", origin), {
    headers: { Cookie: `plot_session=${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("No se pudo comprobar la sesión.");
  const { data } = await response.json();
  if (!data?.id || !["PARTICIPANT", "ORGANIZER", "ADMIN"].includes(data.role))
    throw new Error("Respuesta de sesión no válida.");
  return data;
});

export async function requirePageUser(returnTo: string, adminOnly = false) {
  const user = await currentUser();
  if (!user) redirect(`/?next=${encodeURIComponent(safeReturnTo(returnTo))}`);
  if (adminOnly && user.role !== "ADMIN") redirect("/experiencias");
  return user;
}
