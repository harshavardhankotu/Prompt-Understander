import { pgTable, uuid, text, decimal, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const rateCardsTable = pgTable("rate_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  enterpriseBuyerId: uuid("enterprise_buyer_id").notNull().references(() => usersTable.id),
  categoryId: uuid("category_id").references(() => categoriesTable.id),
  name: text("name").notNull(),
  maxRatePerProject: decimal("max_rate_per_project", { precision: 12, scale: 2 }),
  maxRatePerHour: decimal("max_rate_per_hour", { precision: 10, scale: 2 }),
  empanelledVendorIds: jsonb("empanelled_vendor_ids").default([]),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RateCard = typeof rateCardsTable.$inferSelect;
