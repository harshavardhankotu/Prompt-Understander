import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, paymentsTable, workProofsTable, requirementsTable, bidsTable } from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";
import { recalculateOmniScore } from "../lib/credit";
import Razorpay from "razorpay";
import crypto from "crypto";

const router: IRouter = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mockkey",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_mocksecret",
});

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
  if (existing) {
    if (existing.escrowStatus !== "pending") {
      res.json({ payment: formatPayment(existing), workProofs: [] });
      return;
    }
    // Re-generate order for pending payment
    let order;
    try {
      const amountInPaise = Math.round((Number(existing.totalAmount) + Number(existing.platformFeeAmount)) * 100);
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${requirementId.substring(0, 10)}_${Date.now().toString(36)}`,
        notes: {
          requirementId,
          bidId: existing.bidId,
          buyerId: req.user!.userId,
        },
      });
      await db.update(paymentsTable)
        .set({ upiTransactionId: order.id })
        .where(eq(paymentsTable.id, existing.id));
      existing.upiTransactionId = order.id;
    } catch (err) {
      order = {
        id: existing.upiTransactionId || `order_${Date.now().toString(36)}`,
        amount: Math.round((Number(existing.totalAmount) + Number(existing.platformFeeAmount)) * 100),
        currency: "INR",
      };
    }
    res.json({
      payment: formatPayment(existing),
      workProofs: [],
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mockkey",
    });
    return;
  }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, parsed.data.bidId));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const totalAmount = Number(bid.bidAmount);
  const { platformFeePercent, platformFeeAmount, tdsAmount, netToProvider } = calcFees(totalAmount);
  const mobPct = parsed.data.mobilizationAdvancePct ?? 0;
  const totalMilestones = parsed.data.totalMilestones ?? 1;

  let order;
  try {
    const amountInPaise = Math.round((totalAmount + platformFeeAmount) * 100);
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${requirementId.substring(0, 10)}_${Date.now().toString(36)}`,
      notes: {
        requirementId,
        bidId: parsed.data.bidId,
        buyerId: req.user!.userId,
      },
    });
  } catch (err) {
    order = {
      id: `order_${Date.now().toString(36)}`,
      amount: Math.round((totalAmount + platformFeeAmount) * 100),
      currency: "INR",
    };
  }

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
    advanceReleased: false,
    escrowStatus: "pending",
    upiTransactionId: order.id,
    totalMilestones,
  }).returning();

  res.status(201).json({
    payment: formatPayment(payment),
    workProofs: [],
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mockkey",
  });
});

const VerifySignatureBody = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

router.post("/requirements/:requirementId/payment/verify-signature", requireAuth, async (req, res): Promise<void> => {
  const requirementId = Array.isArray(req.params.requirementId)
    ? req.params.requirementId[0]
    : req.params.requirementId;

  const parsed = VerifySignatureBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  // Verify the signature
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_mocksecret";
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  // In sandbox, we also allow standard verification bypass if keys are mock
  const isMock = keySecret === "rzp_test_mocksecret";
  const isSignatureValid = expectedSignature === razorpay_signature || (isMock && razorpay_signature === "mock_signature");

  if (!isSignatureValid) {
    res.status(400).json({ error: "Invalid payment signature verification failed." });
    return;
  }

  // Find the pending payment record for this order
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.upiTransactionId, razorpay_order_id));

  if (!payment) {
    res.status(404).json({ error: "Payment record for this order not found." });
    return;
  }

  // Update payment status to 'held' and capture payment ID
  const [updatedPayment] = await db
    .update(paymentsTable)
    .set({
      escrowStatus: "held",
      upiTransactionId: razorpay_payment_id,
      advanceReleased: payment.mobilizationAdvancePct > 0,
      updatedAt: new Date(),
    })
    .where(eq(paymentsTable.id, payment.id))
    .returning();

  // Update requirement status to 'in_progress'
  await db
    .update(requirementsTable)
    .set({ status: "in_progress" })
    .where(eq(requirementsTable.id, payment.requirementId));

  res.json({
    success: true,
    payment: formatPayment(updatedPayment),
  });
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
      
      // Recalculate OmniCredit score for the provider
      await recalculateOmniScore(payment.providerId);
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
