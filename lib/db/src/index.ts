import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export const isDatabaseConfigured = Boolean(connectionString);
export const pool = new Pool(
  connectionString ? { connectionString } : undefined,
);
export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
