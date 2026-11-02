import { createServer } from "node:http";

import { createApp } from "./app";
import { startDbConnection } from "./config/db";
import { loadEnv } from "./config/env";
import { createLogger } from "./config/logger";

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);

  const stopDb = startDbConnection(env.MONGODB_URI, env.NODE_ENV, logger);
  const app = createApp({ env, logger });
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(env.PORT, () => {
      server.off("error", reject);
      resolve();
    });
  });

  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, "api listening");

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    const forceExit = setTimeout(() => {
      logger.error("graceful shutdown timed out");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await stopDb();
    clearTimeout(forceExit);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("Failed to start API:", error instanceof Error ? error.message : error);
  process.exit(1);
});
