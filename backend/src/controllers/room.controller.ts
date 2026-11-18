import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { idSchema } from "../validations.js";
import * as rooms from "../services/room.service.js";

export const list: RequestHandler = async (req, res) =>
  res.json({
    data: {
      items: await prisma.room.findMany({
        where: { members: { some: { userId: req.user!.id } } },
        orderBy: { createdAt: "desc" },
      }),
    },
  });
export const get: RequestHandler = async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const room = await prisma.room.findFirstOrThrow({
    where: { id, members: { some: { userId: req.user!.id } } },
    include: rooms.roomInclude,
  });
  const myVote = await prisma.vote.findUnique({
    where: { roomId_userId: { roomId: id, userId: req.user!.id } },
  });
  res.json({ data: { ...room, myVote: myVote?.proposalId ?? null } });
};
export const create: RequestHandler = async (req, res) => {
  const { name, occurrenceId } = z
    .object({
      name: z.string().trim().min(1).max(100),
      occurrenceId: idSchema.optional(),
    })
    .strict()
    .parse(req.body);
  res
    .status(201)
    .json({ data: await rooms.createRoom(name, req.user!.id, occurrenceId) });
};
export const join: RequestHandler = async (req, res) => {
  const { code } = z
    .object({
      code: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-f0-9]{20}$/, "El código debe tener 20 caracteres."),
    })
    .strict()
    .parse(req.body);
  res.json({ data: await rooms.joinRoom(code, req.user!.id) });
};
export const propose: RequestHandler = async (req, res) => {
  const { occurrenceId } = z
    .object({ occurrenceId: idSchema })
    .strict()
    .parse(req.body);
  res.status(201).json({
    data: await rooms.propose(
      idSchema.parse(req.params.id),
      occurrenceId,
      req.user!.id,
    ),
  });
};
export const vote: RequestHandler = async (req, res) => {
  const { proposalId } = z
    .object({ proposalId: idSchema })
    .strict()
    .parse(req.body);
  res.json({
    data: await rooms.vote(
      idSchema.parse(req.params.id),
      proposalId,
      req.user!.id,
    ),
  });
};
export const close: RequestHandler = async (req, res) => {
  const { proposalId } = z
    .object({ proposalId: idSchema })
    .strict()
    .parse(req.body);
  res.json({
    data: await rooms.closeRoom(
      idSchema.parse(req.params.id),
      proposalId,
      req.user!.id,
    ),
  });
};
