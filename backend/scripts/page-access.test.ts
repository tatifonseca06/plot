import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createSession } from "../src/middleware/auth.js";
import { safeReturnTo } from "../../frontend/src/lib/return-to.js";

if (new URL(process.env.DATABASE_URL!).pathname !== "/plot_test")
  throw new Error("Solo plot_test");

test("Retorno tras login admite únicamente rutas internas conocidas", () => {
  for (const bad of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/admin?next=https://evil.test",
    "/desconocida",
    "/salas/../admin",
  ])
    assert.equal(safeReturnTo(bad), "/experiencias");
  for (const path of [
    "/admin",
    "/moderacion",
    "/salas",
    `/salas/${randomUUID()}`,
    `/unirse/${"a".repeat(20)}`,
  ])
    assert.equal(safeReturnTo(path), path);
});

test("Páginas privadas: sesión real y permisos antes de renderizar", async (t) => {
  const backend = app.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const api = `http://127.0.0.1:${(backend.address() as { port: number }).port}`;
  const portFinder = createServer();
  portFinder.listen(0, "127.0.0.1");
  await once(portFinder, "listening");
  const port = (portFinder.address() as { port: number }).port;
  await new Promise<void>((resolve) => portFinder.close(() => resolve()));
  const frontendRoot = fileURLToPath(
    new URL("../../frontend/", import.meta.url),
  );
  const frontend = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: frontendRoot,
      env: { ...process.env, NODE_ENV: "production", API_URL: api },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  frontend.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  frontend.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  const ids: string[] = [];
  const base = `http://127.0.0.1:${port}`;
  const request = (path: string, cookie?: string) =>
    fetch(base + path, {
      redirect: "manual",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        "User-Agent": "access-test",
      },
    });
  function expectLogin(r: Response, path: string) {
    assert.equal(r.status, 307);
    assert.equal(
      r.headers.get("location"),
      `/?next=${encodeURIComponent(path)}`,
    );
  }
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await request("/")).ok) {
          ready = true;
          break;
        }
      } catch {}
      if (frontend.exitCode !== null) throw new Error(logs);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, logs);
    const participant = await prisma.user.create({
      data: {
        fullName: "Page participant",
        email: `${randomUUID()}@plot.test`,
        passwordHash: "unused",
        role: "PARTICIPANT",
      },
    });
    ids.push(participant.id);
    const admin = await prisma.user.create({
      data: {
        fullName: "Page admin",
        email: `${randomUUID()}@plot.test`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    ids.push(admin.id);
    const memberCookie = `plot_session=${await createSession(participant.id)}`,
      adminCookie = `plot_session=${await createSession(admin.id)}`;
    const routes = [
      "/experiencias",
      "/experiencias/nueva",
      `/experiencias/${randomUUID()}/editar`,
      `/gestionar/${randomUUID()}`,
      "/salas",
      `/salas/${randomUUID()}`,
      "/reservas",
      "/admin",
      "/moderacion",
    ];
    await t.test(
      "Sin sesión, todas las páginas privadas redirigen al login",
      async () => {
        for (const path of routes) expectLogin(await request(path), path);
      },
    );
    await t.test(
      "Cookie inventada, malformada o caducada no abre páginas",
      async () => {
        for (const token of ["invalid", "a".repeat(64)])
          expectLogin(
            await request("/experiencias", `plot_session=${token}`),
            "/experiencias",
          );
        const expired = await createSession(participant.id);
        await prisma.session.update({
          where: { id: createHash("sha256").update(expired).digest("hex") },
          data: { expiresAt: new Date(0) },
        });
        expectLogin(
          await request("/salas", `plot_session=${expired}`),
          "/salas",
        );
      },
    );
    await t.test(
      "Usuario normal entra a sus páginas y no al panel administrativo",
      async () => {
        for (const path of ["/experiencias", "/salas", "/reservas"])
          assert.equal((await request(path, memberCookie)).status, 200);
        for (const path of ["/admin", "/moderacion"]) {
          const r = await request(path, memberCookie);
          assert.equal(r.status, 307);
          assert.equal(r.headers.get("location"), "/experiencias");
        }
      },
    );
    await t.test(
      "Administrador conserva acceso a administración y moderación",
      async () => {
        for (const path of ["/admin", "/moderacion"])
          assert.equal((await request(path, adminCookie)).status, 200);
      },
    );
    await t.test(
      "Login, registro, catálogo e invitación son públicos; una ruta inventada es 404",
      async () => {
        for (const path of [
          "/",
          "/registro",
          "/catalogo",
          `/unirse/${"a".repeat(20)}`,
        ])
          assert.equal((await request(path)).status, 200);
        assert.equal((await request("/esta-pagina-no-existe")).status, 404);
      },
    );
  } finally {
    frontend.kill("SIGTERM");
    if (frontend.exitCode === null) await once(frontend, "exit");
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await new Promise<void>((resolve) => backend.close(() => resolve()));
    await prisma.$disconnect();
  }
});
