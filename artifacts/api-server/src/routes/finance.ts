import { Router, type IRouter } from "express";
import { eq, count, sum, and, sql } from "drizzle-orm";
import {
  db, usersTable, bidsTable, paymentsTable, requirementsTable,
  loanOffersTable, disputesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const PROVIDER_ROLES = ["provider", "both", "solo_provider", "agency_provider"];

// Compute OmniCredit score and loan eligibility for a provider
async function computeLoanEligibility(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !PROVIDER_ROLES.includes(user.role)) return { eligible: false, reason: "Buyers are not eligible for working capital loans" };

  const [payStats] = await db.select({
    totalEarned: sum(paymentsTable.netToProvider),
    completedCount: count(),
  }).from(paymentsTable).where(and(eq(paymentsTable.providerId, userId), eq(paymentsTable.escrowStatus, "released")));

  const [bidStats] = await db.select({
    total: count(),
    accepted: sql<number>`count(*) filter (where status = 'accepted')`,
    withdrawn: sql<number>`count(*) filter (where status = 'withdrawn')`,
  }).from(bidsTable).where(eq(bidsTable.providerId, userId));

  const [disputeStats] = await db.select({ count: count() }).from(disputesTable)
    .where(eq(disputesTable.raisedById, userId));

  const totalBids = Number(bidStats?.total ?? 0);
  const acceptedBids = Number(bidStats?.accepted ?? 0);
  const withdrawnBids = Number(bidStats?.withdrawn ?? 0);
  const completedPayments = Number(payStats?.completedCount ?? 0);
  const totalEarned = Number(payStats?.totalEarned ?? 0);
  const disputes = Number(disputeStats?.count ?? 0);

  const completionRate = totalBids > 0 ? acceptedBids / totalBids : 0;
  const withdrawalRate = totalBids > 0 ? withdrawnBids / totalBids : 0;
  const disputeRate = acceptedBids > 0 ? disputes / acceptedBids : 0;

  // OmniCredit score: 300-900 based on platform signals
  let score = 500;
  score += Math.min(user.omniScore / 5, 100); // OmniScore contribution (max +100)
  score += Math.min(completedPayments * 15, 150); // Completed jobs (max +150)
  score += Math.round(completionRate * 100); // Completion rate (max +100)
  score -= Math.round(withdrawalRate * 80); // Withdrawal penalty
  score -= Math.round(disputeRate * 150); // Dispute penalty
  if (user.isVerified) score += 30;
  if (user.aadhaarVerified) score += 20;
  score = Math.min(900, Math.max(300, score));

  const eligible = score >= 550 && completedPayments >= 2 && disputeRate < 0.15;

  // Max principal: 40% of average earnings per job, capped at ₹50,000
  const avgEarnings = completedPayments > 0 ? totalEarned / completedPayments : 0;
  const maxPrincipal = Math.min(avgEarnings * 0.4, 50000);

  // Interest rate: lower for higher scores
  const interestRate = score >= 750 ? 15 : score >= 650 ? 17 : 18;

  // Loan type based on role
  const loanType = user.role === "agency_provider"
    ? "mobilization_advance"
    : completedPayments >= 5 ? "working_capital" : "invoice_advance";

  return {
    eligible,
    reason: !eligible
      ? score < 550
        ? `OmniCredit score ${score} is below minimum 550`
        : completedPayments < 2
          ? "Complete at least 2 jobs to unlock working capital loans"
          : "Dispute rate too high — resolve open disputes first"
      : null,
    creditScore: score,
    maxPrincipal: Math.round(maxPrincipal),
    interestRate,
    tenureDays: 30,
    loanType,
    signals: { completedPayments, completionRate: Math.round(completionRate * 100), disputeRate: Math.round(disputeRate * 100), omniScore: user.omniScore },
  };
}

// GET /finance/eligibility — check loan eligibility
router.get("/finance/eligibility", requireAuth, async (req, res): Promise<void> => {
  const eligibility = await computeLoanEligibility(req.user!.userId);
  res.json(eligibility);
});

// GET /finance/loan-offers — list my loan offers
router.get("/finance/loan-offers", requireAuth, async (req, res): Promise<void> => {
  const offers = await db.select().from(loanOffersTable)
    .where(eq(loanOffersTable.userId, req.user!.userId))
    .orderBy(sql`created_at desc`)
    .limit(20);

  res.json(offers.map(o => ({
    ...o,
    principalAmount: Number(o.principalAmount),
    interestRate: Number(o.interestRate),
    disbursedAt: o.disbursedAt?.toISOString() ?? null,
    repaidAt: o.repaidAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  })));
});

