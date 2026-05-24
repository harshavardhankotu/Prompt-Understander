import {
  pgTable, uuid, text, timestamp, integer, boolean, jsonb,
} from "drizzle-orm/pg-core";
import { requirementsTable } from "./requirements";

export const auctionConfigsTable = pgTable("auction_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id").notNull().unique().references(() => requirementsTable.id),
  auctionType: text("auction_type").notNull().default("standard"),
  maxRounds: integer("max_rounds").notNull().default(1),
  currentRound: integer("current_round").notNull().default(1),
  lotCount: integer("lot_count").notNull().default(1),
  vendorQualificationRequired: boolean("vendor_qualification_required").notNull().default(false),
  qualifiedVendorIds: jsonb("qualified_vendor_ids").$type<string[]>().default([]),
  sealedRevealAt: timestamp("sealed_reveal_at", { withTimezone: true }),
  rankingMode: text("ranking_mode").notNull().default("balanced"),
  roundDeadlines: jsonb("round_deadlines").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuctionConfig = typeof auctionConfigsTable.$inferSelect;
