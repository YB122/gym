import { Router } from "express";
import { healthResponseSchema } from "../shared/contracts";

import { isDbConnected } from "../config/db";

export function createHealthRouter(version: string): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const connected = isDbConnected();
    const payload = healthResponseSchema.parse({
      status: connected ? "ok" : "degraded",
      db: connected ? "ok" : "down",
      version,
    });

    res.status(connected ? 200 : 503).json(payload);
  });

  return router;
}
