import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, providerSubscriptionsTable } from "@omnibid/db";
import { UpgradeSubscriptionBody } from "@omnibid/api-zod";
import { requireAuth } from "../middlewares/auth";

const PLAN_BIDS: Record<string, number> = { free: 5, starter: 30, pro: 999 };

const router: IRouter = Router();

router.get("/subscriptions/my", requireAuth, async (req, res): Promise<void> => {
  let [sub] = await db.select().from(providerSubscriptionsTable).where(eq(providerSubscriptionsTable.providerId, req.user!.userId));

  if (!sub) {
    [sub] = await db.insert(providerSubscriptionsTable).values({ providerId: req.user!.userId, plan: "free", bidsRemaining: 5 }).returning();
  }

  res.json({
    id: sub.id,
    providerId: sub.providerId,
    plan: sub.plan,
    planStartedAt: sub.planStartedAt?.toISOString() ?? null,
    planEndsAt: sub.planEndsAt?.toISOString() ?? null,
    bidsRemaining: sub.bidsRemaining,
  });
});

router.post("/subscriptions/upgrade", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpgradeSubscriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const plan = parsed.data.plan;
  const now = new Date();
  const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let [sub] = await db.select().from(providerSubscriptionsTable).where(eq(providerSubscriptionsTable.providerId, req.user!.userId));

  if (sub) {
    [sub] = await db.update(providerSubscriptionsTable).set({ plan: plan as "free" | "starter" | "pro", planStartedAt: now, planEndsAt: endsAt, bidsRemaining: PLAN_BIDS[plan] ?? 5 }).where(eq(providerSubscriptionsTable.id, sub.id)).returning();
  } else {
    [sub] = await db.insert(providerSubscriptionsTable).values({ providerId: req.user!.userId, plan: plan as "free" | "starter" | "pro", planStartedAt: now, planEndsAt: endsAt, bidsRemaining: PLAN_BIDS[plan] ?? 5 }).returning();
  }

  res.json({
    id: sub.id,
    providerId: sub.providerId,
    plan: sub.plan,
    planStartedAt: sub.planStartedAt?.toISOString() ?? null,
    planEndsAt: sub.planEndsAt?.toISOString() ?? null,
    bidsRemaining: sub.bidsRemaining,
  });
});

export default router;
