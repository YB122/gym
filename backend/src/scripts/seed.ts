import { connectDb, disconnectDb } from "../config/db";
import { loadEnv } from "../config/env";

async function main(): Promise<void> {
  const env = loadEnv();
  await connectDb(env.MONGODB_URI, env.NODE_ENV);
  console.warn(
    "[seed] Phase 0 baseline: no domain data yet. Locations and plans are added in later phases.",
  );
  await disconnectDb();
}

main().catch(async (error: unknown) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
