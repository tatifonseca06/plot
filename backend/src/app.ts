import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", healthRouter);

app.use((_request, response) => {
  response.status(404).json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
});

const handleError: express.ErrorRequestHandler = (error, _request, response, _next) => {
  if (error.type === "entity.parse.failed") {
    response.status(400).json({ error: { code: "INVALID_JSON", message: "El JSON no es válido." } });
    return;
  }
  if (error.type === "entity.too.large") {
    response.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "La solicitud es demasiado grande." } });
    return;
  }
  console.error(error);
  response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Ocurrió un error interno." } });
};

app.use(handleError);
