import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, "use at least 32 characters"),
  JWT_ISSUER: z.string().default("my-api"),
  JWT_AUDIENCE: z.string().default("my-app"),
  ACCESS_TTL_SEC: z.coerce.number().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().default(14),
  ALLOWED_ORIGINS: z
    .string()
    .transform((s) => s.split(",").map((o) => o.trim())),
});

export const env = schema.parse(process.env); // crashes at boot if config is wrong
