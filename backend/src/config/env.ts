import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

const envFileCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
  path.resolve(process.cwd(), "..", "..", ".env"),
];

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  APP_VERSION: z.string().min(1).default("0.1.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MONGODB_URI: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    ),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1, "CORS_ORIGIN must contain at least one origin")),
  WEB_URL: z.url().default("http://localhost:3000"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}

/** Loads `.env` from the workspace or repo root, then validates it. */
export function loadEnv(): AppEnv {
  dotenv.config({ path: envFileCandidates, quiet: true });
  return parseEnv(process.env);
}
