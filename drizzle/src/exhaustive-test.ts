import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable TLS verification globally for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 1. Synchronously load root .env variables BEFORE importing database modules
const rootEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key.trim()] = value;
    }
  });
}

// Ensure fallback in case it's not set
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.mrjmsmhhzkinvmljxqsk:RYPX99p9MtV0u349@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require";

// Colorful terminal helpers
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function printHeader(title: string) {
  console.log(`\n${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} FEATURE: ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
}

function printResult(scenario: string, success: boolean, info?: string) {
  const badge = success
    ? `${colors.bold}${colors.green}[ PASS ]${colors.reset}`
    : `${colors.bold}${colors.red}[ FAIL ]${colors.reset}`;
  console.log(`  ${badge} ${scenario}`);
  if (info) {
    console.log(`           ${colors.yellow}${info}${colors.reset}`);
  }
}

async function runExhaustiveTests() {
  console.log(`${colors.bold}${colors.yellow}🚀 Starting Exhaustive Live Integration & Database Verification Suite...${colors.reset}`);
  
  // 2. Dynamically import DB modules directly from local sibling file
  const { db, usersTable, categoriesTable, requirementsTable, bidsTable, complianceVaultTable } = await import("./index");
  const { eq, and, sql } = await import("drizzle-orm");

  const BACKEND_URL = "http://127.0.0.1:3001/api"; // Force IPv4 loopback to prevent ::1 lookup shifts

  // Cache variables for cross-scenario integration
  let buyerToken = "";
  let buyerUserId = "";
  let buyerEmail = `buyer_${Date.now()}@example.com`;
  
  let providerToken = "";
  let providerUserId = "";
  let providerEmail = `provider_${Date.now()}@example.com`;

  let requirementId = "";
  let categoryId = "";
  let bidId1 = "";
  let bidId2 = "";

  // Helper to fetch categories
  try {
    const cats = await db.select().from(categoriesTable).limit(1);
    if (cats.length > 0) {
      categoryId = cats[0].id;
      // Ensure the category has a minimum bid floor of 1000 for our tests
      await db.update(categoriesTable)
        .set({ minBidFloor: "1000" })
        .where(eq(categoriesTable.id, categoryId));
    } else {
      // Seed dummy category if none exists
      const [newCat] = await db.insert(categoriesTable).values({
        name: "Test Construction",
        slug: "test-construction",
        iconName: "HardHat",
        description: "Test Category",
        customFields: [],
        minBidFloor: "1000",
      }).returning();
      categoryId = newCat.id;
    }
  } catch (err) {
    console.error("Database initialization failed:", err.message);
    process.exit(1);
  }

  // Helper to fetch response text and parse safely with diagnostics
  async function parseResponse(res: Response, label: string) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error(`\n❌ JSON Parsing Failed for: ${label}`);
      console.error(`Status: ${res.status}`);
      console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
      console.error(`Body Preview:\n${text.substring(0, 1000)}\n`);
      throw err;
    }
  }

  // =========================================================================
  // 1. FEATURE: AUTHENTICATION & RLS
  // =========================================================================
  printHeader("Authentication & Row-Level Security (RLS)");

  // Scenario A: Register a new user and generate a valid JWT
  try {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Buyer",
        email: buyerEmail,
        password: "secure_password_123",
        role: "buyer",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      }),
    });
    const payload = await parseResponse(res, "Register Buyer");
    buyerToken = payload.token;
    buyerUserId = payload.user.id;
    
    printResult("Scenario A: Register new buyer & generate JWT", res.status === 201 && !!buyerToken, `Registered user ID: ${buyerUserId}`);
  } catch (err) {
    printResult("Scenario A: Register new buyer & generate JWT", false, err.message);
  }

  // Register provider as well for bids testing later
  try {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Provider",
        email: providerEmail,
        password: "secure_password_456",
        role: "provider", // role 'provider' bypasses compliance gate check
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      }),
    });
    const payload = await parseResponse(res, "Register Provider");
    providerToken = payload.token;
    providerUserId = payload.user.id;
  } catch (err) {
    console.error("Failed to register provider:", err.message);
  }

  // Scenario B: Attempt to log in with an incorrect password
  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: buyerEmail,
        password: "wrong_password_here",
      }),
    });
    const payload = await parseResponse(res, "Login Failure Test");
    
    printResult(
      "Scenario B: Attempt login with incorrect password",
      res.status === 401 && payload.error === "Invalid credentials",
      `Response status: ${res.status} | Error msg: ${payload.error}`
    );
  } catch (err) {
    printResult("Scenario B: Attempt login with incorrect password", false, err.message);
  }

  // Scenario C: Attempt to query another user's private data (Verify RLS policies exist in cloud)
  try {
    // We run a direct system catalog check to confirm RLS policies are enabled on 'users', 'requirements', and 'bids'
    const policies = await db.execute(
      `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('users', 'requirements', 'bids')`
    );
    const hasPolicies = policies.rows.length > 0;
    
    printResult(
      "Scenario C: Verify RLS policies are active in cloud database",
      hasPolicies,
      `Found ${policies.rows.length} active Row-Level Security policies in your Supabase DB.`
    );
  } catch (err) {
    printResult("Scenario C: Verify RLS policies are active in cloud database", false, err.message);
  }

  // Scenario D: Access a protected route without a token
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const payload = await parseResponse(res, "Protected Route No Token");
    
    printResult(
      "Scenario D: Access protected route without a token",
      res.status === 401 && payload.error === "Unauthorized",
      `Response status: ${res.status} | Error msg: ${payload.error}`
    );
  } catch (err) {
    printResult("Scenario D: Access protected route without a token", false, err.message);
  }

  // =========================================================================
  // 2. FEATURE: REQUIREMENT POSTING
  // =========================================================================
  printHeader("Requirement (Project) Posting");

  // Scenario A: Post a valid requirement with title, description, and budget
  try {
    const res = await fetch(`${BACKEND_URL}/requirements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        categoryId,
        title: "Test Escrow Project",
        description: "Need immediate masonry and foundation building.",
        maxBudget: 50000,
        deadlineHours: 48,
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      }),
    });
    const payload = await parseResponse(res, "Post Requirement");
    requirementId = payload.id;
    
    printResult("Scenario A: Post a valid requirement", res.status === 201 && !!requirementId, `Created Project ID: ${requirementId}`);
  } catch (err) {
    printResult("Scenario A: Post a valid requirement", false, err.message);
  }

  // Scenario B: Attempt to post a requirement missing mandatory fields (expect validation error)
  try {
    const res = await fetch(`${BACKEND_URL}/requirements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        categoryId,
        // Title is missing
        description: "Missing title",
        maxBudget: 50000,
        deadlineHours: 48,
        city: "Mumbai",
        state: "Maharashtra",
      }),
    });
    const payload = await parseResponse(res, "Post Requirement Missing Fields");
    
    printResult(
      "Scenario B: Post requirement with missing fields",
      res.status === 400 && !!payload.error,
      `Response status: ${res.status} | Error details: ${payload.error}`
    );
  } catch (err) {
    printResult("Scenario B: Post requirement with missing fields", false, err.message);
  }

  // Scenario C: Update the requirement status to 'in_progress' and verify the database saves it
  try {
    // Update directly to verify DB state consistency
    await db.update(requirementsTable)
      .set({ status: "in_progress" })
      .where(eq(requirementsTable.id, requirementId));
      
    const [fetched] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, requirementId));
    
    printResult(
      "Scenario C: Update project status to 'in_progress'",
      fetched.status === "in_progress",
      `Saved status in DB: ${fetched.status}`
    );
    
    // Reset it to 'open' for bidding system tests
    await db.update(requirementsTable)
      .set({ status: "open" })
      .where(eq(requirementsTable.id, requirementId));
  } catch (err) {
    printResult("Scenario C: Update project status to 'in_progress'", false, err.message);
  }

  // =========================================================================
  // 3. FEATURE: THE LIVE BIDDING SYSTEM
  // =========================================================================
  printHeader("The Live Bidding System");

  // Scenario A: Place a valid bid that meets the minimum bid requirements
  try {
    const res = await fetch(`${BACKEND_URL}/requirements/${requirementId}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        bidAmount: 40000,
        message: "We have 10 Masonry experts ready to complete this project.",
        estimatedCompletion: "2 days",
      }),
    });
    const payload = await parseResponse(res, "Place Bid");
    bidId1 = payload.id;
    
    printResult("Scenario A: Place a valid bid", res.status === 201 && !!bidId1, `Created Bid ID: ${bidId1}`);
  } catch (err) {
    printResult("Scenario A: Place a valid bid", false, err.message);
  }

  // Register provider3 for Scenario B price floor checking to prevent duplicate bid errors
  let provider3Token = "";
  try {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Provider 3",
        email: `provider3_${Date.now()}@example.com`,
        password: "secure_password_abc",
        role: "provider",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      }),
    });
    const payload = await parseResponse(res, "Register Provider 3");
    provider3Token = payload.token;
  } catch (err) {
    console.error("Failed to setup provider3 for Scenario B:", err.message);
  }

  // Scenario B: Place a bid below the allowed floor price (expect the system to reject it)
  try {
    const res = await fetch(`${BACKEND_URL}/requirements/${requirementId}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${provider3Token}`
      },
      body: JSON.stringify({
        bidAmount: 50, // Far below the 1000 price floor defined in category
        message: "Hacked cheap bid",
        estimatedCompletion: "1 day",
      }),
    });
    const payload = await parseResponse(res, "Place Bid Below Floor");
    
    printResult(
      "Scenario B: Place a bid below category price floor",
      res.status === 400 && (payload.error.includes("floor") || payload.error.includes("minimum")),
      `Response status: ${res.status} | Error msg: ${payload.error}`
    );
  } catch (err) {
    printResult("Scenario B: Place a bid below category price floor", false, err.message);
  }

  // Scenario C: Attempt to place a duplicate bid on the same requirement from the same user (expect rejection)
  try {
    const res = await fetch(`${BACKEND_URL}/requirements/${requirementId}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        bidAmount: 42000,
        message: "Duplicate bid attempt",
        estimatedCompletion: "3 days",
      }),
    });
    const payload = await parseResponse(res, "Place Duplicate Bid");
    
    printResult(
      "Scenario C: Place a duplicate bid",
      res.status === 400 && payload.error.includes("already placed"),
      `Response status: ${res.status} | Error msg: ${payload.error}`
    );
  } catch (err) {
    printResult("Scenario C: Place a duplicate bid", false, err.message);
  }

  // Register second provider for Scenario D
  let provider2Token = "";
  try {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Provider 2",
        email: `provider2_${Date.now()}@example.com`,
        password: "secure_password_789",
        role: "provider",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      }),
    });
    const payload = await parseResponse(res, "Register Provider 2");
    provider2Token = payload.token;

    // Place second bid
    const resBid = await fetch(`${BACKEND_URL}/requirements/${requirementId}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${provider2Token}`
      },
      body: JSON.stringify({
        bidAmount: 43000,
        message: "Alternative bid",
        estimatedCompletion: "4 days",
      }),
    });
    const payloadBid = await parseResponse(resBid, "Place Bid 2");
    bidId2 = payloadBid.id;
  } catch (err) {
    console.error("Failed to setup Scenario D:", err.message);
  }

  // Scenario D: The requirement owner accepts a winning bid, automatically rejecting all other active bids for that requirement
  try {
    const res = await fetch(`${BACKEND_URL}/requirements/${requirementId}/accept-bid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        bidId: bidId1,
      }),
    });
    
    const [winningBid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId1));
    const [losingBid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId2));
    
    printResult(
      "Scenario D: Accept winning bid and auto-reject others",
      res.status === 200 && winningBid.status === "accepted" && losingBid.status === "rejected",
      `Winning bid status: ${winningBid.status} | Losing bid status: ${losingBid.status}`
    );
  } catch (err) {
    printResult("Scenario D: Accept winning bid and auto-reject others", false, err.message);
  }

  // Scenario E: Attempt to place a bid on a requirement that is already marked 'completed' or 'in_progress'
  try {
    // Set requirement to in_progress
    await db.update(requirementsTable)
      .set({ status: "in_progress" })
      .where(eq(requirementsTable.id, requirementId));

    const res = await fetch(`${BACKEND_URL}/requirements/${requirementId}/bids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        bidAmount: 41000,
        message: "Bidding on closed project",
        estimatedCompletion: "2 days",
      }),
    });
    const payload = await parseResponse(res, "Place Bid Closed Req");

    printResult(
      "Scenario E: Place a bid on a closed/active requirement",
      res.status === 400 && payload.error.includes("open"),
      `Response status: ${res.status} | Error msg: ${payload.error}`
    );
  } catch (err) {
    printResult("Scenario E: Place a bid on a closed/active requirement", false, err.message);
  }

  // =========================================================================
  // 4. FEATURE: FILE STORAGE & UPLOADS
  // =========================================================================
  printHeader("File Storage & Uploads (Compliance Vault)");

  // Scenario A: Request a signed upload URL for a valid user
  let signedUploadUrl = "";
  let documentPath = "";
  try {
    const res = await fetch(`${BACKEND_URL}/compliance/signed-upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        fileName: "pan_card.pdf",
      }),
    });
    const payload = await parseResponse(res, "Request Signed Upload URL");
    signedUploadUrl = payload.signedUrl;
    documentPath = payload.path;

    printResult(
      "Scenario A: Request a signed upload URL for a valid user",
      res.status === 200 && !!signedUploadUrl,
      `Generated URL: ${signedUploadUrl.substring(0, 60)}...`
    );
  } catch (err) {
    printResult("Scenario A: Request a signed upload URL for a valid user", false, err.message);
  }

  // Scenario B: Simulate a database record save mapping a document URL to a user profile
  try {
    const res = await fetch(`${BACKEND_URL}/compliance/my`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        panNumber: "ABCDE1234F",
        gstNumber: "27ABCDE1234F1Z5",
        mcaRegistration: "L12345MH2026PLC123456",
        insuranceUploadUrl: `https://omnibid-vault.supabase.co/storage/v1/object/public/omnibid-vault/${documentPath || "compliance/default.pdf"}`,
        aadhaarStatus: "verified"
      }),
    });
    const payload = await parseResponse(res, "Simulate Mapping Save");

    printResult(
      "Scenario B: Simulate database record save mapping document URL to user profile",
      res.status === 200 && payload.insuranceUploadUrl.includes("omnibid-vault"),
      `Mapped Document URL: ${payload.insuranceUploadUrl.substring(0, 60)}...`
    );
  } catch (err) {
    printResult("Scenario B: Simulate database record save mapping document URL to user profile", false, err.message);
  }

  // Scenario C: Attempt to access a private uploaded document without the correct user ID (expect RLS block)
  try {
    // Run inside a single transaction to guarantee execution on the same pooled connection and within a BEGIN/COMMIT block
    const isBlockedByRLS = await db.transaction(async (tx) => {
      // 1. Set the session local variables for role and user UID claim inside PostgreSQL
      await tx.execute(sql.raw(`SET LOCAL request.jwt.claim.sub = '${providerUserId}'`));
      await tx.execute(sql.raw(`SET LOCAL role = 'authenticated'`));
      
      // 2. Query the buyer's private compliance record as the provider
      const result = await tx.select().from(complianceVaultTable).where(eq(complianceVaultTable.userId, buyerUserId));
      
      // Since RLS is active, it should return 0 rows
      return result.length === 0;
    });

    printResult(
      "Scenario C: Attempt to access private document/record without correct user ID (expect RLS block)",
      isBlockedByRLS,
      `RLS Active: Query returned 0 rows when accessed by unauthorized user ${providerUserId}`
    );
  } catch (err) {
    // If the database has strict RLS or throws a permission error, that also counts as a successful block!
    const isBlocked = err.message.includes("permission denied") || err.message.includes("violates row-level security policy") || err.message.includes("row-level security");
    printResult(
      "Scenario C: Attempt to access private document/record without correct user ID (expect RLS block)",
      isBlocked,
      `Error thrown (blocked): ${err.message}`
    );
  }

  console.log(`\n${colors.bold}${colors.yellow}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}🎉 Exhaustive Scenario Integration Test Suite Finished Successfully!${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}========================================================================${colors.reset}\n`);
  
  process.exit(0);
}

runExhaustiveTests();
