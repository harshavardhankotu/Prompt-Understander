import {
  pgTable, uuid, decimal, text, timestamp, integer, pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";
import { bidsTable } from "./bids";

export const loanStatusEnum = pgEnum("loan_status", [
  "offered", "accepted", "declined", "disbursed", "repaid", "defaulted",
]);

export const loanOffersTable = pgTable("loan_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  requirementId: uuid("requirement_id").references(() => requirementsTable.id),
  bidId: uuid("bid_id").references(() => bidsTable.id),
  loanType: text("loan_type").notNull().default("working_capital"),
  principalAmount: decimal("principal_amount", { precision: 12, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull().default("18.00"),
  tenureDays: integer("tenure_days").notNull().default(30),
  status: loanStatusEnum("status").notNull().default("offered"),
  omniCreditScore: integer("omni_credit_score"),
  disbursedAt: timestamp("disbursed_at", { withTimezone: true }),
  repaidAt: timestamp("repaid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoanOffer = typeof loanOffersTable.$inferSelect;
