import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
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
  isEmpanelled: boolean("is_empanelled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ComplianceVault = typeof complianceVaultTable.$inferSelect;
