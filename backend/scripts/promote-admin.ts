import "dotenv/config";
import { z } from "zod";
import { prisma } from "../src/db.js";

// Explicit maintenance command; never exposed through the public API.
try {
  const email = z.email().parse(process.argv[2]?.trim().toLowerCase());
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    throw new Error("Primero registra esa cuenta desde la aplicación.");
  if (user.role === "ORGANIZER")
    throw new Error(
      "Usa una cuenta de participante independiente para administrar y conservar el acceso del organizador a su CRUD.",
    );
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log("La cuenta indicada ahora tiene rol de administrador.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "No se pudo cambiar el rol.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
