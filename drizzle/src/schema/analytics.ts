import { pgTable, text, uuid, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Removed duplicate definition of analyticsEventsTable.
// It is defined in analytics_events.ts.

export const referralEventsTable = pgTable("referral_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: uuid("referrer_id").notNull().references(() => usersTable.id),
  referredId: uuid("referred_id").references(() => usersTable.id),
  referralCode: text("referral_code").notNull(),
  status: text("status").notNull().default("pending"), // pending, converted
  rewardAmount: decimal("reward_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaignAttributionTable = pgTable("campaign_attribution", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
