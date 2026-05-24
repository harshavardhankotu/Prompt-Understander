import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminSettingsTable = pgTable("admin_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  lastUpdatedBy: uuid("last_updated_by").references(() => usersTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminSettings = typeof adminSettingsTable.$inferSelect;
