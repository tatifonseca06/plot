import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes.js";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./config.js";
import { HttpError } from "./errors.js";
import { authRouter } from "./routes/auth.routes.js";
import { experienceRouter } from "./routes/experience.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
app.use((request, _response, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.origin !== config.FRONTEND_URL
  ) {
    throw new HttpError(
      403,
      "INVALID_ORIGIN",
      "Origen de la solicitud no permitido.",
    );
  }
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/experiences", experienceRouter);

app.use((_request, response) => {
  response
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
});

const handleError: express.ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response
      .status(400)
      .json({
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Revisa los datos.",
          fields: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    return;
  }
  if (error instanceof HttpError) {
    response
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error.code === "P2002") {
    response
      .status(409)
      .json({
        error: {
          code: "EMAIL_IN_USE",
          message: "Ya existe una cuenta con ese correo.",
        },
      });
    return;
  }
  if (error.code === "P2025") {
    response
      .status(404)
      .json({
        error: { code: "NOT_FOUND", message: "Experiencia no encontrada." },
      });
    return;
  }
  if (error.type === "entity.parse.failed") {
    response
      .status(400)
      .json({
        error: { code: "INVALID_JSON", message: "El JSON no es válido." },
      });
    return;
  }
  if (error.type === "entity.too.large") {
    response
      .status(413)
      .json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "La solicitud es demasiado grande.",
        },
      });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({
      error: { code: "INTERNAL_ERROR", message: "Ocurrió un error interno." },
    });
};

app.use(handleError);
