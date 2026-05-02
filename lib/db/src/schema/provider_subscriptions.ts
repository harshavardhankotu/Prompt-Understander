import {
  pgTable,
  uuid,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "starter",
  "pro",
]);

export const providerSubscriptionsTable = pgTable("provider_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .unique()
    .references(() => usersTable.id),
  plan: subscriptionPlanEnum("plan").notNull().default("free"),
  planStartedAt: timestamp("plan_started_at", { withTimezone: true }),
  planEndsAt: timestamp("plan_ends_at", { withTimezone: true }),
  bidsRemaining: integer("bids_remaining").notNull().default(5),
});

export const insertProviderSubscriptionSchema = createInsertSchema(
  providerSubscriptionsTable
).omit({ id: true });
export type InsertProviderSubscription = z.infer<
  typeof insertProviderSubscriptionSchema
>;
export type ProviderSubscription =
  typeof providerSubscriptionsTable.$inferSelect;
