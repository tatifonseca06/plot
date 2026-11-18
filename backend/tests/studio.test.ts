import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createSession } from "../src/middleware/auth.js";

if (new URL(process.env.DATABASE_URL!).pathname !== "/plot_test")
  throw new Error("Solo se permite plot_test.");

test("Espacio creador: detalles, creación conjunta y salas privadas", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const ids: string[] = [],
    cookies: string[] = [];
  const prefix = randomUUID();
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    who?: number,
  ) {
    const r = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://localhost:3000",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(who === undefined ? {} : { Cookie: cookies[who] }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, data: r.status === 204 ? null : await r.json() };
  }
  const basics = {
    title: `Editor ${prefix}`,
    category: "Cultura",
    subcategoryId: "10000000-0000-4000-8000-000000000001",
    description: "Un encuentro para recorrer el barrio.",
  };
  const details = {
    ...basics,
    city: "Quito",
    itinerary: "Encuentro y recorrido por el barrio.",
    included: "Guía y materiales",
    requirements: "Llevar agua",
    coverTheme: "SAGE",
    firstOccurrence: {
      startsAt: new Date(Date.now() + 604800000).toISOString(),
      endsAt: new Date(Date.now() + 608400000).toISOString(),
      location: "Plaza del barrio",
      capacity: 12,
    },
    missions: [
      {
        title: "Descubre una historia",
        description: "Conversa con el grupo.",
        points: 15,
      },
    ],
  };
  let id = "",
    occurrenceId = "";
  try {
    for (const [i, role] of [
      "ORGANIZER",
      "ADMIN",
      "PARTICIPANT",
      "ORGANIZER",
    ].entries()) {
      const u = await prisma.user.create({
        data: {
          fullName: `Studio ${i}`,
          email: `${prefix}-${i}@plot.test`,
          passwordHash: "unused",
          role: role as "ORGANIZER" | "ADMIN" | "PARTICIPANT",
        },
      });
      ids.push(u.id);
      cookies.push(`plot_session=${await createSession(u.id)}`);
    }
    await t.test(
      "Validación completa no deja borradores parciales",
      async () => {
        for (const change of [
          { firstOccurrence: { ...details.firstOccurrence, capacity: 0 } },
          { coverTheme: "INVALID" },
          { missions: [{ ...details.missions[0], points: -1 }] },
        ]) {
          assert.equal(
            (
              await request(
                "/experiences",
                "POST",
                { ...details, ...change },
                0,
              )
            ).status,
            400,
          );
        }
        assert.equal(
          await prisma.experience.count({ where: { ownerId: ids[0] } }),
          0,
        );
        assert.equal(
          (await request("/experiences", "POST", details)).status,
          401,
        );
      },
    );
    await t.test(
      "Una petición guarda experiencia, fecha y misiones con métricas reales",
      async () => {
        const created = await request("/experiences", "POST", details, 0);
        assert.equal(created.status, 201);
        id = created.data.data.id;
        const full = await request(`/manage/${id}`, "GET", undefined, 0);
        const plan = full.data.data;
        assert.equal(plan.city, "Quito");
        assert.equal(plan.itinerary, details.itinerary);
        assert.equal(plan.coverTheme, "SAGE");
        assert.equal(plan.missions.length, 1);
        assert.equal(plan.occurrences.length, 1);
        occurrenceId = plan.occurrences[0].id;
        assert.equal(plan.occurrences[0].capacity, 12);
        assert.equal(
          (await request(`/manage/${id}`, "GET", undefined, 3)).status,
          404,
        );
        const dashboard = await request("/experiences", "GET", undefined, 0);
        assert.equal(dashboard.data.data.items[0]._count.missions, 1);
        assert.equal(
          dashboard.data.data.items[0].occurrences[0]._count.reservations,
          0,
        );
      },
    );
    await t.test(
      "Sala con propuesta se crea junta solo si la experiencia está publicada",
      async () => {
        const body = { name: "Desde el plan", occurrenceId };
        assert.equal((await request("/rooms", "POST", body, 2)).status, 409);
        assert.equal(
          await prisma.room.count({ where: { ownerId: ids[2] } }),
          0,
        );
        await request(`/manage/${id}/submit`, "POST", undefined, 0);
        await request(
          `/moderation/experiences/${id}`,
          "PATCH",
          { status: "PUBLISHED" },
          1,
        );
        const catalog = await request(`/catalog/${id}`);
        assert.equal(catalog.data.data.included, "Guía y materiales");
        assert.equal(catalog.data.data.requirements, "Llevar agua");
        const room = await request("/rooms", "POST", body, 2);
        assert.equal(room.status, 201);
        const detail = await request(
          `/rooms/${room.data.data.id}`,
          "GET",
          undefined,
          2,
        );
        assert.equal(detail.data.data.proposals.length, 1);
        assert.equal(detail.data.data.proposals[0].occurrence.id, occurrenceId);
        assert.equal(
          (await request(`/manage/${id}`, "GET", undefined, 0)).data.data
            .occurrences[0].proposals.length,
          0,
        );
        await request("/rooms/join", "POST", { code: room.data.data.code }, 0);
        assert.equal(
          (await request(`/manage/${id}`, "GET", undefined, 0)).data.data
            .occurrences[0].proposals[0].room.id,
          room.data.data.id,
        );
      },
    );
    await t.test(
      "Edición conserva fechas, reservas, misiones y campos omitidos por clientes anteriores",
      async () => {
        assert.equal(
          (
            await request(
              `/occurrences/${occurrenceId}/reservations`,
              "POST",
              undefined,
              2,
            )
          ).status,
          201,
        );
        const dashboard = await request("/experiences", "GET", undefined, 0);
        assert.equal(
          dashboard.data.data.items[0].occurrences[0]._count.reservations,
          1,
        );
        assert.equal(
          (
            await request(
              `/experiences/${id}`,
              "PUT",
              { ...basics, title: "Título revisado" },
              0,
            )
          ).status,
          200,
        );
        const plan = await prisma.experience.findUniqueOrThrow({
          where: { id },
          include: {
            missions: true,
            occurrences: { include: { reservations: true } },
          },
        });
        assert.equal(plan.city, "Quito");
        assert.equal(plan.status, "PUBLISHED");
        assert.equal(plan.missions.length, 1);
        assert.equal(plan.occurrences[0].reservations.length, 1);
      },
    );
  } finally {
    await prisma.room.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.reservation.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
});
