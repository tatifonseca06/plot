import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../errors.js";

// Serializable prevents overselling seats and closing a vote while it changes.
export async function atomic<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      // adapter-pg can expose a PostgreSQL serialization failure at commit
      // directly, instead of wrapping it in Prisma's P2034.
      const conflict = error as {
        code?: string;
        cause?: { originalCode?: string; kind?: string };
      };
      if (
        conflict.code !== "P2034" &&
        conflict.cause?.kind !== "TransactionWriteConflict" &&
        !["40001", "40P01"].includes(conflict.cause?.originalCode ?? "")
      )
        throw error;
    }
  }
  throw new HttpError(
    409,
    "CONCURRENT_CHANGE",
    "El plan cambió mientras lo guardabas. Inténtalo de nuevo.",
  );
}

export type Actor = NonNullable<Express.Request["user"]>;
export function assertManager(ownerId: string, actor: Actor) {
  if (actor.id !== ownerId && actor.role !== "ADMIN")
    throw new HttpError(404, "NOT_FOUND", "Experiencia no encontrada.");
}
