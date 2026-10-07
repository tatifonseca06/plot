import { createHash, randomBytes } from "node:crypto";
import { parseCookie } from "cookie";
import type { Request, Response, CookieOptions, RequestHandler } from "express";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { HttpError } from "../errors.js";

export const userFields = { id: true, fullName: true, email: true, role: true } as const;
const lifetime = 7 * 24 * 60 * 60 * 1000;
const cookieName = "plot_session";
const cookieOptions: CookieOptions = { httpOnly: true, sameSite: "lax", secure: config.NODE_ENV === "production", path: "/" };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const readSessionCookie = (request: Request) => parseCookie(request.headers.cookie ?? "")[cookieName];
export const setSessionCookie = (response: Response, token: string) => response.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime });
export const clearSessionCookie = (response: Response) => response.clearCookie(cookieName, cookieOptions);

export async function createSession(userId: string, previousToken?: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.$transaction(async tx => {
    if (previousToken) await tx.session.deleteMany({ where: { id: hashToken(previousToken) } });
    await tx.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
    await tx.session.create({ data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + lifetime) } });
  });
  return token;
}

export async function removeSession(token?: string) {
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

declare global {
  namespace Express {
    interface Request { user?: { id: string; fullName: string; email: string; role: "PARTICIPANT" | "ORGANIZER" | "ADMIN" }; }
  }
}

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const token = readSessionCookie(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, "UNAUTHENTICATED", "Inicia sesión para continuar.");
  const session = await prisma.session.findUnique({ where: { id: hashToken(token) }, include: { user: { select: userFields } } });
  if (!session || session.expiresAt <= new Date()) throw new HttpError(401, "UNAUTHENTICATED", "Tu sesión terminó. Inicia sesión de nuevo.");
  request.user = session.user;
  next();
};

export const requireOrganizer: RequestHandler = (request, _response, next) => {
  if (request.user?.role !== "ORGANIZER") throw new HttpError(403, "FORBIDDEN", "Solo los organizadores pueden gestionar experiencias.");
  next();
};
