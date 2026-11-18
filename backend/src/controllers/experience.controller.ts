import { validateSubcategory } from "./category.controller.js";
import type { RequestHandler } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { HttpError } from "../errors.js";
import {
  experienceSchema,
  createExperienceSchema,
  idSchema,
} from "../validations.js";

// El usuario viene de la sesión, nunca del cuerpo enviado por el navegador.
export const list: RequestHandler = async (request, response) => {
  const ownerId = request.user!.id;
  const items = await prisma.experience.findMany({
    where: {
      OR: [{ ownerId }, { group: { members: { some: { userId: ownerId } } } }],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      subcategory: true,
      group: {
        select: {
          id: true,
          closed: true,
          _count: { select: { members: true } },
        },
      },
      _count: { select: { missions: true } },
      occurrences: {
        orderBy: { startsAt: "asc" },
        include: {
          _count: {
            select: { reservations: { where: { status: "CONFIRMED" } } },
          },
        },
      },
    },
  });
  response.json({ data: { items, total: items.length } });
};

export const get: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const experience = await prisma.experience.findFirst({
    where: { id, ownerId: request.user!.id },
  });
  if (!experience)
    throw new HttpError(404, "NOT_FOUND", "Experiencia no encontrada.");
  response.json({ data: experience });
};

export const create: RequestHandler = async (request, response) => {
  const { firstOccurrence, missions, ...data } = createExperienceSchema.parse(
    request.body,
  );
  await validateSubcategory(data.category, data.subcategoryId);
  const experience = await prisma.experience.create({
    data: {
      ...data,
      ownerId: request.user!.id,
      visibility: "PUBLIC",
      ...(firstOccurrence ? { occurrences: { create: firstOccurrence } } : {}),
      ...(missions?.length ? { missions: { create: missions } } : {}),
    },
  });
  response
    .status(201)
    .location(`/api/experiences/${experience.id}`)
    .json({ data: experience });
};

export const update: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const data = experienceSchema
    .extend({ description: z.string().trim().max(500) })
    .parse(request.body);
  await validateSubcategory(data.category, data.subcategoryId);
  // Filtrar por propietario también al actualizar evita modificar datos ajenos.
  const experience = await prisma.$transaction(async (tx) => {
    const item = await tx.experience.update({
      where: { id, ownerId: request.user!.id },
      data,
    });
    await tx.room.updateMany({
      where: { experienceId: id },
      data: { name: item.title },
    });
    return item;
  });
  response.json({ data: experience });
};

export const remove: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  await prisma.experience.delete({ where: { id, ownerId: request.user!.id } });
  response.status(204).end();
};
