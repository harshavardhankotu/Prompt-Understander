import {
  pgTable,
  text,
  uuid,
  decimal,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";

export const bidStatusEnum = pgEnum("bid_status", [
  "active",
  "envelope_a_pending",
  "envelope_a_approved",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const executorTypeEnum = pgEnum("executor_type", [
  "self",
  "partial",
]);

export const bidsTable = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirementsTable.id),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => usersTable.id),
  bidAmount: decimal("bid_amount", { precision: 12, scale: 2 }).notNull(),
  message: text("message").notNull(),
  proofOfWork: text("proof_of_work"),
  portfolioUrl: text("portfolio_url"),
  estimatedCompletion: text("estimated_completion").notNull(),
  executorType: executorTypeEnum("executor_type").notNull().default("self"),
  subcontractorName: text("subcontractor_name"),
  envelopeAUrl: text("envelope_a_url"),
  crewSizeOffered: integer("crew_size_offered"),
  isBackhaul: boolean("is_backhaul").notNull().default(false),
  bidSource: text("bid_source").notNull().default("web"),
  status: bidStatusEnum("status").notNull().default("active"),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  roundNumber: integer("round_number").notNull().default(1),
  lotId: uuid("lot_id"),
  fraudScore: integer("fraud_score").notNull().default(0),
  rankingScore: decimal("ranking_score", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({
  id: true,
  createdAt: true,
  status: true,
});
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
