import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  eventName: text("event_name").notNull(),
  eventData: jsonb("event_data").default({}),
  sessionId: text("session_id"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  referralCode: text("referral_code"),
  city: text("city"),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
