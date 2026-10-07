import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { app } from "../src/app.js";
import { prisma } from "../src/db.js";

if (new URL(process.env.DATABASE_URL!).pathname !== "/plot_test") {
  throw new Error("Las pruebas solo se ejecutan sobre la base plot_test.");
}

test("Registro, sesiones y CRUD con PostgreSQL real", async t => {
  let server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = () => `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const prefix = `test-${randomUUID()}`;
  const password = "Plot-prueba-2026!";
  const emails = ["owner", "other", "participant"].map(name => `${prefix}-${name}@plot.test`);
  const cookies: string[] = [];
  const userIds: string[] = [];
  let experienceId = "";
  const experience = { title: "Atardecer de prueba", category: "Cultura", description: "Experiencia creada por una prueba funcional." };

  async function request(path: string, method = "GET", body?: unknown, cookie?: string, origin = "http://localhost:3000") {
    const response = await fetch(`${address()}${path}`, {
      method,
      headers: { Origin: origin, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = response.status === 204 ? null : await response.json();
    return { status: response.status, headers: response.headers, payload };
  }

  try {
    await t.test("Sin sesión no se puede leer ni modificar experiencias", async () => {
      for (const [path, method, body] of [
        ["/auth/me", "GET", undefined], ["/experiences", "GET", undefined],
        ["/experiences", "POST", experience], [`/experiences/${randomUUID()}`, "PUT", experience],
        [`/experiences/${randomUUID()}`, "DELETE", undefined],
      ] as const) assert.equal((await request(path, method, body)).status, 401);
    });

    await t.test("Registro valida campos, contraseñas y rol; nunca permite crear administradores", async () => {
      const body = { fullName: "Test", email: emails[0], password, confirmPassword: password, role: "ORGANIZER" };
      for (const change of [{ fullName: "   " }, { email: "no-es-correo" }, { password: "123" }, { confirmPassword: "distinta" }, { role: "ADMIN" }, { extra: "no permitido" }]) {
        assert.equal((await request("/auth/register", "POST", { ...body, ...change })).status, 400);
      }
    });

    await t.test("Registro persiste usuarios con hash y rechaza correos duplicados normalizados", async () => {
      for (let i = 0; i < emails.length; i++) {
        const response = await request("/auth/register", "POST", {
          fullName: `Usuario ${i}`, email: emails[i], password, confirmPassword: password,
          role: i === 2 ? "PARTICIPANT" : "ORGANIZER",
        });
        assert.equal(response.status, 201);
        assert.equal(response.payload.data.passwordHash, undefined);
        userIds.push(response.payload.data.id);
        const stored = await prisma.user.findUniqueOrThrow({ where: { email: emails[i] } });
        assert.notEqual(stored.passwordHash, password);
        assert.match(stored.passwordHash, /^scrypt-v1\$/);
      }
      assert.equal((await request("/auth/register", "POST", {
        fullName: "Duplicado", email: ` ${emails[0].toUpperCase()} `, password, confirmPassword: password,
      })).status, 409);
    });

    await t.test("Login rechaza credenciales incorrectas y crea cookie HttpOnly", async () => {
      assert.equal((await request("/auth/login", "POST", { email: emails[0], password: "incorrecta" })).status, 401);
      for (const email of emails) {
        const response = await request("/auth/login", "POST", { email, password });
        assert.equal(response.status, 200);
        const header = response.headers.get("set-cookie")!;
        assert.match(header, /HttpOnly/i);
        assert.match(header, /SameSite=Lax/i);
        cookies.push(header.split(";")[0]);
        assert.equal(response.payload.data.passwordHash, undefined);
        assert.equal((await request("/auth/me", "GET", undefined, cookies.at(-1))).payload.data.email, email);
      }
      const token = cookies[0].split("=")[1];
      assert.equal(await prisma.session.findUnique({ where: { id: token } }), null);
      assert.ok(await prisma.session.findUnique({ where: { id: createHash("sha256").update(token).digest("hex") } }));
    });

    await t.test("Participantes no pueden acceder al CRUD del organizador", async () => {
      assert.equal((await request("/experiences", "GET", undefined, cookies[2])).status, 403);
      assert.equal((await request("/experiences", "POST", experience, cookies[2])).status, 403);
    });

    await t.test("CRUD completo: crear, listar, consultar y editar con persistencia", async () => {
      const created = await request("/experiences", "POST", experience, cookies[0]);
      assert.equal(created.status, 201);
      experienceId = created.payload.data.id;
      assert.equal(created.payload.data.ownerId, userIds[0]);
      const list = await request("/experiences", "GET", undefined, cookies[0]);
      assert.equal(list.payload.data.total, 1);
      assert.equal(list.payload.data.items[0].id, experienceId);
      assert.equal((await request(`/experiences/${experienceId}`, "GET", undefined, cookies[0])).status, 200);
      const edited = await request(`/experiences/${experienceId}`, "PUT", { ...experience, title: "Título actualizado" }, cookies[0]);
      assert.equal(edited.status, 200);
      assert.equal((await prisma.experience.findUniqueOrThrow({ where: { id: experienceId } })).title, "Título actualizado");
    });

    await t.test("Otro organizador no puede consultar, editar ni eliminar una experiencia ajena", async () => {
      assert.equal((await request("/experiences", "GET", undefined, cookies[1])).payload.data.total, 0);
      for (const method of ["GET", "PUT", "DELETE"]) {
        assert.equal((await request(`/experiences/${experienceId}`, method, method === "PUT" ? experience : undefined, cookies[1])).status, 404);
      }
      assert.equal((await prisma.experience.findUniqueOrThrow({ where: { id: experienceId } })).title, "Título actualizado");
    });

    await t.test("Validaciones bloquean campos vacíos, categoría inválida e inyección de propietario", async () => {
      for (const change of [{ title: " " }, { description: " " }, { title: "a".repeat(101) }, { category: "Otra" }, { ownerId: userIds[1] }]) {
        assert.equal((await request("/experiences", "POST", { ...experience, ...change }, cookies[0])).status, 400);
      }
      assert.equal((await request("/experiences/no-uuid", "GET", undefined, cookies[0])).status, 400);
      assert.equal((await request("/experiences?page=0", "GET", undefined, cookies[0])).status, 400);
      assert.equal((await request("/experiences?pageSize=100", "GET", undefined, cookies[0])).status, 400);
    });

    await t.test("Las escrituras rechazan un origen distinto o ausente", async () => {
      assert.equal((await request("/experiences", "POST", experience, cookies[0], "https://otro.example")).status, 403);
      assert.equal((await request("/auth/logout", "POST", undefined, cookies[0], "")).status, 403);
    });

    await t.test("La paginación conserva todos los registros sin repetirlos", async () => {
      for (let i = 0; i < 5; i++) assert.equal((await request("/experiences", "POST", { ...experience, title: `Paginada ${i}` }, cookies[0])).status, 201);
      const first = (await request("/experiences?page=1&pageSize=5", "GET", undefined, cookies[0])).payload.data;
      const second = (await request("/experiences?page=2&pageSize=5", "GET", undefined, cookies[0])).payload.data;
      assert.equal(first.total, 6);
      assert.equal(first.items.length, 5);
      assert.equal(second.items.length, 1);
      assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 6);
    });

    await t.test("Sesión y datos sobreviven al reinicio del servidor HTTP", async () => {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      server = app.listen(0, "127.0.0.1");
      await once(server, "listening");
      assert.equal((await request("/auth/me", "GET", undefined, cookies[0])).status, 200);
      assert.equal((await request(`/experiences/${experienceId}`, "GET", undefined, cookies[0])).payload.data.title, "Título actualizado");
    });

    await t.test("Eliminar borra el registro y una segunda eliminación devuelve 404", async () => {
      assert.equal((await request(`/experiences/${experienceId}`, "DELETE", undefined, cookies[0])).status, 204);
      assert.equal(await prisma.experience.findUnique({ where: { id: experienceId } }), null);
      assert.equal((await request(`/experiences/${experienceId}`, "DELETE", undefined, cookies[0])).status, 404);
    });

    await t.test("Una sesión vencida no autoriza peticiones", async () => {
      await prisma.session.updateMany({ where: { userId: userIds[1] }, data: { expiresAt: new Date(0) } });
      assert.equal((await request("/auth/me", "GET", undefined, cookies[1])).status, 401);
    });

    await t.test("Cerrar sesión invalida la cookie anterior y permite repetir el cierre", async () => {
      assert.equal((await request("/auth/logout", "POST", undefined, cookies[0])).status, 204);
      assert.equal((await request("/auth/me", "GET", undefined, cookies[0])).status, 401);
      assert.equal((await request("/auth/logout", "POST", undefined, cookies[0])).status, 204);
    });

    await t.test("El login limita los intentos repetidos", async () => {
      let status = 0;
      for (let i = 0; i < 21 && status !== 429; i++) {
        status = (await request("/auth/login", "POST", { email: emails[0], password: "incorrecta" })).status;
      }
      assert.equal(status, 429);
    });
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
