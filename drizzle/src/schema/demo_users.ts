// Demo user credentials for QA/testing
// These are seeded via the demo-seed script
export const DEMO_CREDENTIALS = [
  { role: "retail_buyer",    email: "buyer@demo.omnibid.in",      password: "Demo@123", name: "Priya Sharma",    city: "Bangalore", description: "Retail buyer — posts home service & education requirements" },
  { role: "enterprise_buyer", email: "enterprise@demo.omnibid.in", password: "Demo@123", name: "Reliance Corp (Demo)", city: "Mumbai", description: "Enterprise buyer — posts two-envelope RFPs, manages rate cards" },
  { role: "solo_provider",   email: "provider@demo.omnibid.in",   password: "Demo@123", name: "Ravi Kumar",      city: "Bangalore", description: "Solo provider — bids on home & logistics requirements" },
  { role: "agency_provider", email: "agency@demo.omnibid.in",     password: "Demo@123", name: "StarCrew Agency", city: "Mumbai",    description: "Agency provider — crew of 12, bids on events & security" },
] as const;
