import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createSession } from "../src/middleware/auth.js";
if (new URL(process.env.DATABASE_URL!).pathname !== "/plot_test")
  throw new Error("Solo plot_test");
test("Planes entre amigos: recorrido completo y privacidad", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const ids: string[] = [],
    cookies: string[] = [];
  const prefix = randomUUID();
  async function req(
    path: string,
    method = "GET",
    body?: unknown,
    who?: number,
  ) {
    const r = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://localhost:3000",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(who === undefined ? {} : { Cookie: cookies[who] }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: r.status,
      data: r.status === 204 ? null : (await r.json()).data,
    };
  }
  const option = {
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    location: "Café de la plaza",
    capacity: 2,
  };
  let plan: { id: string; roomId: string; invitationCode: string },
    proposal: { id: string; occurrenceId: string };
  try {
    for (let i = 0; i < 3; i++) {
      const user = await prisma.user.create({
        data: {
          fullName: `Amigo ${i}`,
          email: `${prefix}-${i}@plot.test`,
          passwordHash: "unused",
          role: "PARTICIPANT",
        },
      });
      ids.push(user.id);
      cookies.push(`plot_session=${await createSession(user.id)}`);
    }
    await t.test(
      "Cualquier cuenta crea un plan activo, privado y con grupo",
      async () => {
        assert.equal(
          (await req("/plans", "POST", { title: prefix, schedule: "TOGETHER" }))
            .status,
          401,
        );
        assert.equal(
          (await req("/plans", "POST", { title: prefix, schedule: "FIXED" }, 0))
            .status,
          400,
        );
        const created = await req(
          "/plans",
          "POST",
          { title: prefix, schedule: "TOGETHER" },
          0,
        );
        assert.equal(created.status, 201);
        plan = created.data;
        assert.equal(created.data.status, "PUBLISHED");
        assert.equal(created.data.visibility, "PRIVATE");
        const room = await req(`/rooms/${plan.roomId}`, "GET", undefined, 0);
        assert.equal(room.data.members.length, 1);
        assert.equal(room.data.closed, false);
        assert.equal(room.data.proposals.length, 0);
      },
    );
    await t.test(
      "No filtra datos privados ni permite propuestas o reservas ajenas",
      async () => {
        assert.equal((await req(`/catalog?q=${prefix}`)).data.items.length, 0);
        assert.equal((await req(`/catalog/${plan.id}`)).status, 404);
        assert.equal(
          (await req(`/rooms/${plan.roomId}`, "GET", undefined, 1)).status,
          404,
        );
        assert.equal(
          (await req(`/rooms/${plan.roomId}/options`, "POST", option, 1))
            .status,
          404,
        );
        const added = await req(
          `/rooms/${plan.roomId}/options`,
          "POST",
          option,
          0,
        );
        assert.equal(added.status, 201);
        proposal = added.data;
        assert.equal(
          (
            await req(
              `/occurrences/${proposal.occurrenceId}/reservations`,
              "POST",
              undefined,
              1,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await req(
              "/rooms",
              "POST",
              { name: "Intento ajeno", occurrenceId: proposal.occurrenceId },
              1,
            )
          ).status,
          409,
        );
      },
    );
    await t.test(
      "Invitación, propuesta de un amigo, votación y asistencia explícita",
      async () => {
        assert.equal(
          (await req("/rooms/join", "POST", { code: plan.invitationCode }, 1))
            .status,
          200,
        );
        assert.equal(
          (await req(`/catalog/${plan.id}`, "GET", undefined, 1)).status,
          200,
        );
        assert.ok(
          (await req("/experiences", "GET", undefined, 1)).data.items.some(
            (p: { id: string }) => p.id === plan.id,
          ),
        );
        assert.equal(
          (
            await req(
              `/rooms/${plan.roomId}/options`,
              "POST",
              { ...option, location: "Otro café" },
              1,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await req(
              `/occurrences/${proposal.occurrenceId}/reservations`,
              "POST",
              undefined,
              1,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await req(
              `/rooms/${plan.roomId}/vote`,
              "PUT",
              { proposalId: proposal.id },
              1,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await req(
              `/rooms/${plan.roomId}/close`,
              "POST",
              { proposalId: proposal.id },
              1,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              `/rooms/${plan.roomId}/close`,
              "POST",
              { proposalId: proposal.id },
              0,
            )
          ).status,
          200,
        );
        assert.equal(
          await prisma.reservation.count({
            where: { occurrenceId: proposal.occurrenceId },
          }),
          0,
        );
        assert.equal(
          (
            await req(
              `/occurrences/${proposal.occurrenceId}/reservations`,
              "POST",
              undefined,
              0,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await req(
              `/occurrences/${proposal.occurrenceId}/reservations`,
              "POST",
              undefined,
              1,
            )
          ).status,
          201,
        );
        assert.equal(
          (await req("/rooms/join", "POST", { code: plan.invitationCode }, 2))
            .status,
          200,
        );
        assert.equal(
          (
            await req(
              `/occurrences/${proposal.occurrenceId}/reservations`,
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
      "Cancelar la fecha libera asistencias y permite volver a decidir",
      async () => {
        assert.equal(
          (
            await req(
              `/occurrences/${proposal.occurrenceId}`,
              "PATCH",
              { status: "CANCELLED" },
              0,
            )
          ).status,
          200,
        );
        const room = await req(`/rooms/${plan.roomId}`, "GET", undefined, 1);
        assert.equal(room.data.closed, false);
        assert.equal(room.data.selectedProposalId, null);
        assert.equal(room.data.myVote, null);
        assert.equal(
          await prisma.reservation.count({
            where: { occurrenceId: proposal.occurrenceId, status: "CONFIRMED" },
          }),
          0,
        );
        assert.equal(
          (
            await req(
              `/rooms/${plan.roomId}/vote`,
              "PUT",
              { proposalId: proposal.id },
              1,
            )
          ).status,
          404,
        );
        assert.equal(
          (await req(`/rooms/${plan.roomId}/options`, "POST", option, 1))
            .status,
          201,
        );
      },
    );
    await t.test(
      "Editar conserva el plan activo y sincroniza el nombre del grupo",
      async () => {
        const edited = await req(
          `/experiences/${plan.id}`,
          "PUT",
          {
            title: "Nuevo nombre",
            description: "",
            category: "Entre amigos",
            subcategoryId: "10000000-0000-4000-8000-000000000010",
          },
          0,
        );
        assert.equal(edited.status, 200);
        assert.equal(edited.data.status, "PUBLISHED");
        assert.equal(
          (await req(`/rooms/${plan.roomId}`, "GET", undefined, 1)).data.name,
          "Nuevo nombre",
        );
        const added = await req(
          `/manage/${plan.id}/occurrences`,
          "POST",
          option,
          0,
        );
        assert.equal(added.status, 201);
        assert.ok(
          (
            await req(`/rooms/${plan.roomId}`, "GET", undefined, 1)
          ).data.proposals.some(
            (p: { occurrence: { id: string } }) =>
              p.occurrence.id === added.data.id,
          ),
        );
      },
    );
    await t.test(
      "Plan público con fecha fija admite invitados sin votación",
      async () => {
        const created = await req(
          "/plans",
          "POST",
          {
            title: prefix + " público",
            schedule: "FIXED",
            visibility: "PUBLIC",
            firstOccurrence: option,
          },
          0,
        );
        assert.equal(created.status, 201);
        const catalog = await req(`/catalog/${created.data.id}`);
        assert.equal(catalog.status, 200);
        assert.equal(catalog.data.group.code, created.data.invitationCode);
        assert.equal(
          (
            await req(
              "/rooms/join",
              "POST",
              { code: created.data.invitationCode },
              1,
            )
          ).status,
          200,
        );
        const room = await req(
          `/rooms/${created.data.roomId}`,
          "GET",
          undefined,
          1,
        );
        assert.equal(room.data.closed, true);
        assert.equal(
          (
            await req(
              `/occurrences/${room.data.proposals[0].occurrence.id}/reservations`,
              "POST",
              undefined,
              1,
            )
          ).status,
          201,
        );
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
