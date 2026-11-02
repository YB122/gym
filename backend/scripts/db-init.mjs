/**
 * Initialise the local single-node MongoDB replica set.
 *
 * Transactions require a replica set, so this runs `replSetInitiate` against
 * the Docker Mongo instance. It is idempotent: an already-initialised set is
 * treated as success.
 */
import path from "node:path";

import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({
  path: [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "..", ".env")],
  quiet: true,
});

const DEFAULT_URI = "mongodb://localhost:27017/gym?replicaSet=rs0";
const uri = process.env.MONGODB_URI ?? DEFAULT_URI;
const REPLICA_SET = "rs0";
const HOST = "localhost:27017";
const PRIMARY_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

function fail(message) {
  console.error(`[db:init] ${message}`);
  process.exit(1);
}

function parseLocalUri(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(`MONGODB_URI is not a valid URL: ${raw}`);
  }

  if (url.protocol !== "mongodb:") {
    fail("db:init only supports a local mongodb:// URI. Use Atlas tooling for Atlas.");
  }

  const hostname = url.hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    fail(`db:init refuses non-local host "${hostname}".`);
  }

  return {
    host: `${hostname === "::1" ? "[::1]" : hostname}:${url.port || "27017"}`,
    database: url.pathname.slice(1) || "gym",
  };
}

const { host, database } = parseLocalUri(uri);
const directUri = `mongodb://${host}/${database}?directConnection=true`;

const client = new MongoClient(directUri, { serverSelectionTimeoutMS: 10_000 });

try {
  await client.connect();
  const admin = client.db("admin");

  try {
    const result = await admin.command({
      replSetInitiate: {
        _id: REPLICA_SET,
        members: [{ _id: 0, host: HOST }],
      },
    });
    console.log(`[db:init] replica set "${REPLICA_SET}" initiated`, result);
  } catch (error) {
    const code = error?.code;
    const message = error instanceof Error ? error.message : String(error);
    if (code === 23 || /already initialized/i.test(message)) {
      console.log(`[db:init] replica set "${REPLICA_SET}" already initialised`);
    } else {
      throw error;
    }
  }

  const deadline = Date.now() + PRIMARY_TIMEOUT_MS;
  let primary = false;
  while (Date.now() < deadline) {
    try {
      const hello = await admin.command({ hello: 1 });
      if (hello.isWritablePrimary || hello.ismaster) {
        primary = true;
        break;
      }
    } catch {
      // The set is still electing; poll again.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  if (!primary) {
    fail(`replica set did not elect a primary within ${PRIMARY_TIMEOUT_MS / 1000}s`);
  }

  console.log(`[db:init] "${REPLICA_SET}" is ready at ${host}/${database}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await client.close();
}
