import { pgTable, uuid, text, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralStatusEnum = pgEnum("referral_status", [
  "pending",
  "clicked",
  "signed_up",
  "converted",
  "rewarded",
]);

export const referralsTable = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: uuid("referrer_id").notNull().references(() => usersTable.id),
  refereeEmail: text("referee_email"),
  refereeId: uuid("referee_id").references(() => usersTable.id),
  code: text("code").notNull().unique(),
  status: referralStatusEnum("status").notNull().default("pending"),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
});

export type Referral = typeof referralsTable.$inferSelect;
