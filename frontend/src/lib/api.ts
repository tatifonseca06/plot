export type User = { id: string; fullName: string; email: string; role: "PARTICIPANT" | "ORGANIZER" | "ADMIN" };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch {
    throw new ApiError(0, "No pudimos conectar con el servidor. Inténtalo de nuevo.");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.error?.message ?? "El servidor no está disponible. Inténtalo de nuevo.");
  return body.data as T;
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocurrió un error. Inténtalo de nuevo.";
