import {
  pgTable, uuid, decimal, text, timestamp, boolean, integer, jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requirementsTable } from "./requirements";

export const gpsTrackingTable = pgTable("gps_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  requirementId: uuid("requirement_id").notNull().references(() => requirementsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull().default("provider"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  status: text("status").notNull().default("en_route"),
  etaMinutes: integer("eta_minutes"),
  speedKmh: decimal("speed_kmh", { precision: 6, scale: 2 }),
  accuracyMeters: integer("accuracy_meters"),
  isSharing: boolean("is_sharing").notNull().default(true),
  routeData: jsonb("route_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GpsTracking = typeof gpsTrackingTable.$inferSelect;
