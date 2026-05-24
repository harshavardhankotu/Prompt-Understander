import { pgTable, uuid, jsonb, timestamp, text, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const availabilityStatusEnum = pgEnum("availability_status", ["active", "paused", "away"]);

export const userSettingsTable = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => usersTable.id),
  language: text("language").notNull().default("en"), // en, te, hi, ta, mr
  cityDefault: text("city_default"),
  coverageRadiusKm: integer("coverage_radius_km").notNull().default(25),
  waOptedIn: boolean("wa_opted_in").notNull().default(false),
  contactSyncConsented: boolean("contact_sync_consented").notNull().default(false),
  availabilityStatus: availabilityStatusEnum("availability_status").notNull().default("active"),
  notificationPrefs: jsonb("notification_prefs").notNull().default({}),
  paymentMethods: jsonb("payment_methods").notNull().default([]),
  savedBidTemplates: jsonb("saved_bid_templates").notNull().default([]),
  categoryPreferences: uuid("category_preferences").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
