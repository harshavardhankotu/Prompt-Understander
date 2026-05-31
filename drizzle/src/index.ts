import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config(); // fallback

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL must be set to run queries. Database connection is deferred.");
}

export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL }) 
  : undefined;

export const db = pool 
  ? drizzle(pool as any, { schema }) 
  : undefined as any;

export * from "./schema";
