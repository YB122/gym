import mongoose from "mongoose";

import type { Logger } from "./logger";

const RETRY_DELAY_MS = 5_000;

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDb(uri: string, nodeEnv: string): Promise<void> {
  await mongoose.connect(uri, {
    autoIndex: nodeEnv === "development",
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Starts the API without blocking on Mongo. The health endpoint reports 503
 * until the connection succeeds; failed attempts are retried with a fixed
 * delay. Returns an idempotent stop function.
 */
export function startDbConnection(uri: string, nodeEnv: string, logger: Logger): () => Promise<void> {
  let stopped = false;
  let connecting = false;
  let retryTimer: NodeJS.Timeout | undefined;

  const scheduleRetry = () => {
    if (stopped || retryTimer) {
      return;
    }
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void attempt();
    }, RETRY_DELAY_MS);
  };

  const attempt = async (): Promise<void> => {
    if (stopped || connecting || mongoose.connection.readyState === 1) {
      return;
    }

    connecting = true;
    try {
      await connectDb(uri, nodeEnv);
      logger.info({ db: mongoose.connection.name }, "mongodb connected");
    } catch (error) {
      logger.error({ err: error, retryInMs: RETRY_DELAY_MS }, "mongodb connection failed");
      scheduleRetry();
    } finally {
      connecting = false;
    }
  };

  mongoose.connection.on("disconnected", () => {
    if (!stopped) {
      logger.warn("mongodb disconnected");
      scheduleRetry();
    }
  });

  void attempt();

  return async () => {
    stopped = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
    await disconnectDb();
  };
}
