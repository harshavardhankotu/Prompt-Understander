import { db, categoriesTable } from "./index";
import { eq } from "drizzle-orm";

const categories = [
  {
    name: "Healthcare",
    slug: "healthcare",
    iconName: "Heart",
    description: "Medical procedures, consultations, diagnostics, surgeries, and wellness services",
    customFields: [
      { key: "specialty", label: "Medical Specialty", type: "select", options: ["General", "Cardiology", "Orthopedics", "Dentistry", "Ophthalmology", "Neurology", "Gynecology", "Pediatrics"], required: false },
    ],
  },
  {
    name: "Logistics",
    slug: "logistics",
    iconName: "Truck",
    description: "Courier, packers & movers, freight, and transport services",
    customFields: [
      { key: "weight_kg", label: "Weight (kg)", type: "text" },
      { key: "pickup_date", label: "Pickup Date", type: "text" },
    ],
  },
  {
    name: "Legal",
    slug: "legal",
    iconName: "Scale",
    description: "Lawyers, legal documentation, property registration, and court representation",
    customFields: [
      { key: "case_type", label: "Case Type", type: "select", options: ["Civil", "Criminal", "Property", "Divorce", "Corporate", "IPR", "Labour"], required: false },
    ],
  },
  {
    name: "Travel",
    slug: "travel",
    iconName: "Plane",
    description: "Flights, hotels, tour packages, visa assistance, and travel planning",
    customFields: [
      { key: "destination", label: "Destination", type: "text" },
      { key: "travel_date", label: "Travel Date", type: "text" },
      { key: "pax", label: "Number of Passengers", type: "text" },
    ],
  },
  {
    name: "Tech & IT",
    slug: "tech",
    iconName: "Code",
    description: "Web development, mobile apps, IT support, software, and tech solutions",
    customFields: [
      { key: "tech_stack", label: "Preferred Technology", type: "text" },
      { key: "timeline", label: "Deadline", type: "text" },
    ],
  },
  {
    name: "Education",
    slug: "education",
    iconName: "BookOpen",
    description: "Tutors, coaching, online courses, exam prep, and skill development",
    customFields: [
      { key: "subject", label: "Subject", type: "text" },
      { key: "grade_level", label: "Grade / Level", type: "text" },
    ],
  },
  {
    name: "Home Services",
    slug: "home",
    iconName: "Home",
    description: "Plumbing, electrical, cleaning, painting, carpentry, and repair services",
    customFields: [
      { key: "service_type", label: "Service Type", type: "select", options: ["Plumbing", "Electrical", "Cleaning", "Painting", "Carpentry", "AC Repair", "Pest Control", "Other"] },
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
