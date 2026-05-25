import "./preload-env.js";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { count } from "drizzle-orm";
import { 
  usersTable, 
  requirementsTable, 
  bidsTable, 
  paymentsTable, 
  disputesTable 
} from "@omnibid/db";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be defined.");
  process.exit(1);
}

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool);

async function verifyCounts() {
  console.log("🔍 Fetching live database record counts from Supabase...");
  
  const [usersCount] = await db.select({ value: count() }).from(usersTable);
  const [reqsCount] = await db.select({ value: count() }).from(requirementsTable);
  const [bidsCount] = await db.select({ value: count() }).from(bidsTable);
  const [paymentsCount] = await db.select({ value: count() }).from(paymentsTable);
  const [disputesCount] = await db.select({ value: count() }).from(disputesTable);

  console.log("\n📊 Live Cloud Database Metrics:");
  console.log(`  • Users in Database:        ${usersCount.value}`);
  console.log(`  • Requirements in Database: ${reqsCount.value}`);
  console.log(`  • Bids in Database:         ${bidsCount.value}`);
  console.log(`  • Payments in Database:     ${paymentsCount.value}`);
  console.log(`  • Disputes in Database:     ${disputesCount.value}`);
  
  pool.end();
}

verifyCounts().catch(console.error);
