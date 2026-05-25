import "./preload-env.js";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be defined.");
  process.exit(1);
}

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyViews() {
  console.log("🔍 Checking live SQL views on Supabase...");
  const client = await pool.connect();
  try {
    const resFinancials = await client.query("SELECT * FROM vw_platform_financials LIMIT 3;");
    console.log("\n📈 vw_platform_financials (Sample):");
    console.table(resFinancials.rows);

    const resSector = await client.query("SELECT * FROM vw_sector_analytics;");
    console.log("\n📊 vw_sector_analytics (All Sectors):");
    console.table(resSector.rows);

    const resTrust = await client.query("SELECT * FROM vw_trust_and_disputes;");
    console.log("\n🛡️ vw_trust_and_disputes (All Sectors):");
    console.table(resTrust.rows);
  } catch (err) {
    console.error("❌ View verification failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

verifyViews().catch(console.error);
