import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "buyer",
  "provider",
  "both",
  "retail_buyer",
  "enterprise_buyer",
  "solo_provider",
  "agency_provider",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isProfileComplete: boolean("is_profile_complete").notNull().default(false),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("retail_buyer"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  avatarUrl: text("avatar_url"),
  trustScore: integer("trust_score").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  aadhaarVerified: boolean("aadhaar_verified").notNull().default(false),
  gstNumber: text("gst_number"),
  crewSize: integer("crew_size").default(1),
  benchAvailableFrom: text("bench_available_from"),
  omniScore: integer("omni_score").notNull().default(0),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  fraudScore: integer("fraud_score").notNull().default(0),
  creditScore: integer("credit_score").notNull().default(500),
  loanEligible: boolean("loan_eligible").notNull().default(false),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  serviceRadiusKm: integer("service_radius_km").default(50),
  referralCode: text("referral_code"),
  referredBy: uuid("referred_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  trustScore: true,
  isVerified: true,
  aadhaarVerified: true,
  omniScore: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
