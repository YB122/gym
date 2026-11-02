import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/app";
import { parseEnv } from "../../src/config/env";
import { createLogger } from "../../src/config/logger";

let replSet: MongoMemoryReplSet | undefined;
let mongoUri = "";

function buildApp() {
  const env = parseEnv({
    NODE_ENV: "test",
    PORT: "0",
    APP_VERSION: "0.1.0",
    LOG_LEVEL: "silent",
    MONGODB_URI: mongoUri,
    CORS_ORIGIN: "http://localhost:3000",
    WEB_URL: "http://localhost:3000",
  });

  return createApp({ env, logger: createLogger("silent") });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  mongoUri = replSet.getUri();
  await mongoose.connect(mongoUri, { autoIndex: false });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe("GET /api/health", () => {
  it("returns 200 with db ok and a request id", async () => {
    const response = await request(buildApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", db: "ok", version: "0.1.0" });
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.headers["content-type"]).toContain("application/json");
  });

  it("returns 404 with the error envelope for unknown routes", async () => {
    const response = await request(buildApp()).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error).toHaveProperty("requestId");
  });

  it("returns 503 when MongoDB is unavailable", async () => {
    await mongoose.disconnect();

    try {
      const response = await request(buildApp()).get("/api/health");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: "degraded", db: "down", version: "0.1.0" });
    } finally {
      await mongoose.connect(mongoUri, { autoIndex: false });
    }
  });
});
