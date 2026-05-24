import {
  pgTable, uuid, decimal, text, timestamp, integer, jsonb,
} from "drizzle-orm/pg-core";
import { requirementsTable } from "./requirements";

export const requirementLotsTable = pgTable("requirement_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id").notNull().references(() => requirementsTable.id),
  lotNumber: integer("lot_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  city: text("city"),
  pincode: text("pincode"),
  maxBudget: decimal("max_budget", { precision: 12, scale: 2 }),
  winningBidId: uuid("winning_bid_id"),
  status: text("status").notNull().default("open"),
  customData: jsonb("custom_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RequirementLot = typeof requirementLotsTable.$inferSelect;
