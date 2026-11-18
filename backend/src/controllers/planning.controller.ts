import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { idSchema, occurrenceSchema, missionSchema } from "../validations.js";
import { HttpError } from "../errors.js";
import { atomic, assertManager } from "../services/transaction.js";
import {
  reserve,
  cancelReservation,
  changeOccurrence,
} from "../services/reservation.service.js";

export const management: RequestHandler = async (req, res) => {
  const item = await prisma.experience.findUniqueOrThrow({
    where: { id: idSchema.parse(req.params.id) },
    include: {
      missions: true,
      group: { select: { id: true } },
      subcategory: true,
      occurrences: {
        orderBy: { startsAt: "asc" },
        include: {
          proposals: {
            where: { room: { members: { some: { userId: req.user!.id } } } },
            select: {
              room: {
                select: {
                  id: true,
                  name: true,
                  closed: true,
                  _count: { select: { members: true } },
                },
              },
            },
          },
          reservations: {
            include: { user: { select: { fullName: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  assertManager(item.ownerId, req.user!);
  res.json({ data: item });
};
export const submit: RequestHandler = async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const item = await atomic(async (tx) => {
    const item = await tx.experience.findUniqueOrThrow({ where: { id } });
    assertManager(item.ownerId, req.user!);
    if (!["DRAFT", "PENDING", "REJECTED", "ARCHIVED"].includes(item.status))
      throw new HttpError(409, "INVALID_STATE", "El plan ya está activo.");
    if (!item.subcategoryId)
      throw new HttpError(
        400,
        "SUBCATEGORY_REQUIRED",
        "Edita la experiencia y selecciona una subcategoría.",
      );
    return tx.experience.update({
      where: { id },
      data: { status: "PUBLISHED", moderationNote: null },
    });
  });
  res.json({ data: item });
};
export const moderate: RequestHandler = async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = z
    .object({
      status: z.enum(["PUBLISHED", "REJECTED", "ARCHIVED"]),
      moderationNote: z.string().trim().max(500).default(""),
    })
    .strict()
    .parse(req.body);
  if (data.status !== "PUBLISHED" && !data.moderationNote)
    throw new HttpError(
      400,
      "REASON_REQUIRED",
      "Escribe el motivo de la decisión.",
    );
  const item = await atomic(async (tx) => {
    const current = await tx.experience.findUniqueOrThrow({ where: { id } });
    if (
      (data.status === "PUBLISHED" || data.status === "REJECTED") &&
      !["PENDING", "PUBLISHED"].includes(current.status)
    )
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Este plan no está disponible para esa acción.",
      );
    if (data.status === "ARCHIVED" && current.status !== "PUBLISHED")
      throw new HttpError(
        409,
        "INVALID_STATE",
        "Solo se puede retirar una experiencia publicada.",
      );
    return tx.experience.update({ where: { id }, data });
  });
  res.json({ data: item });
};
export const createOccurrence: RequestHandler = async (req, res) => {
  const experienceId = idSchema.parse(req.params.id);
  const data = occurrenceSchema.parse(req.body);
  const item = await atomic(async (tx) => {
    const experience = await tx.experience.findUniqueOrThrow({
      where: { id: experienceId },
      include: { group: true },
    });
    assertManager(experience.ownerId, req.user!);
    if (experience.group?.closed)
      throw new HttpError(
        409,
        "DECIDED",
        "El plan ya tiene fecha. Cancela el encuentro actual antes de proponer otro.",
      );
    const occurrence = await tx.occurrence.create({
      data: { ...data, experienceId },
    });
    if (experience.group)
      await tx.proposal.create({
        data: {
          roomId: experience.group.id,
          occurrenceId: occurrence.id,
          authorId: req.user!.id,
        },
      });
    return occurrence;
  });
  res.status(201).json({ data: item });
};
export const updateOccurrence: RequestHandler = async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["CANCELLED", "COMPLETED"]) })
    .strict()
    .parse(req.body);
  res.json({
    data: await changeOccurrence(
      idSchema.parse(req.params.id),
      status,
      req.user!,
    ),
  });
};
export const book: RequestHandler = async (req, res) =>
  res
    .status(201)
    .json({ data: await reserve(idSchema.parse(req.params.id), req.user!) });
export const cancel: RequestHandler = async (req, res) =>
  res.json({
    data: await cancelReservation(idSchema.parse(req.params.id), req.user!),
  });
export const myReservations: RequestHandler = async (req, res) => {
  const items = await prisma.reservation.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      review: true,
      completions: true,
      occurrence: { include: { experience: { include: { missions: true } } } },
    },
  });
  res.json({ data: { items } });
};
export const attendance: RequestHandler = async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { attended } = z
    .object({ attended: z.literal(true) })
    .strict()
    .parse(req.body);
  const item = await atomic(async (tx) => {
    const r = await tx.reservation.findUniqueOrThrow({
      where: { id },
      include: { occurrence: { include: { experience: true } } },
    });
    assertManager(r.occurrence.experience.ownerId, req.user!);
    if (
      r.status !== "CONFIRMED" ||
      r.occurrence.status === "CANCELLED" ||
      r.occurrence.startsAt > new Date()
    )
      throw new HttpError(
        409,
        "INVALID_ATTENDANCE",
        "Solo puedes confirmar asistencia desde el inicio de una reserva vigente.",
      );
    return tx.reservation.update({ where: { id }, data: { attended } });
  });
  res.json({ data: item });
};
export const createMission: RequestHandler = async (req, res) => {
  const experienceId = idSchema.parse(req.params.id);
  const data = missionSchema.parse(req.body);
  const item = await atomic(async (tx) => {
    const e = await tx.experience.findUniqueOrThrow({
      where: { id: experienceId },
    });
    assertManager(e.ownerId, req.user!);
    if (e.status === "ARCHIVED")
      throw new HttpError(
        409,
        "INVALID_STATE",
        "El plan está retirado. Actívalo antes de agregar misiones.",
      );
    return tx.mission.create({ data: { ...data, experienceId } });
  });
  res.status(201).json({ data: item });
};
export const completeMission: RequestHandler = async (req, res) => {
  const missionId = idSchema.parse(req.params.missionId);
  const reservationId = idSchema.parse(req.params.id);
  const item = await atomic(async (tx) => {
    const r = await tx.reservation.findFirstOrThrow({
      where: { id: reservationId, userId: req.user!.id },
      include: { occurrence: true },
    });
    const mission = await tx.mission.findUniqueOrThrow({
      where: { id: missionId },
    });
    if (
      mission.experienceId !== r.occurrence.experienceId ||
      !r.attended ||
      r.status !== "CONFIRMED" ||
      r.occurrence.status === "CANCELLED"
    )
      throw new HttpError(
        403,
        "NOT_ELIGIBLE",
        "Necesitas asistencia confirmada a esta experiencia para completar la misión.",
      );
    return tx.missionCompletion.upsert({
      where: { missionId_reservationId: { missionId, reservationId } },
      create: { missionId, reservationId },
      update: {},
    });
  });
  res.json({ data: item });
};
export const review: RequestHandler = async (req, res) => {
  const reservationId = idSchema.parse(req.params.id);
  const data = z
    .object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(req.body);
  const item = await atomic(async (tx) => {
    const r = await tx.reservation.findFirstOrThrow({
      where: { id: reservationId, userId: req.user!.id },
      include: { occurrence: true, review: true },
    });
    if (
      !r.attended ||
      r.status !== "CONFIRMED" ||
      r.occurrence.status !== "COMPLETED"
    )
      throw new HttpError(
        403,
        "NOT_ELIGIBLE",
        "Solo puedes reseñar una experiencia finalizada a la que asististe.",
      );
    if (r.review)
      throw new HttpError(
        409,
        "ALREADY_REVIEWED",
        "Ya dejaste una reseña para esta reserva.",
      );
    return tx.review.create({ data: { ...data, reservationId } });
  });
  res.status(201).json({ data: item });
};
export const listReviews: RequestHandler = async (_req, res) =>
  res.json({
    data: {
      items: await prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          reservation: {
            select: {
              user: { select: { fullName: true } },
              occurrence: {
                select: { experience: { select: { title: true } } },
              },
            },
          },
        },
      }),
    },
  });
export const moderateReview: RequestHandler = async (req, res) => {
  const data = z
    .object({
      hidden: z.boolean(),
      moderationNote: z.string().trim().min(3).max(500),
    })
    .strict()
    .parse(req.body);
  res.json({
    data: await prisma.review.update({
      where: { id: idSchema.parse(req.params.id) },
      data,
    }),
  });
};
