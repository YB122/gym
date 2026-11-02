import { randomUUID } from "node:crypto";

import cors, { type CorsOptions } from "cors";
import express, { type Express, type Request } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import type { AppEnv } from "./config/env";
import type { Logger } from "./config/logger";
import { createHealthRouter } from "./routes/health";
import { createErrorHandler, notFoundHandler } from "./shared/middleware/error-handler";

export interface AppDependencies {
  env: Pick<AppEnv, "APP_VERSION" | "CORS_ORIGIN">;
  logger: Logger;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

function resolveRequestId(req: Request, res: express.Response): string {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  res.setHeader("x-request-id", id);
  return id;
}

export function createApp({ env, logger }: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGIN.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86_400,
  };

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => resolveRequestId(req as Request, res as express.Response),
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) {
          return "error";
        }
        if (res.statusCode >= 400) {
          return "warn";
        }
        return "info";
      },
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
          };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", createHealthRouter(env.APP_VERSION));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
