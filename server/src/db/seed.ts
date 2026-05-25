import "./preload-env.js";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { 
  usersTable, 
  categoriesTable, 
  requirementsTable, 
  bidsTable, 
  paymentsTable, 
  disputesTable 
} from "@omnibid/db";
import crypto from "crypto";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be defined in your env variables.");
  process.exit(1);
}

// Establish SSL-bypassed connection for Supabase cloud DB pooler
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool);

// Chunked batch insert helper to optimize round-trip cloud database writes
async function chunkedInsert(table: any, data: any[], chunkSize = 150) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await db.insert(table).values(chunk);
  }
}

async function seed() {
  console.log("🚀 Starting database seeding...");
  const start = Date.now();

  // 1. Core sectors / categories setup
  console.log("[-] Clearing and inserting Categories...");
  const catIds = {
    it: crypto.randomUUID(),
    construction: crypto.randomUUID(),
    logistics: crypto.randomUUID(),
    legal: crypto.randomUUID()
  };

  await db.insert(categoriesTable).values([
    { id: catIds.it, name: "IT & Software Development", slug: "it-software", iconName: "Laptop", description: "B2B web development, cloud, and mobile apps" },
    { id: catIds.construction, name: "Civil & Construction Works", slug: "civil-construction", iconName: "HardHat", description: "Interior fit-outs, RCC structures, and roadwork" },
    { id: catIds.logistics, name: "Logistics & Freight Services", slug: "logistics-freight", iconName: "Truck", description: "Cargo hauling, warehouse storage, and delivery ops" },
    { id: catIds.legal, name: "Corporate Legal & Consulting", slug: "corporate-legal", iconName: "FileText", description: "GST filing, vendor agreements, and auditing services" }
  ]).onConflictDoNothing();

  // 2. Generate exactly 500 Users
  console.log("[-] Pre-generating 500 Indian Users...");
  const firstNames = ["Rahul", "Amit", "Priya", "Sneha", "Rajesh", "Vivek", "Ananya", "Vikram", "Neha", "Rohit", "Sunil", "Sanjay", "Sandeep", "Arvind", "Pooja", "Manoj", "Anita", "Suresh", "Kiran", "Harish", "Deepak", "Ramesh", "Manish", "Shalini", "Kavita", "Jyoti", "Varun", "Ajay", "Karan", "Ritu", "Swati", "Abhishek", "Gaurav", "Arjun", "Akash", "Rohan", "Vijay", "Divya", "Prakash", "Preeti", "Siddharth", "Meera", "Aditya", "Neha", "Anil", "Sonia", "Raj", "Komal", "Nitin", "Poonam"];
  const lastNames = ["Sharma", "Verma", "Singh", "Kumar", "Patel", "Gupta", "Reddy", "Rao", "Nair", "Joshi", "Mehta", "Sen", "Das", "Bose", "Choudhury", "Saxena", "Iyer", "Deshmukh", "Patil", "Yadav", "Mishra", "Pandey", "Prasad", "Bhatia", "Malhotra", "Kapoor", "Anand", "Khanna", "Grover", "Gill", "Bhattacharya", "Chandra", "Ray", "Dutta", "Chatterjee", "Roy", "Basu", "Ghosh", "Mukherjee", "Banerjee"];
  
  const locations = [
    { city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    { city: "Delhi", state: "Delhi", pincode: "110001" },
    { city: "Bengaluru", state: "Karnataka", pincode: "560001" },
    { city: "Hyderabad", state: "Telangana", pincode: "500001" },
    { city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
    { city: "Pune", state: "Maharashtra", pincode: "411001" },
    { city: "Kolkata", state: "West Bengal", pincode: "700001" },
    { city: "Ahmedabad", state: "Gujarat", pincode: "380001" }
  ];

  const userIds = Array.from({ length: 500 }, () => crypto.randomUUID());
  const users = [];

  for (let i = 0; i < 500; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${fName} ${lName}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${i}@omnibid.test`;
    const phone = `98765${String(10000 + i).substring(1)}`;
    const loc = locations[i % locations.length];
    
    let role: "retail_buyer" | "enterprise_buyer" | "solo_provider" | "agency_provider";
    if (i < 100) role = "retail_buyer";
    else if (i < 200) role = "enterprise_buyer";
    else if (i < 350) role = "solo_provider";
    else role = "agency_provider";

    const kycStatuses: ("pending" | "verified" | "rejected")[] = ["pending", "verified", "verified", "verified"];
    const kycStatus = kycStatuses[i % kycStatuses.length];

    users.push({
      id: userIds[i],
      name: fullName,
      email,
      phone,
      passwordHash: "$2a$10$tMh42h...dummyhash", // Seeding speed-up
      role,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      isProfileComplete: true,
      trustScore: 80,
      isVerified: kycStatus === "verified",
      aadhaarVerified: kycStatus === "verified",
      kycStatus,
      razorpayLinkedAccountId: role.endsWith("provider") ? `acc_linked_${i}` : null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 180))
    });
  }

  console.log("[-] Bulk inserting 500 Users...");
  await chunkedInsert(usersTable, users, 100);

  // 3. Generate 1,500 Requirements across IT, Construction, Logistics, and Legal
  console.log("[-] Pre-generating 1,500 Requirements and Bids...");
  const buyerIds = userIds.slice(0, 200);
  const providerIds = userIds.slice(200, 500);

  const requirementIds = Array.from({ length: 1500 }, () => crypto.randomUUID());
  const bidIds = Array.from({ length: 4500 }, () => crypto.randomUUID());
  
  const requirements = [];
  const bids = [];
  const payments = [];
  const disputes = [];

  let bidIndex = 0;
  let paymentIndex = 0;

  for (let i = 0; i < 1500; i++) {
    const reqId = requirementIds[i];
    const buyerId = buyerIds[Math.floor(Math.random() * buyerIds.length)];
    const loc = locations[i % locations.length];
    
    let categoryId: string;
    let sector: string;
    if (i < 375) { categoryId = catIds.it; sector = "it"; }
    else if (i < 750) { categoryId = catIds.construction; sector = "construction"; }
    else if (i < 1125) { categoryId = catIds.logistics; sector = "logistics"; }
    else { categoryId = catIds.legal; sector = "legal"; }

    // budgets inside India marketplace
    let maxBudget: number;
    if (sector === "it") maxBudget = 50000 + Math.floor(Math.random() * 450000);
    else if (sector === "construction") maxBudget = 100000 + Math.floor(Math.random() * 900000);
    else if (sector === "logistics") maxBudget = 20000 + Math.floor(Math.random() * 180000);
    else maxBudget = 10000 + Math.floor(Math.random() * 90000);

    // Status mapping (exactly 800 active/completed escrows)
    let status: "open" | "accepted" | "in_progress" | "completed" | "disputed";
    if (i < 400) status = "completed"; // 400 completed
    else if (i < 800) status = "in_progress"; // 400 in_progress
    else if (i < 1000) status = "accepted"; // 200 accepted
    else status = "open"; // 500 open

    // 4. Generate 3 bids per requirement (Competitive war simulation)
    const reqBids = [];
    const selectedProviders = new Set<string>();
    
    for (let j = 0; j < 3; j++) {
      const bidId = bidIds[bidIndex++];
      let providerId = providerIds[Math.floor(Math.random() * providerIds.length)];
      while (selectedProviders.has(providerId)) {
        providerId = providerIds[Math.floor(Math.random() * providerIds.length)];
      }
      selectedProviders.add(providerId);

      const bidAmount = Math.round(maxBudget * (0.85 + Math.random() * 0.2));
      
      reqBids.push({
        id: bidId,
        requirementId: reqId,
        providerId,
        bidAmount: String(bidAmount),
        message: `Pitched B2B bid for ${sector} requirement in ${loc.city}. Comprehensive scope execution guaranteed.`,
        estimatedCompletion: "14 days",
        status: "active" as "active" | "accepted" | "rejected",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 30))
      });
    }

    let winningBidId: string | null = null;
    if (status !== "open") {
      const winner = reqBids[0];
      winner.status = "accepted";
      winningBidId = winner.id;
      
      reqBids[1].status = "rejected";
      reqBids[2].status = "rejected";

      // 5. Generate active/completed Escrow Payments (Exactly 800)
      if ((status === "in_progress" || status === "completed") && paymentIndex < 800) {
        paymentIndex++;
        const totalAmount = Number(winner.bidAmount);
        
        // Precise financial math
        const platformFeePercent = 2.0;
        const platformFeeAmount = Math.round(totalAmount * 0.02);
        const tdsAmount = totalAmount > 30000 ? Math.round(totalAmount * 0.02) : 0;
        const netToProvider = totalAmount - platformFeeAmount - tdsAmount;
        
        // 6. Dispute rate (exactly 5% inside payments => 40 disputes)
        let escrowStatus: "pending" | "held" | "in_progress" | "released" | "disputed" | "refunded";
        if (paymentIndex <= 40) {
          escrowStatus = "disputed";
          status = "disputed";
        } else if (status === "completed") {
          escrowStatus = "released";
        } else {
          escrowStatus = Math.random() > 0.5 ? "held" : "in_progress";
        }

        const pmtId = crypto.randomUUID();
        const upiTransactionId = escrowStatus === ("pending" as string) 
          ? `order_${crypto.randomBytes(8).toString("hex")}` 
          : `pay_${crypto.randomBytes(8).toString("hex")}`;

        payments.push({
          id: pmtId,
          requirementId: reqId,
          bidId: winner.id,
          buyerId,
          providerId: winner.providerId,
          totalAmount: String(totalAmount),
          platformFeePercent: String(platformFeePercent),
          platformFeeAmount: String(platformFeeAmount),
          tdsAmount: String(tdsAmount),
          netToProvider: String(netToProvider),
          escrowStatus,
          upiTransactionId,
          paymentMethod: "upi",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 15))
        });

        // Add to disputes table if flagged
        if (escrowStatus === "disputed") {
          disputes.push({
            id: crypto.randomUUID(),
            requirementId: reqId,
            bidId: winner.id,
            raisedById: buyerId,
            respondentId: winner.providerId,
            status: "open" as const,
            title: `Escrow Dispute on ${sector.toUpperCase()} project`,
            description: "A dispute has been raised regarding the final quality and incomplete milestones delivered by the contractor. Funds frozen in escrow.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 2))
          });
        }
      }
    }

    bids.push(...reqBids);

    let customData: Record<string, any> = {};
    if (sector === "it") {
      customData = {
        techStack: ["React", "Node.js", "TypeScript", "PostgreSQL"],
        preferredExperience: "5+ years",
        timelineMonths: 3,
        repositoryAccessRequired: true
      };
    } else if (sector === "construction") {
      customData = {
        scope: "RCC structural execution, brickwork, and plastering",
        materialsRequired: true,
        builtUpAreaSqFt: 4500,
        architecturalDrawingApproved: true
      };
    } else if (sector === "logistics") {
      customData = {
        origin: loc.city,
        destination: loc.city === "Mumbai" ? "Bengaluru" : "Mumbai",
        tonnage: 15,
        vehicleType: "16-wheeler container truck",
        transitInsuranceRequired: true
      };
    } else {
      customData = {
        type: "Corporate GST compliance auditing and filing retainer",
        regulatoryBodies: ["GSTN", "CBIC"],
        complianceStandard: "ISO-27001",
        retainerBasis: false
      };
    }

    requirements.push({
      id: reqId,
      buyerId,
      categoryId,
      title: `${sector === "it" ? "IT Development" : sector === "construction" ? "Civil Engineering" : sector === "logistics" ? "Freight Supply" : "Regulatory Audit"} Contract - ${loc.city}`,
      description: `Complete technical scope of work for the proposed ${sector} B2B requirement in ${loc.city}, ${loc.state}.`,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      maxBudget: String(maxBudget),
      deadlineHours: 120,
      auctionEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      status,
      winningBidId,
      customData,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (Math.random() * 45))
    });
  }

  console.log("[-] Bulk inserting 1,500 Requirements...");
  await chunkedInsert(requirementsTable, requirements, 100);

  console.log("[-] Bulk inserting 4,500 Bids...");
  await chunkedInsert(bidsTable, bids, 100);

  console.log("[-] Bulk inserting 800 Escrow Payments...");
  await chunkedInsert(paymentsTable, payments, 100);

  if (disputes.length > 0) {
    console.log(`[-] Bulk inserting ${disputes.length} Disputes...`);
    await chunkedInsert(disputesTable, disputes, 100);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n🎉 SEEDING COMPLETED IN ${elapsed}s!`);
  console.log(`Summary of inserted records:`);
  console.log(`  • Users: 500`);
  console.log(`  • Requirements: 1500`);
  console.log(`  • Bids: 4500`);
  console.log(`  • Escrow Payments: ${payments.length}`);
  console.log(`  • Disputes (5% rate): ${disputes.length}`);
}

seed().catch(err => {
  console.error("Seeding failed critically:", err);
  process.exit(1);
}).then(() => process.exit(0));
