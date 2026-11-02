// Side-effect import: must run before the contracts create any schema.
import "./openapi-setup";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Import the ESM build explicitly: the package has no `exports` map, so a bare
 * specifier resolves to the CJS build and patches a second zod instance.
 * See `src/types/zod-to-openapi-esm.d.ts`.
 */
import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi/dist/index.mjs";

import { apiErrorSchema, healthResponseSchema } from "../shared/contracts";

const registry = new OpenAPIRegistry();

registry.register("HealthResponse", healthResponseSchema);
registry.register("ApiError", apiErrorSchema);

registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "API and database health",
  description: "Returns 200 when the API and MongoDB are reachable, 503 when the database is down.",
  tags: ["system"],
  responses: {
    200: {
      description: "Healthy",
      content: { "application/json": { schema: healthResponseSchema } },
    },
    503: {
      description: "Database unavailable",
      content: { "application/json": { schema: healthResponseSchema } },
    },
    500: {
      description: "Unexpected error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

const generator = new OpenApiGeneratorV31(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "FORGE Gym API",
    version: "0.1.0",
    description: "REST API for the FORGE Strength Club platform.",
  },
  servers: [{ url: "http://localhost:4000", description: "Local development" }],
});

const cwd = process.cwd();
const repoRoot = path.basename(cwd) === "backend" ? path.resolve(cwd, "..") : cwd;
const outputPath = path.join(repoRoot, "openapi.json");
const serialized = `${JSON.stringify(document, null, 2)}\n`;
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  if (!existsSync(outputPath)) {
    console.error(`[openapi] ${outputPath} is missing. Run npm run openapi:generate.`);
    process.exit(1);
  }

  const current = readFileSync(outputPath, "utf8");
  if (current !== serialized) {
    console.error("[openapi] openapi.json is out of date. Run npm run openapi:generate.");
    process.exit(1);
  }

  console.warn("[openapi] openapi.json is up to date.");
} else {
  writeFileSync(outputPath, serialized, "utf8");
  console.warn(`[openapi] wrote ${outputPath}`);
}
