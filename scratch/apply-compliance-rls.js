import pg from 'pg';

async function applyComplianceRLS() {
  const connectionString = "postgresql://postgres.mrjmsmhhzkinvmljxqsk:RYPX99p9MtV0u349@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";
  
  const sql = `
    -- 1. Enable Row Level Security (RLS) on compliance_vault table
    ALTER TABLE compliance_vault ENABLE ROW LEVEL SECURITY;

    -- 2. Drop existing policies to prevent conflicts
    DROP POLICY IF EXISTS select_compliance_vault ON compliance_vault;
    DROP POLICY IF EXISTS mutate_compliance_vault ON compliance_vault;

    -- 3. Create SELECT policy: Only the owner can select their vault record
    CREATE POLICY select_compliance_vault ON compliance_vault
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    -- 4. Create MUTATE policy: Only the owner can insert, update or delete their vault record
    CREATE POLICY mutate_compliance_vault ON compliance_vault
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  `;

  console.log("Connecting to Supabase cloud database to apply RLS on compliance_vault...");
  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected successfully. Running SQL script...");
    await client.query(sql);
    console.log("🎉 SUCCESS! RLS policies successfully applied to the compliance_vault table!");
  } catch (err) {
    console.error("❌ Failed to apply compliance RLS policies:", err.message);
  } finally {
    await client.end();
  }
}

applyComplianceRLS();
