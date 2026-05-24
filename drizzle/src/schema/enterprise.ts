import { pgTable, text, uuid, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const empanelmentTable = pgTable("empanelment", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseId: uuid("enterprise_id").notNull().references(() => usersTable.id),
  providerId: uuid("provider_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("active"), // active, suspended, expired
  rateCardCeiling: decimal("rate_card_ceiling", { precision: 12, scale: 2 }),
  categoryRestrictionId: uuid("category_restriction_id").references(() => categoriesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
