import { db } from "./index";
import { categoriesTable } from "./schema/categories";
import { eq } from "drizzle-orm";

const categories = [
  {
    name: "Healthcare",
    slug: "healthcare",
    iconName: "Heart",
    description: "Medical procedures, surgeries, and diagnostics",
    minBidFloor: "1000.00",
    successFeePct: "5.00",
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
    minBidFloor: "500.00",
    successFeePct: "3.00",
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
    minBidFloor: "1500.00",
    successFeePct: "8.00",
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
    minBidFloor: "5000.00",
    successFeePct: "10.00",
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
    minBidFloor: "300.00",
    successFeePct: "5.00",
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
    minBidFloor: "200.00",
    successFeePct: "5.00",
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
    minBidFloor: "1000.00",
    successFeePct: "2.00",
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
    minBidFloor: "10000.00",
    successFeePct: "4.00",
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
    minBidFloor: "20000.00",
    successFeePct: "7.00",
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
    minBidFloor: "5000.00",
    successFeePct: "3.00",
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
    minBidFloor: "1000.00",
    successFeePct: "10.00",
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
    minBidFloor: "2000.00",
    successFeePct: "10.00",
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
    minBidFloor: "500.00",
    successFeePct: "5.00",
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
    minBidFloor: "5000.00",
    successFeePct: "2.00",
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
    minBidFloor: "1000.00",
    successFeePct: "5.00",
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
    minBidFloor: "2000.00",
    successFeePct: "5.00",
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
    minBidFloor: "1000.00",
    successFeePct: "5.00",
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
    minBidFloor: "500.00",
    successFeePct: "10.00",
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
    minBidFloor: "5000.00",
    successFeePct: "3.00",
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
    minBidFloor: "5000.00",
    successFeePct: "3.00",
    customFields: [
      { key: "machine_type", label: "Machine Type", type: "select", options: ["Crane", "JCB", "Excavator", "Bulldozer"] },
      { key: "duration_days", label: "Duration (Days)", type: "number" },
    ],
  },
];

async function seed() {
  console.log("Seeding categories...");
  for (const cat of categories) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug));
    if (!existing.length) {
      await db.insert(categoriesTable).values(cat);
      console.log(`Inserted: ${cat.name}`);
    } else {
      await db.update(categoriesTable).set(cat).where(eq(categoriesTable.slug, cat.slug));
      console.log(`Updated: ${cat.name}`);
    }
  }
  console.log("Seeding complete!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch(console.error).finally(() => process.exit());
}

export { seed };
