import { pgTable, text, uuid, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const tdsPreferenceEnum = pgEnum("tds_preference", ["auto", "manual"]);

export const enterpriseSettingsTable = pgTable("enterprise_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseUserId: uuid("enterprise_user_id").notNull().unique().references(() => usersTable.id),
  companyName: text("company_name").notNull(),
  cinNumber: text("cin_number"),
  registeredAddress: text("registered_address"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  tdsPreference: tdsPreferenceEnum("tds_preference").notNull().default("auto"),
  apiWebhookUrl: text("api_webhook_url"),
  teamMembers: jsonb("team_members").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EnterpriseSettings = typeof enterpriseSettingsTable.$inferSelect;
