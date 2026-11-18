import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createSession } from "../src/middleware/auth.js";

if (new URL(process.env.DATABASE_URL!).pathname !== "/plot_test")
  throw new Error("Solo se permite plot_test.");

test("Flujo final de Plot con PostgreSQL y concurrencia real", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const ids: string[] = [];
  const cookies: string[] = [];
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
  const experience = {
    title: `Plan ${prefix}`,
    category: "Cultura",
    subcategoryId: "10000000-0000-4000-8000-000000000001",
    description: "Una experiencia para comprobar todo el flujo.",
  };
  let eid = "",
    oid = "",
    missionId = "",
    roomId = "",
    proposalId = "",
    reservationId = "",
    reviewId = "";
  let reservedUser = 2;
  try {
    for (const [i, role] of [
      "ORGANIZER",
      "ADMIN",
      "PARTICIPANT",
      "PARTICIPANT",
      "ORGANIZER",
    ].entries()) {
      const user = await prisma.user.create({
        data: {
          fullName: `Prueba ${i}`,
          email: `${prefix}-${i}@plot.test`,
          passwordHash: "not-used",
          role: role as "ORGANIZER" | "ADMIN" | "PARTICIPANT",
        },
      });
      ids.push(user.id);
      cookies.push(`plot_session=${await createSession(user.id)}`);
    }
    await t.test(
      "Catálogo público, permisos y borradores privados",
      async () => {
        assert.equal((await request("/catalog")).status, 200);
        assert.equal((await request("/rooms")).status, 401);
        const created = await request("/experiences", "POST", experience, 0);
        assert.equal(created.status, 201);
        eid = created.data.data.id;
        assert.equal((await request(`/catalog/${eid}`)).status, 404);
        assert.equal(
          (await request(`/manage/${eid}`, "GET", undefined, 4)).status,
          404,
        );
        assert.equal(
          (await request(`/manage/${eid}/submit`, "POST", undefined, 2)).status,
          404,
        );
      },
    );
    await t.test(
      "Misiones y fechas validan propietario, fechas y cupos",
      async () => {
        const mission = await request(
          `/manage/${eid}/missions`,
          "POST",
          {
            title: "Conoce el lugar",
            description: "Descubre una historia del lugar.",
            points: 20,
          },
          0,
        );
        assert.equal(mission.status, 201);
        missionId = mission.data.data.id;
        const data = {
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          endsAt: new Date(Date.now() + 90000000).toISOString(),
          location: "Plaza central",
          capacity: 1,
        };
        assert.equal(
          (
            await request(
              `/manage/${eid}/occurrences`,
              "POST",
              { ...data, capacity: 0 },
              0,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/manage/${eid}/occurrences`,
              "POST",
              { ...data, endsAt: data.startsAt },
              0,
            )
          ).status,
          400,
        );
        assert.equal(
          (await request(`/manage/${eid}/occurrences`, "POST", data, 2)).status,
          404,
        );
        const r = await request(`/manage/${eid}/occurrences`, "POST", data, 0);
        assert.equal(r.status, 201);
        oid = r.data.data.id;
        assert.equal(
          (
            await request(
              `/occurrences/${oid}/reservations`,
              "POST",
              undefined,
              2,
            )
          ).status,
          409,
        );
      },
    );
    await t.test(
      "Moderación exige administrador y controla transiciones",
      async () => {
        assert.equal(
          (await request(`/manage/${eid}/submit`, "POST", undefined, 0)).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/moderation/experiences/${eid}`,
              "PATCH",
              { status: "PUBLISHED" },
              0,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/moderation/experiences/${eid}`,
              "PATCH",
              { status: "REJECTED" },
              1,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/moderation/experiences/${eid}`,
              "PATCH",
              { status: "REJECTED", moderationNote: "Aclarar el encuentro" },
              1,
            )
          ).status,
          200,
        );
        assert.equal(
          (await request(`/manage/${eid}/submit`, "POST", undefined, 0)).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/moderation/experiences/${eid}`,
              "PATCH",
              { status: "PUBLISHED" },
              1,
            )
          ).status,
          200,
        );
        assert.equal((await request(`/catalog/${eid}`)).status, 200);
        const catalog = await request(
          `/catalog?q=${encodeURIComponent(prefix)}`,
        );
        assert.equal(catalog.data.data.items.length, 1);
        assert.equal(
          (
            await request(
              `/moderation/experiences/${eid}`,
              "PATCH",
              { status: "PUBLISHED" },
              1,
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      "Salas privadas, invitaciones, votos únicos y cierre",
      async () => {
        const room = await request(
          "/rooms",
          "POST",
          { name: "Plan entre amigos" },
          2,
        );
        assert.equal(room.status, 201);
        roomId = room.data.data.id;
        assert.equal(
          (await request(`/rooms/${roomId}`, "GET", undefined, 3)).status,
          404,
        );
        assert.equal(
          (
            await request(
              "/rooms/join",
              "POST",
              { code: room.data.data.code },
              3,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              "/rooms/join",
              "POST",
              { code: room.data.data.code },
              3,
            )
          ).status,
          200,
        );
        const p = await request(
          `/rooms/${roomId}/proposals`,
          "POST",
          { occurrenceId: oid },
          2,
        );
        assert.equal(p.status, 201);
        proposalId = p.data.data.id;
        assert.equal(
          (await request(`/rooms/${roomId}/vote`, "PUT", { proposalId }, 4))
            .status,
          404,
        );
        assert.equal(
          (await request(`/rooms/${roomId}/close`, "POST", { proposalId }, 2))
            .status,
          409,
        );
        for (const who of [2, 2, 3])
          assert.equal(
            (await request(`/rooms/${roomId}/vote`, "PUT", { proposalId }, who))
              .status,
            200,
          );
        const detail = await request(`/rooms/${roomId}`, "GET", undefined, 2);
        assert.equal(detail.data.data.members.length, 2);
        assert.equal(detail.data.data.proposals[0]._count.votes, 2);
        assert.equal(
          (await request(`/rooms/${roomId}/close`, "POST", { proposalId }, 3))
            .status,
          403,
        );
        assert.equal(
          (await request(`/rooms/${roomId}/close`, "POST", { proposalId }, 2))
            .status,
          200,
        );
        assert.equal(
          (await request(`/rooms/${roomId}/vote`, "PUT", { proposalId }, 2))
            .status,
          409,
        );
        assert.equal(
          (
            await request(
              "/rooms/join",
              "POST",
              { code: room.data.data.code },
              4,
            )
          ).status,
          409,
        );
      },
    );
    await t.test(
      "Votos no pueden cruzar salas y cambiar voto no lo duplica",
      async () => {
        const room = await request("/rooms", "POST", { name: "Otra sala" }, 2);
        const rid = room.data.data.id;
        assert.equal(
          (await request(`/rooms/${rid}/vote`, "PUT", { proposalId }, 2))
            .status,
          404,
        );
        const second = await request(
          `/manage/${eid}/occurrences`,
          "POST",
          {
            startsAt: new Date(Date.now() + 172800000).toISOString(),
            endsAt: new Date(Date.now() + 176400000).toISOString(),
            location: "Segunda fecha",
            capacity: 10,
          },
          0,
        );
        const first = await request(
          `/rooms/${rid}/proposals`,
          "POST",
          { occurrenceId: oid },
          2,
        );
        const next = await request(
          `/rooms/${rid}/proposals`,
          "POST",
          { occurrenceId: second.data.data.id },
          2,
        );
        await request(
          `/rooms/${rid}/vote`,
          "PUT",
          { proposalId: first.data.data.id },
          2,
        );
        await request(
          `/rooms/${rid}/vote`,
          "PUT",
          { proposalId: next.data.data.id },
          2,
        );
        const detail = await request(`/rooms/${rid}`, "GET", undefined, 2);
        assert.equal(
          detail.data.data.proposals.reduce(
            (sum: number, p: { _count: { votes: number } }) =>
              sum + p._count.votes,
            0,
          ),
          1,
        );
        assert.equal(
          (
            await request(
              `/rooms/${rid}/close`,
              "POST",
              { proposalId: first.data.data.id },
              2,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/rooms/${rid}/close`,
              "POST",
              { proposalId: next.data.data.id },
              2,
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      "Dos reservas simultáneas compiten por el último cupo sin sobreventa",
      async () => {
        assert.equal(
          (
            await request(
              `/occurrences/${oid}/reservations`,
              "POST",
              undefined,
              undefined,
            )
          ).status,
          401,
        );
        const results = await Promise.all(
          [2, 3].map((who) =>
            request(`/occurrences/${oid}/reservations`, "POST", undefined, who),
          ),
        );
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
        reservedUser = results[0].status === 201 ? 2 : 3;
        reservationId = results.find((r) => r.status === 201)!.data.data.id;
        const again = await request(
          `/occurrences/${oid}/reservations`,
          "POST",
          undefined,
          reservedUser,
        );
        assert.equal(again.data.data.id, reservationId);
        assert.equal(
          await prisma.reservation.count({
            where: { occurrenceId: oid, status: "CONFIRMED" },
          }),
          1,
        );
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}`,
              "DELETE",
              undefined,
              4,
            )
          ).status,
          404,
        );
      },
    );
    await t.test(
      "Cancelación libera cupo y reactivación no duplica reservas",
      async () => {
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}`,
              "DELETE",
              undefined,
              reservedUser,
            )
          ).status,
          200,
        );
        assert.equal(
          await prisma.reservation.count({
            where: { occurrenceId: oid, status: "CONFIRMED" },
          }),
          0,
        );
        assert.equal(
          (
            await request(
              `/occurrences/${oid}/reservations`,
              "POST",
              undefined,
              reservedUser,
            )
          ).data.data.id,
          reservationId,
        );
        assert.equal(
          (await request(`/experiences/${eid}`, "DELETE", undefined, 0)).status,
          409,
        );
      },
    );
    await t.test(
      "Asistencia, misiones y reseñas requieren participación real",
      async () => {
        const review = { rating: 5, comment: "Una experiencia excelente." };
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}/review`,
              "POST",
              review,
              reservedUser,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}/missions/${missionId}`,
              "POST",
              undefined,
              reservedUser,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}/attendance`,
              "PATCH",
              { attended: true },
              0,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/occurrences/${oid}`,
              "PATCH",
              { status: "COMPLETED" },
              0,
            )
          ).status,
          409,
        );
        // Simulate elapsed time in the isolated test database, never production.
        await prisma.occurrence.update({
          where: { id: oid },
          data: {
            startsAt: new Date(Date.now() - 7200000),
            endsAt: new Date(Date.now() - 3600000),
          },
        });
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}/attendance`,
              "PATCH",
              { attended: true },
              reservedUser,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}/attendance`,
              "PATCH",
              { attended: true },
              0,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/occurrences/${oid}`,
              "PATCH",
              { status: "COMPLETED" },
              0,
            )
          ).status,
          200,
        );
        for (let n = 0; n < 2; n++)
          assert.equal(
            (
              await request(
                `/reservations/${reservationId}/missions/${missionId}`,
                "POST",
                undefined,
                reservedUser,
              )
            ).status,
            200,
          );
        assert.equal(
          await prisma.missionCompletion.count({ where: { reservationId } }),
          1,
        );
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}`,
              "DELETE",
              undefined,
              reservedUser,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}/review`,
              "POST",
              { ...review, rating: 6 },
              reservedUser,
            )
          ).status,
          400,
        );
        const r = await request(
          `/reservations/${reservationId}/review`,
          "POST",
          review,
          reservedUser,
        );
        assert.equal(r.status, 201);
        reviewId = r.data.data.id;
        assert.equal(
          (
            await request(
              `/reservations/${reservationId}/review`,
              "POST",
              review,
              reservedUser,
            )
          ).status,
          409,
        );
        assert.equal(
          (await request(`/catalog/${eid}`)).data.data.reviewCount,
          1,
        );
      },
    );
    await t.test("Moderación de reseñas y cancelación de fecha", async () => {
      assert.equal(
        (
          await request(
            `/moderation/reviews/${reviewId}`,
            "PATCH",
            { hidden: true, moderationNote: "Revisión de contenido" },
            0,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            `/moderation/reviews/${reviewId}`,
            "PATCH",
            { hidden: true, moderationNote: "Revisión de contenido" },
            1,
          )
        ).status,
        200,
      );
      assert.equal((await request(`/catalog/${eid}`)).data.data.reviewCount, 0);
      const future = await request(
        `/manage/${eid}/occurrences`,
        "POST",
        {
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          endsAt: new Date(Date.now() + 90000000).toISOString(),
          location: "Otro punto",
          capacity: 2,
        },
        0,
      );
      const futureId = future.data.data.id;
      await request(
        `/occurrences/${futureId}/reservations`,
        "POST",
        undefined,
        2,
      );
      assert.equal(
        (
          await request(
            `/occurrences/${futureId}`,
            "PATCH",
            { status: "CANCELLED" },
            0,
          )
        ).status,
        200,
      );
      assert.equal(
        await prisma.reservation.count({
          where: { occurrenceId: futureId, status: "CONFIRMED" },
        }),
        0,
      );
      assert.equal(
        (
          await request(
            `/occurrences/${futureId}/reservations`,
            "POST",
            undefined,
            3,
          )
        ).status,
        409,
      );
      const simultaneous = await request(
        `/manage/${eid}/occurrences`,
        "POST",
        {
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          endsAt: new Date(Date.now() + 90000000).toISOString(),
          location: "Reserva idempotente",
          capacity: 10,
        },
        0,
      );
      const sameId = simultaneous.data.data.id;
      const duplicates = await Promise.all(
        [0, 1].map(() =>
          request(`/occurrences/${sameId}/reservations`, "POST", undefined, 2),
        ),
      );
      assert.ok(duplicates.every((r) => r.status === 201));
      assert.equal(
        await prisma.reservation.count({ where: { occurrenceId: sameId } }),
        1,
      );
      assert.equal(
        (
          await request(
            `/moderation/experiences/${eid}`,
            "PATCH",
            { status: "ARCHIVED", moderationNote: "Retirada temporal" },
            1,
          )
        ).status,
        200,
      );
      assert.equal((await request(`/catalog/${eid}`)).status, 404);
      assert.equal(
        (await request(`/reservations`, "GET", undefined, reservedUser)).status,
        200,
      );
    });
  } finally {
    await prisma.room.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.reservation.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
});
