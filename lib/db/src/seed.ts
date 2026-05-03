import { db, categoriesTable } from "./index";
import { eq } from "drizzle-orm";

const categories = [
  {
    name: "Healthcare",
    slug: "healthcare",
    iconName: "Heart",
    description: "Medical procedures, consultations, diagnostics, surgeries, shifts, and wellness services",
    priceFloor: "500",
    customFields: [
      { key: "specialty", label: "Medical Specialty", type: "select", options: ["General", "Cardiology", "Orthopedics", "Dentistry", "Ophthalmology", "Neurology", "Gynecology", "Pediatrics", "Psychiatry"], required: false },
      { key: "license_req", label: "License Required?", type: "select", options: ["Yes – MBBS", "Yes – BDS", "Yes – Nursing", "No"], required: false },
      { key: "shift_hours", label: "Shift Hours (if applicable)", type: "text" },
    ],
  },
  {
    name: "Logistics",
    slug: "logistics",
    iconName: "Truck",
    description: "Courier, packers & movers, freight, cold chain, and transport services",
    priceFloor: "200",
    customFields: [
      { key: "tonnage", label: "Weight / Tonnage", type: "text" },
      { key: "cold_storage", label: "Cold Storage Required?", type: "select", options: ["Yes", "No"], required: false },
      { key: "route", label: "Route / Origin → Destination", type: "text" },
    ],
  },
  {
    name: "Legal & Gov",
    slug: "legal",
    iconName: "Scale",
    description: "Lawyers, legal documentation, property registration, court representation, and government paperwork",
    priceFloor: "1000",
    customFields: [
      { key: "document_type", label: "Document / Case Type", type: "select", options: ["Property Registration", "Will / Probate", "Contract Drafting", "Court Representation", "RTI Filing", "Business Incorporation", "Divorce", "IPR", "Labour Dispute"], required: false },
      { key: "ward_number", label: "Ward / Jurisdiction Number (if applicable)", type: "text" },
    ],
  },
  {
    name: "Tech & IT",
    slug: "tech",
    iconName: "Code",
    description: "Web development, mobile apps, IT support, software, and tech solutions",
    priceFloor: "500",
    customFields: [
      { key: "tech_stack", label: "Preferred Technology / Stack", type: "text" },
      { key: "github_access", label: "GitHub / Repo Access Needed?", type: "select", options: ["Yes", "No"], required: false },
      { key: "timeline", label: "Deadline", type: "text" },
    ],
  },
  {
    name: "Home Services",
    slug: "home",
    iconName: "Home",
    description: "Plumbing, electrical, cleaning, painting, carpentry, and repair services",
    priceFloor: "200",
    customFields: [
      { key: "service_type", label: "Service Type", type: "select", options: ["Plumbing", "Electrical", "Cleaning", "Painting", "Carpentry", "AC Repair", "Pest Control", "Other"], required: true },
      { key: "property_size", label: "Property Size (sq ft)", type: "text" },
    ],
  },
  {
    name: "Agriculture",
    slug: "agriculture",
    iconName: "Leaf",
    description: "Harvest services, cold storage, crop procurement, agri-inputs, and farm equipment",
    priceFloor: "300",
    customFields: [
      { key: "crop_type", label: "Crop Type", type: "text" },
      { key: "quintals", label: "Quantity (Quintals)", type: "text" },
    ],
  },
  {
    name: "Education",
    slug: "education",
    iconName: "BookOpen",
    description: "Tutors, coaching, online courses, micro-batch classes, exam prep, and skill development",
    priceFloor: "200",
    customFields: [
      { key: "subject", label: "Subject", type: "text" },
      { key: "student_count", label: "Number of Students", type: "text" },
    ],
  },
  {
    name: "Construction & Civil",
    slug: "construction",
    iconName: "HardHat",
    description: "Building construction, civil works, interior fit-outs, structural repairs, and renovation",
    priceFloor: "2000",
    customFields: [
      { key: "sqft", label: "Area (sq ft)", type: "text" },
      { key: "material_included", label: "Materials Included?", type: "select", options: ["Yes – all materials", "Partial", "No – labour only"], required: false },
    ],
  },
  {
    name: "Event Management",
    slug: "events",
    iconName: "Calendar",
    description: "Weddings, corporate events, exhibitions, conferences, and venue management",
    priceFloor: "5000",
    customFields: [
      { key: "guest_count", label: "Expected Guest Count", type: "text" },
      { key: "venue_size", label: "Venue Size / Type", type: "text" },
    ],
  },
  {
    name: "Manufacturing",
    slug: "manufacturing",
    iconName: "Factory",
    description: "Job work, CNC machining, fabrication, contract manufacturing, and assembly",
    priceFloor: "1000",
    customFields: [
      { key: "cnc_machine_type", label: "Machine / Process Type", type: "text" },
      { key: "units", label: "Number of Units Required", type: "text" },
    ],
  },
  {
    name: "Creative & Media",
    slug: "creative",
    iconName: "Camera",
    description: "Photography, video production, graphic design, content writing, and social media",
    priceFloor: "500",
    customFields: [
      { key: "deliverable_format", label: "Deliverable Format", type: "select", options: ["Photos", "Video (edited)", "Reel / Short", "Graphic / Poster", "Article / Blog", "Social Media Pack", "Other"], required: false },
      { key: "deadline", label: "Delivery Deadline", type: "text" },
    ],
  },
  {
    name: "Consulting & Finance",
    slug: "consulting",
    iconName: "TrendingUp",
    description: "CA/CS services, GST filing, audits, business consulting, and financial planning",
    priceFloor: "1000",
    customFields: [
      { key: "audit_type", label: "Service Type", type: "select", options: ["GST Return", "ITR Filing", "Statutory Audit", "Business Valuation", "Financial Planning", "Company Registration", "FSSAI / Trademark", "Other"], required: false },
      { key: "turnover_bracket", label: "Annual Turnover Bracket", type: "select", options: ["< ₹20L", "₹20L–₹1Cr", "₹1Cr–₹10Cr", "> ₹10Cr"], required: false },
    ],
  },
  {
    name: "Auto Fleet Repair",
    slug: "auto-fleet",
    iconName: "Car",
    description: "Vehicle servicing, fleet maintenance, auto body repair, tyres, and roadside assistance",
    priceFloor: "300",
    customFields: [
      { key: "vehicle_count", label: "Number of Vehicles", type: "text" },
      { key: "repair_type", label: "Repair / Service Type", type: "select", options: ["Periodic Service", "AC Repair", "Brake / Tyre", "Body Work", "Electrical", "Engine Overhaul", "Fleet AMC", "Other"], required: false },
    ],
  },
  {
    name: "Real Estate Services",
    slug: "real-estate",
    iconName: "Building",
    description: "Property search, broker services, site surveys, valuation, and property management",
    priceFloor: "1000",
    customFields: [
      { key: "property_type", label: "Property Type", type: "select", options: ["Residential Flat", "Villa / House", "Commercial Office", "Retail Shop", "Industrial / Warehouse", "Plot / Land"], required: false },
      { key: "service_req", label: "Service Required", type: "select", options: ["Buy", "Sell", "Rent", "Valuation", "Legal Verification", "Property Management"], required: false },
    ],
  },
  {
    name: "Retail Merchandising",
    slug: "retail",
    iconName: "ShoppingBag",
    description: "Store branding, shelf display, planogram execution, promotional setups, and visual merchandising",
    priceFloor: "500",
    customFields: [
      { key: "store_count", label: "Number of Stores", type: "text" },
      { key: "sku_count", label: "Number of SKUs", type: "text" },
    ],
  },
  {
    name: "Hospitality & Catering",
    slug: "hospitality",
    iconName: "ChefHat",
    description: "Catering, chefs on hire, canteen management, hotel supplies, and food services",
    priceFloor: "1000",
    customFields: [
      { key: "plate_count", label: "Number of Plates / Covers", type: "text" },
      { key: "cuisine", label: "Cuisine Type", type: "select", options: ["North Indian", "South Indian", "Continental", "Chinese", "Pan-Asian", "Multi-Cuisine", "Jain / Satvik", "Other"], required: false },
    ],
  },
  {
    name: "Security Services",
    slug: "security",
    iconName: "Shield",
    description: "Unarmed/armed guards, CCTV monitoring, event security, and integrated facility security",
    priceFloor: "500",
    customFields: [
      { key: "guard_count", label: "Number of Guards Required", type: "text" },
      { key: "armed_req", label: "Armed Guards Required?", type: "select", options: ["Yes", "No"], required: false },
    ],
  },
  {
    name: "Beauty & Wellness",
    slug: "beauty",
    iconName: "Sparkles",
    description: "Bridal makeup, salon at home, spa, grooming for events, and wellness packages",
    priceFloor: "300",
    customFields: [
      { key: "client_count", label: "Number of Clients", type: "text" },
      { key: "makeup_type", label: "Service Type", type: "select", options: ["Bridal Makeup", "Party Makeup", "Mehendi", "Hair Styling", "Nail Art", "Full Spa Package", "Other"], required: false },
    ],
  },
  {
    name: "Export / Customs",
    slug: "customs",
    iconName: "Package",
    description: "Customs clearance, freight forwarding, import/export documentation, and EXIM consulting",
    priceFloor: "2000",
    customFields: [
      { key: "hsn_code", label: "HSN / ITC-HS Code", type: "text" },
      { key: "port_name", label: "Port of Entry / Exit", type: "text" },
    ],
  },
  {
    name: "Heavy Machinery",
    slug: "heavy-machinery",
    iconName: "Wrench",
    description: "Crane rental, JCB hire, excavator, bulldozer, and construction equipment on hire",
    priceFloor: "3000",
    customFields: [
      { key: "machine_type", label: "Machine Type", type: "select", options: ["Crane", "JCB / Excavator", "Bulldozer", "Tipper / Dumper", "Concrete Mixer", "Generator", "Forklift", "Other"], required: true },
      { key: "duration_days", label: "Duration (days)", type: "text" },
    ],
  },
];

async function seed() {
  for (const cat of categories) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug));
    if (!existing.length) {
      await db.insert(categoriesTable).values({ ...cat, customFields: cat.customFields as unknown[] });
      console.log("Inserted:", cat.name);
    } else {
      await db.update(categoriesTable).set({ ...cat, customFields: cat.customFields as unknown[] }).where(eq(categoriesTable.slug, cat.slug));
      console.log("Updated:", cat.name);
    }
  }
  console.log("Seeding complete!");
  await db.$client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
