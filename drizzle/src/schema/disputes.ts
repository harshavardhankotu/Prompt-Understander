import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";
import { bidsTable } from "./bids";

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "provider_responded",
  "resolved",
  "cancelled",
]);

export const disputeResolutionEnum = pgEnum("dispute_resolution", [
  "buyer_wins",
  "provider_wins",
  "mutual",
]);

export const disputesTable = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirementsTable.id),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bidsTable.id),
  raisedById: uuid("raised_by_id")
    .notNull()
    .references(() => usersTable.id),
  respondentId: uuid("respondent_id")
    .notNull()
    .references(() => usersTable.id),
  status: disputeStatusEnum("status").notNull().default("open"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidenceUrl: text("evidence_url"),
  response: text("response"),
  responseEvidenceUrl: text("response_evidence_url"),
  resolution: disputeResolutionEnum("resolution"),
  resolutionNote: text("resolution_note"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({
  id: true,
  createdAt: true,
  status: true,
  resolution: true,
  resolutionNote: true,
  resolvedAt: true,
});
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
