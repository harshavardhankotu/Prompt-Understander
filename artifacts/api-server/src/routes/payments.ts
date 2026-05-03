import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, paymentsTable, workProofsTable, requirementsTable, bidsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const CreatePaymentBody = z.object({
  bidId: z.string().uuid(),
  mobilizationAdvancePct: z.number().min(0).max(50).optional(),
  upiId: z.string().optional(),
  totalMilestones: z.number().min(1).max(10).optional(),
});

const SubmitWorkProofBody = z.object({
  milestoneNumber: z.number().min(1),
  milestoneTitle: z.string().min(1),
  notes: z.string().min(1),
  proofUrl: z.string().optional(),
});

const ApproveMilestoneBody = z.object({
  workProofId: z.string().uuid(),
  approved: z.boolean(),
  buyerNote: z.string().optional(),
});

function calcFees(totalAmount: number) {
  const platformFeePercent = 2.0;
  const platformFeeAmount = Math.round(totalAmount * platformFeePercent / 100);
  const tdsAmount = totalAmount > 30000 ? Math.round(totalAmount * 0.02) : 0;
  const netToProvider = totalAmount - platformFeeAmount - tdsAmount;
  return { platformFeePercent, platformFeeAmount, tdsAmount, netToProvider };
}

function formatPayment(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    requirementId: p.requirementId,
    bidId: p.bidId,
    buyerId: p.buyerId,
    providerId: p.providerId,
    totalAmount: Number(p.totalAmount),
    platformFeePercent: Number(p.platformFeePercent),
    platformFeeAmount: Number(p.platformFeeAmount),
    tdsAmount: Number(p.tdsAmount),
    netToProvider: Number(p.netToProvider),
    mobilizationAdvancePct: p.mobilizationAdvancePct,
    advanceReleased: p.advanceReleased,
    escrowStatus: p.escrowStatus,
    upiTransactionId: p.upiTransactionId,
    milestonesCompleted: p.milestonesCompleted,
    totalMilestones: p.totalMilestones,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/requirements/:requirementId/payment", requireAuth, async (req, res): Promise<void> => {
  const requirementId = Array.isArray(req.params.requirementId)
    ? req.params.requirementId[0]
    : req.params.requirementId;

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.requirementId, requirementId));

  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const workProofs = await db
    .select()
    .from(workProofsTable)
    .where(eq(workProofsTable.requirementId, requirementId));

  res.json({
    payment: formatPayment(payment),
    workProofs: workProofs.map((wp) => ({
      id: wp.id,
      requirementId: wp.requirementId,
      providerId: wp.providerId,
      milestoneNumber: wp.milestoneNumber,
      milestoneTitle: wp.milestoneTitle,
      notes: wp.notes,
      proofUrl: wp.proofUrl,
      buyerApproved: wp.buyerApproved,
      buyerNote: wp.buyerNote,
      submittedAt: wp.submittedAt.toISOString(),
      approvedAt: wp.approvedAt?.toISOString() ?? null,
    })),
  });
});

router.post("/requirements/:requirementId/payment", requireAuth, async (req, res): Promise<void> => {
  const requirementId = Array.isArray(req.params.requirementId)
    ? req.params.requirementId[0]
    : req.params.requirementId;

  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [requirement] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, requirementId));
  if (!requirement) { res.status(404).json({ error: "Requirement not found" }); return; }
  if (requirement.buyerId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.requirementId, requirementId));
  if (existing) { res.json({ payment: formatPayment(existing), workProofs: [] }); return; }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, parsed.data.bidId));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const totalAmount = Number(bid.bidAmount);
  const { platformFeePercent, platformFeeAmount, tdsAmount, netToProvider } = calcFees(totalAmount);
  const mobPct = parsed.data.mobilizationAdvancePct ?? 0;
  const totalMilestones = parsed.data.totalMilestones ?? 1;

  const mockTxnId = `UPI${Date.now().toString(36).toUpperCase()}`;

  const [payment] = await db.insert(paymentsTable).values({
    requirementId,
    bidId: parsed.data.bidId,
    buyerId: req.user!.userId,
    providerId: bid.providerId,
    totalAmount: String(totalAmount),
    platformFeePercent: String(platformFeePercent),
    platformFeeAmount: String(platformFeeAmount),
    tdsAmount: String(tdsAmount),
    netToProvider: String(netToProvider),
    mobilizationAdvancePct: mobPct,
    advanceReleased: mobPct > 0,
    escrowStatus: "held",
    upiTransactionId: mockTxnId,
    totalMilestones,
  }).returning();

  await db.update(requirementsTable)
    .set({ status: "in_progress" })
    .where(eq(requirementsTable.id, requirementId));

  res.status(201).json({ payment: formatPayment(payment), workProofs: [] });
});

