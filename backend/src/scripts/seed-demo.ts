import { connectDb, disconnectDb } from "../config/db";
import { loadEnv } from "../config/env";

async function main(): Promise<void> {
  const env = loadEnv();
  await connectDb(env.MONGODB_URI, env.NODE_ENV);
  console.warn("[seed:demo] Demo data is introduced with classes and bookings in Phase 2.");
  await disconnectDb();
}

main().catch(async (error: unknown) => {
  console.error("Demo seed failed:", error instanceof Error ? error.message : error);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
