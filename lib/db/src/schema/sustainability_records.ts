import {
  pgTable, uuid, decimal, text, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { requirementsTable } from "./requirements";
import { bidsTable } from "./bids";

export const sustainabilityRecordsTable = pgTable("sustainability_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id").notNull().references(() => requirementsTable.id),
  bidId: uuid("bid_id").references(() => bidsTable.id),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
  estimatedCarbonKg: decimal("estimated_carbon_kg", { precision: 10, scale: 3 }),
  localProviderBonus: decimal("local_provider_bonus", { precision: 5, scale: 2 }),
  routeEfficiencyScore: decimal("route_efficiency_score", { precision: 5, scale: 2 }),
  sustainabilityLabel: text("sustainability_label"),
  fuelSavedLitres: decimal("fuel_saved_litres", { precision: 8, scale: 3 }),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SustainabilityRecord = typeof sustainabilityRecordsTable.$inferSelect;
