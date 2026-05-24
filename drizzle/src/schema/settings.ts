import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const settingsTable = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id).unique(),
  role: text("role").notNull(),
  config: jsonb("config").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
