import {
  pgTable, uuid, decimal, text, timestamp, integer, jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";

export const vendorRankingsTable = pgTable("vendor_rankings", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id").notNull().references(() => requirementsTable.id),
  vendorId: uuid("vendor_id").notNull().references(() => usersTable.id),
  rankingScore: decimal("ranking_score", { precision: 6, scale: 2 }).notNull().default("0"),
  rankPosition: integer("rank_position"),
  rankLabel: text("rank_label"),
  rankingMode: text("ranking_mode").notNull().default("balanced"),
  scoreBreakdown: jsonb("score_breakdown").$type<Record<string, number>>(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VendorRanking = typeof vendorRankingsTable.$inferSelect;
