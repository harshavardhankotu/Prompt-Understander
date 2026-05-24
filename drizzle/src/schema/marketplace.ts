import { pgTable, text, uuid, decimal, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";

export const syndicateMembersTable = pgTable("syndicate_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id").notNull().references(() => requirementsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

// Removed duplicate definitions of bidsTable, negotiationsTable, and reviewsTable.
// They are defined in their respective specialized schema files.
