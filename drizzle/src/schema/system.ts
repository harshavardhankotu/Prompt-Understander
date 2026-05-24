import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";

export const userContactsTable = pgTable("user_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  contactUserId: uuid("contact_user_id").notNull().references(() => usersTable.id),
  source: text("source").notNull().default("manual"), // manual, contact_sync, previous_transaction
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Removed duplicate definitions of notificationsTable and disputesTable.
// They are defined in their respective specialized schema files.
