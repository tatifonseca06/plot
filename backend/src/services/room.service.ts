import { randomBytes } from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import { atomic } from "./transaction.js";
import { HttpError } from "../errors.js";

export const roomInclude = {
  experience: {
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      status: true,
      coverTheme: true,
    },
  },
  members: { select: { userId: true, user: { select: { fullName: true } } } },
  proposals: {
    include: {
      occurrence: {
        include: {
          experience: { select: { id: true, title: true, status: true } },
          reservations: {
            where: { status: "CONFIRMED" },
            select: { userId: true, user: { select: { fullName: true } } },
          },
        },
      },
      _count: { select: { votes: true } },
    },
  },
} satisfies Prisma.RoomInclude;

export async function memberRoom(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
  open = false,
) {
  const room = await tx.room.findFirstOrThrow({
    where: { id, members: { some: { userId } } },
  });
  if (open && room.closed)
    throw new HttpError(
      409,
      "ROOM_CLOSED",
      "La votación de esta sala ya terminó.",
    );
  return room;
}
export async function createRoom(
  name: string,
  userId: string,
  occurrenceId?: string,
) {
  return atomic(async (tx) => {
    if (occurrenceId) {
      const occurrence = await tx.occurrence.findUniqueOrThrow({
        where: { id: occurrenceId },
        include: { experience: true },
      });
      if (
        occurrence.experience.visibility === "PRIVATE" ||
        occurrence.experience.status !== "PUBLISHED" ||
        occurrence.status !== "SCHEDULED" ||
        occurrence.startsAt <= new Date()
      )
        throw new HttpError(
          409,
          "UNAVAILABLE",
          "Selecciona una fecha futura de una experiencia publicada para iniciar la sala.",
        );
    }
    return tx.room.create({
      data: {
        name,
        ownerId: userId,
        code: randomBytes(10).toString("hex"),
        members: { create: { userId } },
        ...(occurrenceId
          ? { proposals: { create: { occurrenceId, authorId: userId } } }
          : {}),
      },
    });
  });
}
export async function joinRoom(code: string, userId: string) {
  return atomic(async (tx) => {
    const room = await tx.room.findUniqueOrThrow({
      where: { code },
      include: {
        experience: true,
        selectedProposal: { include: { occurrence: true } },
      },
    });
    const existing = await tx.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (existing) return room;
    if (room.closed && !room.experienceId)
      throw new HttpError(409, "ROOM_CLOSED", "La sala ya cerró su votación.");
    if (room.experience && room.experience.status !== "PUBLISHED")
      throw new HttpError(409, "CLOSED", "Este plan ya no está activo.");
    if (
      room.selectedProposal &&
      (room.selectedProposal.occurrence.status !== "SCHEDULED" ||
        room.selectedProposal.occurrence.startsAt <= new Date())
    )
      throw new HttpError(
        409,
        "STARTED",
        "Este encuentro ya comenzó o se canceló.",
      );
    if (
      (await tx.roomMember.count({ where: { roomId: room.id } })) >=
      (room.experienceId ? 500 : 30)
    )
      throw new HttpError(
        409,
        "ROOM_FULL",
        "El grupo alcanzó su límite de integrantes.",
      );
    await tx.roomMember.create({ data: { roomId: room.id, userId } });
    return room;
  });
}
export async function propose(
  roomId: string,
  occurrenceId: string,
  userId: string,
) {
  return atomic(async (tx) => {
    const room = await memberRoom(tx, roomId, userId, true);
    const occurrence = await tx.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: { experience: true },
    });
    if (
      occurrence.experience.status !== "PUBLISHED" ||
      occurrence.status !== "SCHEDULED" ||
      occurrence.startsAt <= new Date()
    )
      throw new HttpError(
        409,
        "UNAVAILABLE",
        "Elige una fecha futura de una experiencia publicada.",
      );
    if (
      (room.experienceId && occurrence.experienceId !== room.experienceId) ||
      (occurrence.experience.visibility === "PRIVATE" &&
        room.experienceId !== occurrence.experienceId)
    )
      throw new HttpError(404, "NOT_FOUND", "Esa opción no pertenece al plan.");
    return tx.proposal.upsert({
      where: { roomId_occurrenceId: { roomId, occurrenceId } },
      create: { roomId, occurrenceId, authorId: userId },
      update: {},
    });
  });
}
export async function vote(roomId: string, proposalId: string, userId: string) {
  return atomic(async (tx) => {
    await memberRoom(tx, roomId, userId, true);
    await tx.proposal.findFirstOrThrow({
      where: {
        id: proposalId,
        roomId,
        occurrence: {
          status: "SCHEDULED",
          startsAt: { gt: new Date() },
          experience: { status: "PUBLISHED" },
        },
      },
    });
    return tx.vote.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, proposalId },
      update: { proposalId },
    });
  });
}
export async function closeRoom(
  roomId: string,
  proposalId: string,
  userId: string,
) {
  return atomic(async (tx) => {
    const room = await memberRoom(tx, roomId, userId, true);
    if (room.ownerId !== userId)
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Solo quien creó la sala puede cerrar la votación.",
      );
    const proposals = await tx.proposal.findMany({
      where: {
        roomId,
        occurrence: {
          status: "SCHEDULED",
          startsAt: { gt: new Date() },
          experience: { status: "PUBLISHED" },
        },
      },
      include: {
        _count: { select: { votes: true } },
        occurrence: { include: { experience: true } },
      },
    });
    const selected = proposals.find((p) => p.id === proposalId);
    const max = Math.max(0, ...proposals.map((p) => p._count.votes));
    if (!selected || max === 0 || selected._count.votes !== max)
      throw new HttpError(
        409,
        "NOT_WINNER",
        "Elige una propuesta con más votos. En empate, decide quien creó la sala.",
      );
    if (
      selected.occurrence.status !== "SCHEDULED" ||
      selected.occurrence.startsAt <= new Date() ||
      selected.occurrence.experience.status !== "PUBLISHED"
    )
      throw new HttpError(
        409,
        "UNAVAILABLE",
        "La propuesta ganadora ya no está disponible.",
      );
    return tx.room.update({
      where: { id: roomId },
      data: { closed: true, selectedProposalId: proposalId },
    });
  });
}
