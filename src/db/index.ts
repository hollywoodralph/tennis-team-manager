// Database client — lazy initialization for better-sqlite3 / postgres
// Works with both local Postgres (DATABASE_URL=postgres://...) and a stub
// in-memory store when no DB is configured (development fallback).
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __pg_client: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __pg_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to Railway env vars or a .env.local file. " +
      "Get a free Postgres at https://railway.app/ or https://neon.tech/."
    );
  }
  if (!global.__pg_client) {
    global.__pg_client = postgres(url, { prepare: false, max: 5 });
  }
  if (!global.__pg_db) {
    global.__pg_db = drizzle(global.__pg_client, { schema });
  }
  return global.__pg_db;
}

export { schema };
