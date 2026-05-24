import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { requirementsTable } from "./requirements";

export const requirementSubtasksTable = pgTable("requirement_subtasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id").notNull().references(() => requirementsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
