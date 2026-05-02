import {
  pgTable,
  text,
  uuid,
  decimal,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const requirementStatusEnum = pgEnum("requirement_status", [
  "open",
  "accepted",
  "completed",
  "expired",
  "cancelled",
]);

export const requirementsTable = pgTable("requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => usersTable.id),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categoriesTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  customData: jsonb("custom_data"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode"),
  maxBudget: decimal("max_budget", { precision: 12, scale: 2 }).notNull(),
  deadlineHours: integer("deadline_hours").notNull(),
  auctionEndsAt: timestamp("auction_ends_at", { withTimezone: true }).notNull(),
  status: requirementStatusEnum("status").notNull().default("open"),
  attachmentUrl: text("attachment_url"),
  winningBidId: uuid("winning_bid_id"),
  isHighTicket: boolean("is_high_ticket").notNull().default(false),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringInterval: text("recurring_interval"),
  depositAmount: decimal("deposit_amount", { precision: 12, scale: 2 }),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequirementSchema = createInsertSchema(requirementsTable).omit({
  id: true,
  createdAt: true,
  status: true,
  winningBidId: true,
});
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type Requirement = typeof requirementsTable.$inferSelect;
