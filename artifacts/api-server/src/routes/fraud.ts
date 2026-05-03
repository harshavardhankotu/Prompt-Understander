import { Router, type IRouter } from "express";
import { eq, count, gte, and, sql, desc } from "drizzle-orm";
import {
  db, usersTable, bidsTable, fraudEventsTable, paymentsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

function isAdmin(user: typeof usersTable.$inferSelect) {
  return user.trustScore >= 100 || user.email.endsWith("@omnibid.admin");
}

// Compute fraud score from rules engine
async function computeFraudScore(userId: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return 0;

  let score = 0;

  // Rule 1: Abnormal bid velocity (>5 bids in 1 hour)
  const [recentBids] = await db.select({ count: count() }).from(bidsTable)
    .where(and(eq(bidsTable.providerId, userId), gte(bidsTable.createdAt, oneHourAgo)));
  if (Number(recentBids?.count ?? 0) > 5) score += 30;

  // Rule 2: High withdrawal rate (>60% bids withdrawn)
  const [bidStats] = await db.select({
    total: count(),
    withdrawn: sql<number>`count(*) filter (where status = 'withdrawn')`,
  }).from(bidsTable).where(eq(bidsTable.providerId, userId));
  const withdrawalRate = Number(bidStats?.total ?? 0) > 5
    ? Number(bidStats?.withdrawn ?? 0) / Number(bidStats?.total ?? 1)
    : 0;
  if (withdrawalRate > 0.6) score += 25;

  // Rule 3: Suspicious payout routing — multiple payments in 24 hours
  const [payCount] = await db.select({ count: count() }).from(paymentsTable)
    .where(and(eq(paymentsTable.providerId, userId), gte(paymentsTable.createdAt, oneDayAgo)));
  if (Number(payCount?.count ?? 0) > 8) score += 20;

  // Rule 4: Account age (very new accounts bidding aggressively)
  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 2 && Number(recentBids?.count ?? 0) > 3) score += 20;

  // Rule 5: Not verified but high activity
  if (!user.isVerified && Number(recentBids?.count ?? 0) > 10) score += 15;

  return Math.min(score, 100);
}

// GET /fraud/score — get own fraud score
router.get("/fraud/score", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const fraudScore = await computeFraudScore(userId);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  // Update stored fraud score
  await db.update(usersTable).set({ fraudScore }).where(eq(usersTable.id, userId));

  const riskLevel = fraudScore >= 60 ? "high" : fraudScore >= 30 ? "medium" : "low";
  const holds = fraudScore >= 60 ? ["payout_hold", "manual_review"] : fraudScore >= 30 ? ["additional_verification"] : [];

  res.json({
    fraudScore,
    riskLevel,
    activeHolds: holds,
    breakdown: {
      bidVelocity: "normal",
      withdrawalRate: "normal",
      payoutRouting: "normal",
      accountAge: "established",
    },
    message: riskLevel === "low"
      ? "Your account has a clean fraud record."
      : riskLevel === "medium"
        ? "Some unusual activity detected. Please review your recent actions."
        : "High risk flags active. Payouts may be held for review.",
  });
});

// GET /fraud/events — admin: list fraud events
router.get("/fraud/events", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const events = await db.select({
    id: fraudEventsTable.id,
    userId: fraudEventsTable.userId,
    eventType: fraudEventsTable.eventType,
    severity: fraudEventsTable.severity,
    status: fraudEventsTable.status,
    fraudScore: fraudEventsTable.fraudScore,
    details: fraudEventsTable.details,
    createdAt: fraudEventsTable.createdAt,
    resolvedAt: fraudEventsTable.resolvedAt,
  }).from(fraudEventsTable)
    .orderBy(desc(fraudEventsTable.createdAt))
    .limit(50);

  res.json(events.map(e => ({ ...e, createdAt: e.createdAt.toISOString(), resolvedAt: e.resolvedAt?.toISOString() ?? null })));
});

// POST /fraud/events — admin: manually flag a user
router.post("/fraud/events", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const parsed = z.object({
    userId: z.string().uuid(),
    eventType: z.string().min(1),
    severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    details: z.record(z.unknown()).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const fraudScore = await computeFraudScore(parsed.data.userId);
  const [event] = await db.insert(fraudEventsTable).values({
    userId: parsed.data.userId,
    eventType: parsed.data.eventType,
    severity: parsed.data.severity,
    details: (parsed.data.details ?? {}) as Record<string, unknown>,
    fraudScore,
    status: "flagged",
  }).returning();

  // Update user fraud score
  await db.update(usersTable).set({ fraudScore }).where(eq(usersTable.id, parsed.data.userId));

  res.status(201).json({ ...event, createdAt: event.createdAt.toISOString() });
});

// PUT /fraud/events/:id/review — admin: clear or confirm a fraud event
router.put("/fraud/events/:id/review", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const parsed = z.object({
    status: z.enum(["cleared", "confirmed", "under_review"]),
    reviewNote: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(fraudEventsTable)
    .set({ status: parsed.data.status, reviewedBy: me.id, reviewNote: parsed.data.reviewNote, resolvedAt: ["cleared", "confirmed"].includes(parsed.data.status) ? new Date() : null })
    .where(eq(fraudEventsTable.id, String(req.params.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// GET /fraud/rules — get fraud rule descriptions (public)
router.get("/fraud/rules", requireAuth, async (req, res): Promise<void> => {
  res.json({
    rules: [
      { id: "abnormal_bid_velocity", description: "More than 5 bids in 1 hour", severity: "medium", threshold: ">5 bids/hour" },
      { id: "high_withdrawal_rate", description: "Over 60% of bids withdrawn", severity: "medium", threshold: ">60%" },
      { id: "suspicious_payout_routing", description: "Unusually high payout events in 24 hours", severity: "high", threshold: ">8 payouts/day" },
      { id: "new_account_aggressive_bidding", description: "Account <2 days old with >3 bids/hour", severity: "high", threshold: "account age + bid rate" },
      { id: "collusive_bidding", description: "Same IP or device bidding on same requirement", severity: "critical", threshold: "device fingerprint match" },
      { id: "duplicate_accounts", description: "Multiple accounts from same device/email pattern", severity: "critical", threshold: "identity match" },
      { id: "location_mismatch", description: "Bid location doesn't match registered city", severity: "low", threshold: ">500km mismatch" },
    ],
    effects: {
      high: ["payout_hold", "manual_review", "ranking_suppression"],
      critical: ["account_suspension", "payment_freeze"],
      medium: ["additional_verification"],
      low: ["monitoring_flag"],
    },
  });
});

export default router;
