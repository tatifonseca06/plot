import { app } from "./app.js";
import { prisma } from "./db.js";
import { config } from "./config.js";

const port = config.PORT;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un número entero entre 1 y 65535.");
}

await prisma.$connect();
const server = app.listen(port, () => {
  console.log(`API de Plot disponible en http://localhost:${port}/api/health`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
