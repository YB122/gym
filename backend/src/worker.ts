import { loadEnv } from "./config/env";
import { createLogger } from "./config/logger";

const HEARTBEAT_INTERVAL_MS = 30_000;

function main(): void {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL).child({ component: "worker" });

  let running = true;
  const heartbeat = () => {
    if (running) {
      logger.info({ queue: "outbox", pending: 0 }, "worker heartbeat");
    }
  };

  const timer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  logger.info("worker started (placeholder)");
  heartbeat();

  const shutdown = (signal: string): void => {
    if (!running) {
      return;
    }
    running = false;
    clearInterval(timer);
    logger.info({ signal }, "worker stopped");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

try {
  main();
} catch (error) {
  console.error("Failed to start worker:", error instanceof Error ? error.message : error);
  process.exit(1);
}
