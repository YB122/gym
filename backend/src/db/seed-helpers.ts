import type { Model } from "mongoose";

/**
 * Idempotent seed primitive. Every seed script upserts on a natural key so it
 * can be run repeatedly without duplicating documents.
 */
export async function upsertSeedDocument<T>(
  model: Model<T>,
  filter: Parameters<Model<T>["updateOne"]>[0],
  update: Parameters<Model<T>["updateOne"]>[1],
): Promise<void> {
  await model.updateOne(filter, update, { upsert: true, setDefaultsOnInsert: true }).exec();
}
