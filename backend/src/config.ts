import "dotenv/config";
import { z } from "zod";

export const config = z
  .object({
    DATABASE_URL: z.string().url(),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .parse(process.env);
