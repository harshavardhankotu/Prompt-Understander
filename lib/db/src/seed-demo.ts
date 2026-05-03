import { db, usersTable, requirementsTable, bidsTable, categoriesTable, complianceVaultTable, negotiationsTable, paymentsTable } from "./index";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const DEMO_USERS = [
  {
    name: "Priya Sharma",
    email: "buyer@demo.omnibid.in",
    password: "Demo@123",
    role: "retail_buyer" as const,
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    phone: "+91-9876543210",
    trustScore: 100,
    omniScore: 0,
    isVerified: true,
  },
  {
    name: "Reliance Corp (Demo)",
    email: "enterprise@demo.omnibid.in",
    password: "Demo@123",
    role: "enterprise_buyer" as const,
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    phone: "+91-9876543211",
    gstNumber: "27AADCB2230M1ZT",
    trustScore: 85,
    omniScore: 0,
    isVerified: true,
  },
  {
    name: "Ravi Kumar",
    email: "provider@demo.omnibid.in",
    password: "Demo@123",
    role: "solo_provider" as const,
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560002",
    phone: "+91-9876543212",
    trustScore: 72,
    omniScore: 380,
    isVerified: true,
    aadhaarVerified: true,
  },
  {
    name: "StarCrew Agency",
    email: "agency@demo.omnibid.in",
    password: "Demo@123",
    role: "agency_provider" as const,
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400002",
    phone: "+91-9876543213",
    gstNumber: "27AABCA1234C1ZV",
    crewSize: 12,
    trustScore: 88,
    omniScore: 620,
    isVerified: true,
    aadhaarVerified: true,
  },
];

