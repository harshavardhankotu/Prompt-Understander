import { pgTable, text, uuid, jsonb, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoryTierEnum = pgEnum("category_tier", ["retail", "enterprise", "both"]);

export const categoriesTable = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  iconName: text("icon_name").notNull(),
  description: text("description").notNull().default(""),
  tier: categoryTierEnum("tier").notNull().default("retail"),
  customFields: jsonb("custom_fields").notNull().default([]),
  sectorBadges: jsonb("sector_badges").notNull().default({}),
  minBidFloor: decimal("min_bid_floor", { precision: 12, scale: 2 }).notNull().default("0"),
  successFeePct: decimal("success_fee_pct", { precision: 5, scale: 2 }).notNull().default("5.00"),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  id: true,
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
