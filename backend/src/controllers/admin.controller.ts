import { validateSubcategory } from "./category.controller.js";
import type { RequestHandler } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { adminExperienceSchema, idSchema } from "../validations.js";

export const listOrganizers: RequestHandler = async (_request, response) => {
  const organizers = await prisma.user.findMany({
    where: { role: "ORGANIZER" },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
  });
  response.json({ data: { items: organizers } });
};

export const listExperiences: RequestHandler = async (_request, response) => {
  const items = await prisma.experience.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { owner: { select: { fullName: true, email: true } } },
  });
  response.json({ data: { items, total: items.length } });
};

export const create: RequestHandler = async (request, response) => {
  const data = adminExperienceSchema.parse(request.body);
  await validateSubcategory(data.category, data.subcategoryId);

  // Validación de dato sensible: el ownerId debe pertenecer a un ORGANIZER real.
  const owner = await prisma.user.findUnique({ where: { id: data.ownerId } });
  if (!owner || owner.role !== "ORGANIZER")
    throw new HttpError(
      400,
      "INVALID_OWNER",
      "El propietario debe ser un organizador registrado.",
    );

  const experience = await prisma.experience.create({ data });
  response
    .status(201)
    .location(`/api/admin/experiences/${experience.id}`)
    .json({ data: experience });
};

export const update: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const data = adminExperienceSchema.parse(request.body);
  await validateSubcategory(data.category, data.subcategoryId);

  // Validación de dato sensible: el nuevo ownerId también debe ser ORGANIZER.
  const owner = await prisma.user.findUnique({ where: { id: data.ownerId } });
  if (!owner || owner.role !== "ORGANIZER")
    throw new HttpError(
      400,
      "INVALID_OWNER",
      "El propietario debe ser un organizador registrado.",
    );

  const experience = await prisma.experience.update({ where: { id }, data });
  response.json({ data: experience });
};

export const remove: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  await prisma.experience.delete({ where: { id } });
  response.status(204).end();
};