async function seedDemo() {
  console.log("Seeding demo users...");

  const userIds: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, u.email));
    if (existing.length > 0) {
      console.log(`  ↩  Already exists: ${u.email} (id=${existing[0].id})`);
      userIds[u.role] = existing[0].id;
      // Update trust/omni scores in case they changed
      await db.update(usersTable)
        .set({ trustScore: u.trustScore, omniScore: u.omniScore, isVerified: u.isVerified })
        .where(eq(usersTable.email, u.email));
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    const [created] = await db.insert(usersTable).values({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
      city: u.city,
      state: u.state,
      pincode: u.pincode,
      phone: u.phone,
      gstNumber: (u as { gstNumber?: string }).gstNumber ?? null,
      crewSize: (u as { crewSize?: number }).crewSize ?? 1,
      trustScore: u.trustScore,
      omniScore: u.omniScore,
      isVerified: u.isVerified,
      aadhaarVerified: (u as { aadhaarVerified?: boolean }).aadhaarVerified ?? false,
      preferredLanguage: "en",
    }).returning();
    userIds[u.role] = created.id;
    console.log(`  ✅ Created: ${u.name} (${u.role}) — ${u.email}`);
  }

  // Seed compliance vault for providers
  for (const role of ["solo_provider", "agency_provider"]) {
    const uid = userIds[role];
    if (!uid) continue;
    const existing = await db.select().from(complianceVaultTable).where(eq(complianceVaultTable.userId, uid));
    if (existing.length === 0) {
      await db.insert(complianceVaultTable).values({
        userId: uid,
        aadhaarStatus: "verified",
        panNumber: role === "solo_provider" ? "ABCDE1234F" : "FGHIJ5678K",
        gstNumber: role === "agency_provider" ? "27AABCA1234C1ZV" : null,
        isEmpanelled: role === "agency_provider",
      });
      console.log(`  ✅ Compliance vault seeded for ${role}`);
    }
  }

  // Seed demo requirements
  const buyerId = userIds["retail_buyer"];
  const enterpriseId = userIds["enterprise_buyer"];

  const allCats = await db.select().from(categoriesTable);
  const catBySlug = Object.fromEntries(allCats.map(c => [c.slug, c]));

  const homeCat = catBySlug["home"];
  const techCat = catBySlug["tech"];
  const eventCat = catBySlug["events"];
  const logisticsCat = catBySlug["logistics"];
  const securityCat = catBySlug["security"];

  if (buyerId && homeCat) {
    const existingReqs = await db.select().from(requirementsTable).where(eq(requirementsTable.buyerId, buyerId));
    if (existingReqs.length === 0) {
      const auctionEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [req1] = await db.insert(requirementsTable).values({
        buyerId,
        categoryId: homeCat.id,
        title: "Bathroom plumbing repair — pipe leak under sink",
        description: "Need an experienced plumber to fix a pipe leak under the bathroom sink. The pipe has been dripping for 2 days. Materials can be provided by the plumber (I'll reimburse).",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560001",
        maxBudget: "3500",
        deadlineHours: 24,
        auctionEndsAt: auctionEnd,
        status: "open",
        customData: { service_type: "Plumbing", property_size: "1200" },
      }).returning();
      console.log(`  ✅ Requirement seeded: "${req1.title}"`);

      if (techCat) {
        const [req2] = await db.insert(requirementsTable).values({
          buyerId,
          categoryId: techCat.id,
          title: "Landing page + contact form for my boutique",
          description: "Need a simple 1-page website with my boutique's branding, product photos, and a WhatsApp contact button. Mobile-first design. Budget is tight.",
          city: "Bangalore",
          state: "Karnataka",
          maxBudget: "8000",
          deadlineHours: 72,
          auctionEndsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          status: "open",
          customData: { tech_stack: "React or plain HTML", github_access: "No" },
        }).returning();
        console.log(`  ✅ Requirement seeded: "${req2.title}"`);

        // Seed a bid from solo_provider on req2
        const providerId = userIds["solo_provider"];
        if (providerId) {
          const existingBid = await db.select().from(bidsTable).where(eq(bidsTable.requirementId, req2.id));
          if (existingBid.length === 0) {
            await db.insert(bidsTable).values({
              requirementId: req2.id,
              providerId,
              bidAmount: "6500",
              message: "I can build this in 4–5 days using React + Tailwind CSS. I have built 15+ similar landing pages. Will include mobile optimisation and WhatsApp button integration.",
              estimatedCompletion: "5 days",
              executorType: "self",
              bidSource: "web",
            });
            console.log(`  ✅ Demo bid seeded from Ravi Kumar on "${req2.title}"`);
          }
        }
      }
    }
  }

  // Enterprise buyer requirements
  if (enterpriseId && securityCat) {
    const existingEnterpriseReqs = await db.select().from(requirementsTable).where(eq(requirementsTable.buyerId, enterpriseId));
    if (existingEnterpriseReqs.length === 0) {
      const [req3] = await db.insert(requirementsTable).values({
        buyerId: enterpriseId,
        categoryId: securityCat.id,
        title: "[ENTERPRISE RFP] Security Guard Services — Navi Mumbai Warehouse",
        description: "We require 4 unarmed guards on rotating 3-shift basis for a 50,000 sq ft warehouse. Minimum 2 years experience, police verification mandatory. 12-month contract.",
        city: "Navi Mumbai",
        state: "Maharashtra",
        pincode: "400701",
        maxBudget: "480000",
        deadlineHours: 168,
        auctionEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "open",
        bidType: "two_envelope",
        isMegaProject: true,
        customData: { guard_count: "4", armed_req: "No" },
      }).returning();
      console.log(`  ✅ Enterprise RFP seeded: "${req3.title}"`);

      // Seed a bid from agency_provider
      const agencyId = userIds["agency_provider"];
      if (agencyId) {
        await db.insert(bidsTable).values({
          requirementId: req3.id,
          providerId: agencyId,
          bidAmount: "420000",
          message: "StarCrew Agency specialises in enterprise security deployments. We have a team of 20 trained guards, all police-verified. We can deploy 4 guards within 48 hours of contract signing.",
          estimatedCompletion: "Start within 2 days of contract",
          executorType: "self",
          crewSizeOffered: 4,
          envelopeAUrl: "https://placeholder.omnibid.in/envelope-a-tech-bid.pdf",
          bidSource: "web",
          status: "envelope_a_pending",
        });
        console.log(`  ✅ Agency bid seeded on enterprise RFP`);
      }
    }
  }

  // Logistics requirement from retail buyer
  if (buyerId && logisticsCat) {
    const logisticReqs = await db.select().from(requirementsTable).where(eq(requirementsTable.categoryId, logisticsCat.id));
    if (logisticReqs.filter(r => r.buyerId === buyerId).length === 0) {
      await db.insert(requirementsTable).values({
        buyerId,
        categoryId: logisticsCat.id,
        title: "Packers & Movers — 2BHK apartment shift within Bangalore",
        description: "Moving from HSR Layout to Whitefield, approximately 2BHK worth of furniture and boxes. Need experienced team with packing materials. Prefer morning slot.",
        city: "Bangalore",
        state: "Karnataka",
        maxBudget: "12000",
        deadlineHours: 48,
        auctionEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        status: "open",
        customData: { tonnage: "~1.5 tonnes", cold_storage: "No", route: "HSR Layout → Whitefield" },
      });
      console.log(`  ✅ Logistics requirement seeded`);
    }
  }

  // Events requirement
  if (enterpriseId && eventCat) {
    const eventReqs = await db.select().from(requirementsTable).where(eq(requirementsTable.categoryId, eventCat.id));
    if (eventReqs.filter(r => r.buyerId === enterpriseId).length === 0) {
      await db.insert(requirementsTable).values({
        buyerId: enterpriseId,
        categoryId: eventCat.id,
        title: "Annual Company Dinner — Mumbai, 200 guests",
        description: "Corporate annual dinner for 200 employees. Need full event management: venue, catering (veg + non-veg), AV equipment, decorations, and emcee. Budget is flexible for quality.",
        city: "Mumbai",
        state: "Maharashtra",
        maxBudget: "350000",
        deadlineHours: 720,
        auctionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "open",
        isSyndicate: false,
        isMegaProject: false,
        customData: { guest_count: "200", venue_size: "Banquet Hall" },
      });
      console.log(`  ✅ Events requirement seeded`);
    }
  }

  console.log("\n🎉 Demo seeding complete!");
  console.log("\nDemo Login Credentials:");
  console.log("  Retail Buyer:     buyer@demo.omnibid.in      / Demo@123");
  console.log("  Enterprise Buyer: enterprise@demo.omnibid.in / Demo@123");
  console.log("  Solo Provider:    provider@demo.omnibid.in   / Demo@123");
  console.log("  Agency Provider:  agency@demo.omnibid.in     / Demo@123");

  await db.$client.end();
}

seedDemo().catch(err => {
  console.error(err);
  process.exit(1);
});
