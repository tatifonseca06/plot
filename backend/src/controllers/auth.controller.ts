import type { RequestHandler } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import {
  hashPassword,
  verifyPassword,
  dummyHash,
} from "../security/password.js";
import { registerSchema, loginSchema } from "../validations.js";
import {
  userFields,
  createSession,
  removeSession,
  readSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from "../middleware/auth.js";

export const register: RequestHandler = async (request, response) => {
  const input = registerSchema.parse(request.body);
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: userFields,
  });
  response.status(201).json({ data: user });
};

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? dummyHash,
  );
  if (!user || !valid)
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Correo o contraseña incorrectos.",
    );
  const token = await createSession(user.id, readSessionCookie(request));
  setSessionCookie(response, token);
  response.json({
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
};

export const logout: RequestHandler = async (request, response) => {
  await removeSession(readSessionCookie(request));
  clearSessionCookie(response);
  response.status(204).end();
};

export const me: RequestHandler = (request, response) => {
  response.json({ data: request.user });
};
