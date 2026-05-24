import {
  pgTable,
  uuid,
  decimal,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";

export const counterOfferStatusEnum = pgEnum("counter_offer_status", [
  "none",
  "pending",
  "accepted",
  "declined",
]);

export const negotiationsTable = pgTable("negotiations", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirementsTable.id),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => usersTable.id),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => usersTable.id),
  messages: jsonb("messages").notNull().default([]),
  counterOfferAmount: decimal("counter_offer_amount", { precision: 12, scale: 2 }),
  counterOfferStatus: counterOfferStatusEnum("counter_offer_status").notNull().default("none"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Negotiation = typeof negotiationsTable.$inferSelect;
