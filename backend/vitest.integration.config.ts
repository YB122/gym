import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    // The first run downloads a mongod binary for MongoMemoryReplSet.
    testTimeout: 120_000,
    hookTimeout: 600_000,
  },
});
