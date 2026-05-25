import "./preload-env.js";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be defined.");
  process.exit(1);
}

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runViewsScript() {
  const sqlPath = path.resolve(__dirname, "../../../drizzle/migrations/analytics_views.sql");
  console.log(`📖 Reading SQL views from: ${sqlPath}`);
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("⚡ Executing SQL script on live Supabase database...");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("🎉 Views created successfully on live database!");
  } catch (err) {
    console.error("❌ Failed to create views:", err);
  } finally {
    client.release();
    pool.end();
  }
}

runViewsScript().catch(console.error);
