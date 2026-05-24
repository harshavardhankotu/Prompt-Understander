import {
  pgTable,
  uuid,
  integer,
  boolean,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";
import { paymentsTable } from "./payments";

export const workProofsTable = pgTable("work_proofs", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirementsTable.id),
  paymentId: uuid("payment_id")
    .references(() => paymentsTable.id),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => usersTable.id),
  milestoneNumber: integer("milestone_number").notNull().default(1),
  milestoneTitle: text("milestone_title").notNull().default("Work completion"),
  proofUrl: text("proof_url"),
  notes: text("notes").notNull(),
  buyerApproved: boolean("buyer_approved").notNull().default(false),
  buyerNote: text("buyer_note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});

export type WorkProof = typeof workProofsTable.$inferSelect;
