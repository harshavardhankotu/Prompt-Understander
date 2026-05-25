process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function applyRLS() {
  console.log("Applying RLS policies to live cloud database...");
  
  // 1. Payments Table
  await pool.query("ALTER TABLE payments ENABLE ROW LEVEL SECURITY;");
  await pool.query("DROP POLICY IF EXISTS select_payments ON payments;");
  await pool.query(`
    CREATE POLICY select_payments ON payments 
    FOR SELECT 
    TO authenticated 
    USING (buyer_id = auth.uid() OR provider_id = auth.uid());
  `);
  console.log("[✓] Payments RLS applied successfully.");

  // 2. Disputes Table
  await pool.query("ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;");
  await pool.query("DROP POLICY IF EXISTS select_disputes ON disputes;");
  await pool.query(`
    CREATE POLICY select_disputes ON disputes 
    FOR SELECT 
    TO authenticated 
    USING (raised_by_id = auth.uid() OR respondent_id = auth.uid());
  `);
  console.log("[✓] Disputes RLS applied successfully.");

  await pool.end();
}

applyRLS().catch(console.error);
