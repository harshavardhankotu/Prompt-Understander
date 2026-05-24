import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const complianceVaultTable = pgTable("compliance_vault", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  aadhaarStatus: text("aadhaar_status").notNull().default("pending"),
  panNumber: text("pan_number"),
  gstNumber: text("gst_number"),
  mcaRegistration: text("mca_registration"),
  insuranceUploadUrl: text("insurance_upload_url"),
  insuranceExpiryDate: timestamp("insurance_expiry_date", { withTimezone: true }),
  complianceScore: integer("compliance_score").notNull().default(0),
  nmcRegistration: text("nmc_registration"), // healthcare
  barCouncilNumber: text("bar_council_number"), // legal
  fssaiNumber: text("fssai_number"), // food/hospitality
  transportLicense: text("transport_license"), // logistics
  isEmpanelled: boolean("is_empanelled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ComplianceVault = typeof complianceVaultTable.$inferSelect;
