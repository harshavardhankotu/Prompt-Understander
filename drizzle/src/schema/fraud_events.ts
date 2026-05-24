import {
  pgTable, uuid, text, timestamp, integer, jsonb, pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const fraudSeverityEnum = pgEnum("fraud_severity", [
  "low", "medium", "high", "critical",
]);
export const fraudStatusEnum = pgEnum("fraud_status", [
  "flagged", "under_review", "cleared", "confirmed",
]);

export const fraudEventsTable = pgTable("fraud_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  eventType: text("event_type").notNull(),
  severity: fraudSeverityEnum("severity").notNull().default("low"),
  status: fraudStatusEnum("status").notNull().default("flagged"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  fraudScore: integer("fraud_score").notNull().default(0),
  reviewedBy: uuid("reviewed_by"),
  reviewNote: text("review_note"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FraudEvent = typeof fraudEventsTable.$inferSelect;
