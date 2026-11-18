import { randomBytes } from "node:crypto";
import { z } from "zod";
import { occurrenceSchema } from "../validations.js";
import { atomic, type Actor } from "./transaction.js";
import { HttpError } from "../errors.js";

export const planSchema = z
  .object({
    title: z.string().trim().min(1, "Ponle un nombre a tu plan.").max(100),
    description: z.string().trim().max(500).default(""),
    visibility: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"),
    schedule: z.enum(["FIXED", "TOGETHER"]),
    firstOccurrence: occurrenceSchema.optional(),
    coverTheme: z
      .enum(["LAVENDER", "SAGE", "PEACH", "NIGHT"])
      .default("LAVENDER"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.schedule === "FIXED" && !value.firstOccurrence)
      ctx.addIssue({
        code: "custom",
        path: ["firstOccurrence"],
        message: "Completa fecha, lugar y cupos.",
      });
    if (value.schedule === "TOGETHER" && value.firstOccurrence)
      ctx.addIssue({
        code: "custom",
        path: ["firstOccurrence"],
        message: "Agrega las opciones dentro del grupo cuando decidan juntos.",
      });
  });

export async function createPlan(
  input: z.infer<typeof planSchema>,
  user: Actor,
) {
  return atomic(async (tx) => {
    const plan = await tx.experience.create({
      data: {
        title: input.title,
        description: input.description,
        category: "Entre amigos",
        subcategoryId: "10000000-0000-4000-8000-000000000010",
        ownerId: user.id,
        status: "PUBLISHED",
        visibility: input.visibility,
        coverTheme: input.coverTheme,
      },
    });
    const room = await tx.room.create({
      data: {
        name: input.title,
        experienceId: plan.id,
        ownerId: user.id,
        code: randomBytes(10).toString("hex"),
        members: { create: { userId: user.id } },
      },
    });
    if (input.firstOccurrence) {
      const occurrence = await tx.occurrence.create({
        data: { ...input.firstOccurrence, experienceId: plan.id },
      });
      const proposal = await tx.proposal.create({
        data: {
          roomId: room.id,
          occurrenceId: occurrence.id,
          authorId: user.id,
        },
      });
      await tx.room.update({
        where: { id: room.id },
        data: { selectedProposalId: proposal.id, closed: true },
      });
    }
    return { ...plan, roomId: room.id, invitationCode: room.code };
  });
}

export async function addOption(
  roomId: string,
  input: z.infer<typeof occurrenceSchema>,
  user: Actor,
) {
  return atomic(async (tx) => {
    const room = await tx.room.findFirstOrThrow({
      where: { id: roomId, members: { some: { userId: user.id } } },
      include: { experience: true },
    });
    if (
      !room.experienceId ||
      room.closed ||
      room.experience?.status !== "PUBLISHED"
    )
      throw new HttpError(
        409,
        "CLOSED",
        "Este plan ya tiene una fecha elegida o está cerrado.",
      );
    const occurrence = await tx.occurrence.create({
      data: { ...input, experienceId: room.experienceId },
    });
    return tx.proposal.create({
      data: { roomId, occurrenceId: occurrence.id, authorId: user.id },
    });
  });
}
