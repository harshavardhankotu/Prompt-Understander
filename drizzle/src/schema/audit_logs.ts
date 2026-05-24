import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  action: text("action").notNull(), // e.g., 'login', 'bid_submitted', 'settings_updated'
  entityType: text("entity_type"), // e.g., 'requirement', 'bid', 'user'
  entityId: uuid("entity_id"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
