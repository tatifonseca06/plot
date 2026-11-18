import { atomic, assertManager, type Actor } from "./transaction.js";
import { HttpError } from "../errors.js";

export async function reserve(occurrenceId: string, user: Actor) {
  return atomic(async (tx) => {
    const occurrence = await tx.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: {
        experience: {
          include: {
            group: {
              include: {
                members: { where: { userId: user.id } },
                selectedProposal: true,
              },
            },
          },
        },
      },
    });
    const plan = occurrence.experience;
    if (
      plan.visibility === "PRIVATE" &&
      plan.ownerId !== user.id &&
      !plan.group?.members.length
    )
      throw new HttpError(404, "NOT_FOUND", "Plan no encontrado.");
    if (
      plan.group &&
      (!plan.group.closed ||
        plan.group.selectedProposal?.occurrenceId !== occurrenceId)
    )
      throw new HttpError(
        409,
        "UNDECIDED",
        "Primero elijan una fecha dentro del grupo.",
      );
    if (
      occurrence.status !== "SCHEDULED" ||
      occurrence.experience.status !== "PUBLISHED" ||
      occurrence.startsAt <= new Date()
    )
      throw new HttpError(
        409,
        "UNAVAILABLE",
        "Esta fecha ya no admite reservas.",
      );
    const existing = await tx.reservation.findUnique({
      where: { userId_occurrenceId: { userId: user.id, occurrenceId } },
    });
    if (existing?.status === "CONFIRMED") return existing;
    const occupied = await tx.reservation.count({
      where: { occurrenceId, status: "CONFIRMED" },
    });
    if (occupied >= occurrence.capacity)
      throw new HttpError(409, "FULL", "Ya no quedan cupos para esta fecha.");
    if (plan.group)
      await tx.roomMember.upsert({
        where: { roomId_userId: { roomId: plan.group.id, userId: user.id } },
        create: { roomId: plan.group.id, userId: user.id },
        update: {},
      });
    return tx.reservation.upsert({
      where: { userId_occurrenceId: { userId: user.id, occurrenceId } },
      create: { userId: user.id, occurrenceId },
      update: { status: "CONFIRMED", attended: false },
    });
  });
}

export async function cancelReservation(id: string, user: Actor) {
  return atomic(async (tx) => {
    const reservation = await tx.reservation.findFirstOrThrow({
      where: { id, userId: user.id },
      include: { occurrence: true },
    });
    if (reservation.status === "CANCELLED") return reservation;
    if (reservation.occurrence.startsAt <= new Date())
      throw new HttpError(
        409,
        "STARTED",
        "Solo puedes cancelar antes del inicio.",
      );
    return tx.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  });
}

export async function changeOccurrence(
  id: string,
  status: "CANCELLED" | "COMPLETED",
  user: Actor,
) {
  return atomic(async (tx) => {
    const occurrence = await tx.occurrence.findUniqueOrThrow({
      where: { id },
      include: { experience: true },
    });
    assertManager(occurrence.experience.ownerId, user);
    if (occurrence.status !== "SCHEDULED")
      throw new HttpError(409, "CLOSED", "La fecha ya está cerrada.");
    if (status === "COMPLETED" && occurrence.endsAt > new Date())
      throw new HttpError(
        409,
        "NOT_FINISHED",
        "Espera a que termine la experiencia.",
      );
    if (status === "CANCELLED") {
      const groups = await tx.room.findMany({
        where: {
          experienceId: occurrence.experienceId,
          selectedProposal: { occurrenceId: id },
        },
        select: { id: true },
      });
      const groupIds = groups.map((group) => group.id);
      await tx.vote.deleteMany({ where: { roomId: { in: groupIds } } });
      await tx.room.updateMany({
        where: { id: { in: groupIds } },
        data: { closed: false, selectedProposalId: null },
      });
      await tx.missionCompletion.deleteMany({
        where: { reservation: { occurrenceId: id } },
      });
      await tx.reservation.updateMany({
        where: { occurrenceId: id },
        data: { status: "CANCELLED", attended: false },
      });
    }
    return tx.occurrence.update({ where: { id }, data: { status } });
  });
}
