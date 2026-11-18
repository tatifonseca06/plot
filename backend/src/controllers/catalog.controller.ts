import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { idSchema } from "../validations.js";

export const list: RequestHandler = async (req, res) => {
  const { q, category, page } = z
    .object({
      q: z.string().trim().max(100).default(""),
      category: z.string().max(40).default(""),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .parse(req.query);
  const where = {
    status: "PUBLISHED" as const,
    visibility: "PUBLIC" as const,
    ...(category ? { category } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.experience.findMany({
      where,
      take: 12,
      skip: (page - 1) * 12,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      include: {
        owner: { select: { fullName: true } },
        subcategory: true,
        occurrences: {
          where: { status: "SCHEDULED", startsAt: { gt: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 1,
        },
      },
    }),
    prisma.experience.count({ where }),
  ]);
  res.json({ data: { items, total, page, pages: Math.ceil(total / 12) } });
};

export const detail: RequestHandler = async (req, res) => {
  const experience = await prisma.experience.findFirstOrThrow({
    where: {
      id: idSchema.parse(req.params.id),
      status: "PUBLISHED",
      OR: [
        { visibility: "PUBLIC" },
        ...(req.user
          ? [
              { ownerId: req.user.id },
              { group: { members: { some: { userId: req.user.id } } } },
            ]
          : []),
      ],
    },
    include: {
      owner: { select: { fullName: true } },
      subcategory: true,
      missions: true,
      group: { select: { id: true, code: true, closed: true } },
      occurrences: {
        where: { status: "SCHEDULED", startsAt: { gt: new Date() } },
        orderBy: { startsAt: "asc" },
        include: {
          _count: {
            select: { reservations: { where: { status: "CONFIRMED" } } },
          },
        },
      },
    },
  });
  const reviews = await prisma.review.findMany({
    where: {
      hidden: false,
      reservation: { occurrence: { experienceId: experience.id } },
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      reservation: { select: { user: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const rating = await prisma.review.aggregate({
    where: {
      hidden: false,
      reservation: { occurrence: { experienceId: experience.id } },
    },
    _avg: { rating: true },
    _count: true,
  });
  res.json({
    data: {
      ...experience,
      reviews,
      rating: rating._avg.rating,
      reviewCount: rating._count,
    },
  });
};
