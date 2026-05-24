import { Router, type IRouter } from "express";
import { eq, count, and } from "drizzle-orm";
import { db, referralsTable, usersTable } from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

function generateCode(userId: string) {
  return `OB${userId.substring(0, 6).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

router.get("/referrals/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const referrals = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, userId));
  const [stats] = await db.select({
    total: count(),
    converted: count(),
  }).from(referralsTable).where(eq(referralsTable.referrerId, userId));

  const convertedCount = referrals.filter(r => ["converted", "rewarded"].includes(r.status)).length;
  const totalReward = referrals.reduce((acc, r) => acc + Number(r.rewardAmount ?? 0), 0);

  const referralCode = `OB${userId.substring(0, 8).toUpperCase()}`;

  res.json({
    referralCode,
    referralLink: `https://omnibid.in/join?ref=${referralCode}`,
    totalReferrals: referrals.length,
    convertedReferrals: convertedCount,
    totalRewardEarned: totalReward,
    pendingReward: referrals.filter(r => r.status === "signed_up").reduce((acc, r) => acc + Number(r.rewardAmount ?? 0), 0),
    referrals: referrals.map(r => ({
      id: r.id,
      refereeEmail: r.refereeEmail ?? null,
      status: r.status,
      rewardAmount: Number(r.rewardAmount ?? 0),
      createdAt: r.createdAt.toISOString(),
      convertedAt: r.convertedAt?.toISOString() ?? null,
    })),
  });
});

router.post("/referrals/invite", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({
    email: z.string().email("Invalid email"),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const userId = req.user!.userId;
  const code = generateCode(userId);

  const [referral] = await db.insert(referralsTable).values({
    referrerId: userId,
    refereeEmail: parsed.data.email,
    code,
    status: "pending",
    rewardAmount: "200",
  }).returning();

  res.status(201).json({
    id: referral.id,
    refereeEmail: referral.refereeEmail,
    code: referral.code,
    status: referral.status,
    rewardAmount: Number(referral.rewardAmount ?? 0),
    createdAt: referral.createdAt.toISOString(),
  });
});

// Called on signup if referral_code provided
router.post("/referrals/convert", async (req, res): Promise<void> => {
  const parsed = z.object({ referralCode: z.string(), newUserId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [referral] = await db.select().from(referralsTable).where(
    and(eq(referralsTable.code, parsed.data.referralCode))
  );
  if (!referral) { res.status(404).json({ error: "Referral not found" }); return; }

  const [updated] = await db.update(referralsTable).set({
    refereeId: parsed.data.newUserId,
    status: "signed_up",
    convertedAt: new Date(),
  }).where(eq(referralsTable.id, referral.id)).returning();

  res.json({ ok: true, referralId: updated.id });
});

export default router;
