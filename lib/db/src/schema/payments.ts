import {
  pgTable,
  uuid,
  decimal,
  integer,
  boolean,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";
import { bidsTable } from "./bids";

export const escrowStatusEnum = pgEnum("escrow_status", [
  "pending",
  "held",
  "in_progress",
  "released",
  "disputed",
  "refunded",
]);

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirementsTable.id),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bidsTable.id),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => usersTable.id),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => usersTable.id),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  platformFeePercent: decimal("platform_fee_percent", { precision: 5, scale: 2 }).notNull().default("2.00"),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 12, scale: 2 }).notNull(),
  tdsAmount: decimal("tds_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  netToProvider: decimal("net_to_provider", { precision: 12, scale: 2 }).notNull(),
  mobilizationAdvancePct: integer("mobilization_advance_pct").notNull().default(0),
  advanceReleased: boolean("advance_released").notNull().default(false),
  escrowStatus: escrowStatusEnum("escrow_status").notNull().default("pending"),
  upiTransactionId: text("upi_transaction_id"),
  milestonesCompleted: integer("milestones_completed").notNull().default(0),
  totalMilestones: integer("total_milestones").notNull().default(1),
  paymentMethod: text("payment_method").notNull().default("upi"),
  whatsappPayStatus: text("whatsapp_pay_status"),
  upiOneWorldUsed: boolean("upi_one_world_used").notNull().default(false),
  loanLinkedAmount: decimal("loan_linked_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
