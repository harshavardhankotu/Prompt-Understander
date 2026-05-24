import { db } from "./index";
import { categoriesTable } from "./schema/categories";
import { eq } from "drizzle-orm";

const categories = [
  {
    name: "Healthcare",
    slug: "healthcare",
    iconName: "Heart",
    description: "Medical procedures, surgeries, and diagnostics",
    tier: "both",
    minBidFloor: "5000.00",
    successFeePct: "5.00",
    sectorBadges: { empty_slot_eligible: true },
    customFields: [
      { key: "specialty", label: "Medical Specialty", type: "select", options: ["General", "Cardiology", "Orthopedics", "Dentistry", "Neurology"], required: true },
      { key: "patient_age", label: "Patient Age", type: "number", required: true },
      { key: "surgery_type", label: "Surgery/Procedure Type", type: "text" },
    ],
  },
  {
    name: "Logistics",
    slug: "logistics",
    iconName: "Truck",
    description: "Freight, courier, and transport services",
    tier: "both",
    minBidFloor: "500.00",
    successFeePct: "3.00",
    sectorBadges: { backhaul_eligible: true },
    customFields: [
      { key: "from_city", label: "Origin City", type: "text", required: true },
      { key: "to_city", label: "Destination City", type: "text", required: true },
      { key: "tonnage", label: "Weight (Tons)", type: "number", required: true },
      { key: "cold_storage", label: "Cold Storage Required?", type: "toggle" },
    ],
  },
  {
    name: "Legal & Govt",
    slug: "legal",
    iconName: "Scale",
    description: "Lawyers, documentation, and court representation",
    tier: "both",
    minBidFloor: "2000.00",
    successFeePct: "8.00",
    sectorBadges: { certification_required: "Bar Council" },
    customFields: [
      { key: "document_type", label: "Case/Document Type", type: "select", options: ["Property", "Contract", "Court Case", "Will"], required: true },
      { key: "jurisdiction", label: "Jurisdiction / Court", type: "text" },
    ],
  },
  {
    name: "Tech & IT",
    slug: "tech",
    iconName: "Code",
    description: "Software, web, and mobile development",
    tier: "both",
    minBidFloor: "5000.00",
    successFeePct: "10.00",
    sectorBadges: { two_envelope_default: true },
    customFields: [
      { key: "tech_stack", label: "Preferred Stack", type: "text" },
      { key: "github_access", label: "GitHub Access Needed?", type: "toggle" },
    ],
  },
  {
    name: "Education",
    slug: "education",
    iconName: "BookOpen",
    description: "Tutors, coaching, and skill development",
    tier: "retail",
    minBidFloor: "300.00",
    successFeePct: "5.00",
    sectorBadges: { demo_bid_eligible: true },
    customFields: [
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "student_count", label: "Student Count", type: "number" },
    ],
  },
  {
    name: "Home Services",
    slug: "home",
    iconName: "Home",
    description: "Plumbing, electrical, and cleaning",
    tier: "retail",
    minBidFloor: "200.00",
    successFeePct: "5.00",
    sectorBadges: { proximity_match: true },
    customFields: [
      { key: "service_type", label: "Service Type", type: "select", options: ["Plumbing", "Electrical", "Cleaning", "Carpentry"], required: true },
      { key: "sqft", label: "Area (Sq Ft)", type: "number" },
    ],
  },
  {
    name: "Agriculture",
    slug: "agriculture",
    iconName: "Leaf",
    description: "Harvesting, procurement, and farm equipment",
    tier: "both",
    minBidFloor: "1000.00",
    successFeePct: "2.00",
    sectorBadges: { mandi_price_linked: true },
    customFields: [
      { key: "crop_type", label: "Crop Type", type: "text", required: true },
      { key: "quintals", label: "Quantity (Quintals)", type: "number" },
    ],
  },
  {
    name: "Construction",
    slug: "construction",
    iconName: "HardHat",
    description: "Building, renovation, and civil works",
    tier: "both",
    minBidFloor: "10000.00",
    successFeePct: "4.00",
    sectorBadges: { mega_project_eligible: true },
    customFields: [
      { key: "project_type", label: "Project Type", type: "select", options: ["New Build", "Renovation", "Structural Repair"], required: true },
      { key: "material_included", label: "Material Included?", type: "toggle" },
    ],
  },
  {
    name: "Events & Wedding",
    slug: "events",
    iconName: "Calendar",
    description: "Planning, catering, and venue management",
    tier: "retail",
    minBidFloor: "20000.00",
    successFeePct: "7.00",
    sectorBadges: { mega_project_eligible: true, syndicate_eligible: true },
    customFields: [
      { key: "guest_count", label: "Guest Count", type: "number", required: true },
      { key: "event_date", label: "Event Date", type: "date", required: true },
    ],
  },
  {
    name: "Manufacturing",
    slug: "manufacturing",
    iconName: "Factory",
    description: "Job work, fabrication, and assembly",
    tier: "enterprise",
    minBidFloor: "5000.00",
    successFeePct: "3.00",
    sectorBadges: { two_envelope_default: true },
    customFields: [
      { key: "machine_type", label: "Machine Type (CNC, etc.)", type: "text" },
      { key: "unit_count", label: "Units Required", type: "number" },
    ],
  },
  {
    name: "Creative & Media",
    slug: "creative",
    iconName: "Camera",
    description: "Video, design, and social media content",
    tier: "both",
    minBidFloor: "1000.00",
    successFeePct: "10.00",
    sectorBadges: { demo_bid_eligible: true },
    customFields: [
      { key: "format", label: "Deliverable Format", type: "select", options: ["Video", "Photos", "Logo", "Social Pack"] },
      { key: "deadline", label: "Delivery Date", type: "date" },
    ],
  },
  {
    name: "Finance & Audit",
    slug: "finance",
    iconName: "TrendingUp",
    description: "CA/CS services, GST, and business valuation",
    tier: "both",
    minBidFloor: "2000.00",
    successFeePct: "10.00",
    sectorBadges: { certification_required: "CA/CS" },
    customFields: [
      { key: "audit_type", label: "Service Type", type: "select", options: ["GST Filing", "ITR Filing", "Statutory Audit"], required: true },
      { key: "turnover", label: "Annual Turnover Bracket", type: "text" },
    ],
  },
  {
    name: "Auto & Fleet",
    slug: "auto",
    iconName: "Car",
    description: "Fleet maintenance and roadside assistance",
    tier: "both",
    minBidFloor: "500.00",
    successFeePct: "5.00",
    sectorBadges: { bench_eligible: true },
    customFields: [
      { key: "vehicle_count", label: "No. of Vehicles", type: "number" },
      { key: "repair_type", label: "Repair Type", type: "text" },
    ],
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    iconName: "Building",
    description: "Brokerage, valuation, and property management",
    tier: "retail",
    minBidFloor: "5000.00",
    successFeePct: "2.00",
    sectorBadges: { verified_listing_only: true },
    customFields: [
      { key: "property_type", label: "Property Type", type: "select", options: ["Flat", "Villa", "Plot", "Commercial"] },
      { key: "service", label: "Service Needed", type: "select", options: ["Buy", "Sell", "Rent", "Valuation"] },
    ],
  },
  {
    name: "Retail & Merch",
    slug: "retail",
    iconName: "ShoppingBag",
    description: "Branding, display, and visual merchandising",
    tier: "enterprise",
    minBidFloor: "1000.00",
    successFeePct: "5.00",
    sectorBadges: { shelf_space_linked: true },
    customFields: [
      { key: "store_count", label: "No. of Stores", type: "number" },
      { key: "sku_count", label: "No. of SKUs", type: "number" },
    ],
  },
  {
    name: "Hospitality",
    slug: "hospitality",
    iconName: "ChefHat",
    description: "Catering, hotel supply, and chefs on hire",
    tier: "both",
    minBidFloor: "2000.00",
    successFeePct: "5.00",
    sectorBadges: { certification_required: "FSSAI" },
    customFields: [
      { key: "plate_count", label: "Plates/Covers", type: "number" },
      { key: "cuisine", label: "Cuisine Type", type: "text" },
    ],
  },
  {
    name: "Security",
    slug: "security",
    iconName: "Shield",
    description: "Guards, CCTV, and event security",
    tier: "both",
    minBidFloor: "1000.00",
    successFeePct: "5.00",
    sectorBadges: { bench_eligible: true },
    customFields: [
      { key: "guard_count", label: "No. of Guards", type: "number" },
      { key: "armed", label: "Armed Required?", type: "toggle" },
    ],
  },
  {
    name: "Beauty & Wellness",
    slug: "beauty",
    iconName: "Sparkles",
    description: "Salon, spa, and bridal packages",
    tier: "retail",
    minBidFloor: "500.00",
    successFeePct: "10.00",
    sectorBadges: { home_service_eligible: true },
    customFields: [
      { key: "service", label: "Service Type", type: "select", options: ["Bridal", "Mehendi", "Salon", "Spa"] },
      { key: "client_count", label: "No. of Clients", type: "number" },
    ],
  },
  {
    name: "Export & Customs",
    slug: "customs",
    iconName: "Package",
    description: "Customs clearance and freight forwarding",
    tier: "enterprise",
    minBidFloor: "5000.00",
    successFeePct: "3.00",
    sectorBadges: { gst_mandatory: true },
    customFields: [
      { key: "hsn_code", label: "HSN Code", type: "text" },
      { key: "port", label: "Port Name", type: "text" },
    ],
  },
  {
    name: "Heavy Machinery",
    slug: "heavy-machinery",
    iconName: "Wrench",
    description: "Crane hire, JCB, and excavators",
    tier: "both",
    minBidFloor: "5000.00",
    successFeePct: "3.00",
    sectorBadges: { operator_included: true },
    customFields: [
      { key: "machine_type", label: "Machine Type", type: "select", options: ["Crane", "JCB", "Excavator", "Bulldozer"] },
      { key: "duration_days", label: "Duration (Days)", type: "number" },
    ],
  },
];

async function seedCategories() {
  console.log("Seeding categories...");
  for (const cat of categories) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug));
    if (!existing.length) {
      await db.insert(categoriesTable).values(cat as any);
      console.log(`Inserted: ${cat.name}`);
    } else {
      await db.update(categoriesTable).set(cat as any).where(eq(categoriesTable.slug, cat.slug));
      console.log(`Updated: ${cat.name}`);
    }
  }
  console.log("Seeding complete!");
}

seedCategories().catch(console.error).finally(() => process.exit());