router.post("/requirements/:requirementId/payment/submit-proof", requireAuth, async (req, res): Promise<void> => {
  const requirementId = Array.isArray(req.params.requirementId)
    ? req.params.requirementId[0]
    : req.params.requirementId;

  const parsed = SubmitWorkProofBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.requirementId, requirementId));
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  if (payment.providerId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [proof] = await db.insert(workProofsTable).values({
    requirementId,
    paymentId: payment.id,
    providerId: req.user!.userId,
    milestoneNumber: parsed.data.milestoneNumber,
    milestoneTitle: parsed.data.milestoneTitle,
    notes: parsed.data.notes,
    proofUrl: parsed.data.proofUrl ?? null,
  }).returning();

  res.status(201).json({
    id: proof.id,
    requirementId: proof.requirementId,
    providerId: proof.providerId,
    milestoneNumber: proof.milestoneNumber,
    milestoneTitle: proof.milestoneTitle,
    notes: proof.notes,
    proofUrl: proof.proofUrl,
    buyerApproved: proof.buyerApproved,
    buyerNote: proof.buyerNote,
    submittedAt: proof.submittedAt.toISOString(),
    approvedAt: null,
  });
});

router.post("/requirements/:requirementId/payment/approve-milestone", requireAuth, async (req, res): Promise<void> => {
  const requirementId = Array.isArray(req.params.requirementId)
    ? req.params.requirementId[0]
    : req.params.requirementId;

  const parsed = ApproveMilestoneBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.requirementId, requirementId));
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  if (payment.buyerId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [proof] = await db.update(workProofsTable)
    .set({
      buyerApproved: parsed.data.approved,
      buyerNote: parsed.data.buyerNote ?? null,
      approvedAt: parsed.data.approved ? new Date() : null,
    })
    .where(and(eq(workProofsTable.id, parsed.data.workProofId), eq(workProofsTable.requirementId, requirementId)))
    .returning();

  if (!proof) { res.status(404).json({ error: "Work proof not found" }); return; }

  if (parsed.data.approved) {
    const newCompleted = payment.milestonesCompleted + 1;
    const allDone = newCompleted >= payment.totalMilestones;
    await db.update(paymentsTable)
      .set({
        milestonesCompleted: newCompleted,
        escrowStatus: allDone ? "released" : "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(paymentsTable.id, payment.id));

    if (allDone) {
      await db.update(requirementsTable)
        .set({ status: "completed" })
        .where(eq(requirementsTable.id, requirementId));
    }
  }

  res.json({
    id: proof.id,
    requirementId: proof.requirementId,
    providerId: proof.providerId,
    milestoneNumber: proof.milestoneNumber,
    milestoneTitle: proof.milestoneTitle,
    notes: proof.notes,
    proofUrl: proof.proofUrl,
    buyerApproved: proof.buyerApproved,
    buyerNote: proof.buyerNote,
    submittedAt: proof.submittedAt.toISOString(),
    approvedAt: proof.approvedAt?.toISOString() ?? null,
  });
});

export default router;
