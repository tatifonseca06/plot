import type { RequestHandler } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { experienceSchema, idSchema, paginationSchema } from "../validations.js";

// El usuario viene de la sesión, nunca del cuerpo enviado por el navegador.
export const list: RequestHandler = async (request, response) => {
  const { page, pageSize } = paginationSchema.parse(request.query);
  const ownerId = request.user!.id;
  const [items, total] = await prisma.$transaction([
    prisma.experience.findMany({ where: { ownerId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.experience.count({ where: { ownerId } }),
  ]);
  response.json({ data: { items, total, page, pageSize } });
};

export const get: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const experience = await prisma.experience.findFirst({ where: { id, ownerId: request.user!.id } });
  if (!experience) throw new HttpError(404, "NOT_FOUND", "Experiencia no encontrada.");
  response.json({ data: experience });
};

export const create: RequestHandler = async (request, response) => {
  const data = experienceSchema.parse(request.body);
  const experience = await prisma.experience.create({ data: { ...data, ownerId: request.user!.id } });
  response.status(201).location(`/api/experiences/${experience.id}`).json({ data: experience });
};

export const update: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const data = experienceSchema.parse(request.body);
  // Filtrar por propietario también al actualizar evita modificar datos ajenos.
  const experience = await prisma.experience.update({ where: { id, ownerId: request.user!.id }, data });
  response.json({ data: experience });
};

export const remove: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  await prisma.experience.delete({ where: { id, ownerId: request.user!.id } });
  response.status(204).end();
};