// POST /finance/loan-offers/request — request a loan offer
router.post("/finance/loan-offers/request", requireAuth, async (req, res): Promise<void> => {
  const eligibility = await computeLoanEligibility(req.user!.userId);
  if (!eligibility.eligible) {
    res.status(403).json({ error: eligibility.reason ?? "Not eligible" });
    return;
  }

  const parsed = z.object({
    requirementId: z.string().uuid().optional(),
    bidId: z.string().uuid().optional(),
    requestedAmount: z.number().min(1000).max(50000),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const principal = Math.min(parsed.data.requestedAmount, eligibility.maxPrincipal ?? 50000);

  const [offer] = await db.insert(loanOffersTable).values({
    userId: req.user!.userId,
    requirementId: parsed.data.requirementId ?? null,
    bidId: parsed.data.bidId ?? null,
    loanType: eligibility.loanType,
    principalAmount: String(principal),
    interestRate: String(eligibility.interestRate),
    tenureDays: eligibility.tenureDays,
    omniCreditScore: eligibility.creditScore,
    status: "offered",
  }).returning();

  res.status(201).json({
    ...offer,
    principalAmount: Number(offer.principalAmount),
    interestRate: Number(offer.interestRate),
    createdAt: offer.createdAt.toISOString(),
    message: `Loan offer of ₹${principal.toLocaleString("en-IN")} at ${eligibility.interestRate}% p.a. is ready. Approve to disburse within 24 hours.`,
  });
});

// POST /finance/loan-offers/:id/accept
router.post("/finance/loan-offers/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const [offer] = await db.select().from(loanOffersTable)
    .where(and(eq(loanOffersTable.id, String(req.params.id)), eq(loanOffersTable.userId, req.user!.userId)));
  if (!offer || offer.status !== "offered") { res.status(404).json({ error: "Offer not found or already actioned" }); return; }

  const [updated] = await db.update(loanOffersTable)
    .set({ status: "accepted", disbursedAt: new Date() })
    .where(eq(loanOffersTable.id, offer.id))
    .returning();

  // Update user credit score in users table
  await db.update(usersTable).set({ loanEligible: true }).where(eq(usersTable.id, req.user!.userId));

  res.json({ ...updated, principalAmount: Number(updated.principalAmount), status: "accepted", message: "Loan accepted. ₹" + Number(updated.principalAmount).toLocaleString("en-IN") + " will be credited to your linked account within 24 hours." });
});

// POST /finance/loan-offers/:id/decline
router.post("/finance/loan-offers/:id/decline", requireAuth, async (req, res): Promise<void> => {
  const [offer] = await db.select().from(loanOffersTable)
    .where(and(eq(loanOffersTable.id, String(req.params.id)), eq(loanOffersTable.userId, req.user!.userId)));
  if (!offer || offer.status !== "offered") { res.status(404).json({ error: "Offer not found" }); return; }

  await db.update(loanOffersTable).set({ status: "declined" }).where(eq(loanOffersTable.id, offer.id));
  res.json({ ok: true });
});

// GET /finance/whatsapp-pay/eligibility
router.get("/finance/whatsapp-pay/eligibility", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const isBuyer = ["buyer", "both", "retail_buyer"].includes(user.role);
  const eligible = isBuyer && user.isVerified;

  res.json({
    eligible,
    maxTransactionAmount: eligible ? 10000 : 0,
    conditions: ["Must be retail_buyer", "KYC verified", "Max ₹10,000 per transaction", "Low-risk categories only"],
    supportedCategories: ["home", "beauty", "education", "logistics", "healthcare"],
    reason: !eligible ? (user.isVerified ? "Only retail buyers can use WhatsApp Pay" : "Complete KYC verification first") : null,
  });
});

// GET /finance/upi-one-world/eligibility
router.get("/finance/upi-one-world/eligibility", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const supportedCategories = ["events", "hospitality", "travel", "consulting", "creative"];
  res.json({
    eligible: user.isVerified,
    supportedCategories,
    maxTransactionAmount: 500000,
    requirements: ["International payment verification", "Bank account linkage", "KYC complete"],
    fallback: "standard_escrow",
    message: "UPI One World enables international delegates and NRIs to pay without a local bank account.",
  });
});

export default router;
