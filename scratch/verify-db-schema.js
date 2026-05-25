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

async function verify() {
  console.log("=== SUPABASE DATABASE SCHEMA AUDIT ===");
  
  // 1. Column Check
  console.log("\n--- Checking Users Table columns ---");
  const colRes = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name IN ('kyc_status', 'kyc_verified_at', 'razorpay_linked_account_id');
  `);
  
  const kycStatusFound = colRes.rows.some(r => r.column_name === 'kyc_status');
  const kycVerifiedFound = colRes.rows.some(r => r.column_name === 'kyc_verified_at');
  const rpLinkedFound = colRes.rows.some(r => r.column_name === 'razorpay_linked_account_id');
  
  console.log(`[+] kyc_status column: ${kycStatusFound ? "FOUND" : "MISSING"}`);
  console.log(`[+] kyc_verified_at column: ${kycVerifiedFound ? "FOUND" : "MISSING"}`);
  console.log(`[+] razorpay_linked_account_id column: ${rpLinkedFound ? "FOUND" : "MISSING"}`);
  
  const check1 = kycStatusFound && kycVerifiedFound && rpLinkedFound ? "PASS" : "FAIL";
  console.log(`Result: ${check1}`);

  // 2. Enum status check
  console.log("\n--- Checking Escrow Status & Requirement Status Enums ---");
  const enumRes = await pool.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname IN ('escrow_status', 'requirement_status');
  `);
  
  const escrowStatuses = enumRes.rows.filter(r => r.typname === 'escrow_status').map(r => r.enumlabel);
  const requirementStatuses = enumRes.rows.filter(r => r.typname === 'requirement_status').map(r => r.enumlabel);
  
  console.log("[+] escrow_status enum values in DB:", escrowStatuses);
  console.log("[+] requirement_status enum values in DB:", requirementStatuses);
  
  const expectedEscrow = ['held', 'disputed', 'released', 'in_progress'];
  const expectedReq = ['disputed', 'in_progress'];
  
  const escrowPass = expectedEscrow.every(s => escrowStatuses.includes(s));
  const reqPass = expectedReq.every(s => requirementStatuses.includes(s));
  
  const check2 = escrowPass && reqPass ? "PASS" : "FAIL";
  console.log(`Result: ${check2}`);

  // 3. Disputes Table Check
  console.log("\n--- Checking Disputes Table presence ---");
  const tableRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'disputes';
  `);
  
  const disputesExists = tableRes.rows.length > 0;
  console.log(`[+] disputes table exists: ${disputesExists ? "YES" : "NO"}`);
  
  const check3 = disputesExists ? "PASS" : "FAIL";
  console.log(`Result: ${check3}`);

  // 4. RLS Integrity Check
  console.log("\n--- Checking RLS Policies ---");
  const policyRes = await pool.query(`
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE tablename IN ('disputes', 'payments');
  `);
  
  console.log("[+] Active RLS policies found:");
  policyRes.rows.forEach(p => {
    console.log(`    - Table [${p.tablename}]: Policy [${p.policyname}]`);
  });
  
  const paymentsHasPolicy = policyRes.rows.some(r => r.tablename === 'payments');
  
  const check4 = paymentsHasPolicy ? "PASS" : "FAIL";
  console.log(`Result: ${check4}`);

  console.log("\n=== FINAL REPORT ===");
  console.log(`Check 1 (Schema Column Check): ${check1}`);
  console.log(`Check 2 (Enum / Status Check): ${check2}`);
  console.log(`Check 3 (Disputes Table Check): ${check3}`);
  console.log(`Check 4 (RLS Integrity Check): ${check4}`);

  await pool.end();
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
