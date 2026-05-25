import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, usersTable, requirementsTable, bidsTable,
  categoriesTable, complianceVaultTable, providerSubscriptionsTable,
  paymentsTable
} from "@omnibid/db";
import { z } from "zod";
import { notifyUser } from "../lib/notifications";
import crypto from "crypto";

const router: IRouter = Router();

const WhatsappWebhookBody = z.object({
  from: z.string().min(5),
  text: z.string().min(1),
});

/**
 * POST /api/webhooks/whatsapp
 * Parses a simple text message from WhatsApp and records a bid for a provider.
 * Format: "BID <requirementId> <amount> <pitch...>"
 */
router.post("/webhooks/whatsapp", async (req, res): Promise<void> => {
  const parsed = WhatsappWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { from, text } = parsed.data;

  // Normalize phone number (e.g. remove +91 prefix)
  const normalizedPhone = from.replace(/^\+91/, "").replace(/\s+/g, "");

  // 1. Look up provider by phone number
  const [provider] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, normalizedPhone));

  if (!provider) {
    res.status(404).json({
      success: false,
      reply: "We could not find an OmniBid account registered with this phone number. Please register first.",
    });
    return;
  }

  if (!["solo_provider", "agency_provider"].includes(provider.role)) {
    res.status(403).json({
      success: false,
      reply: "Only verified providers can bid via WhatsApp.",
    });
    return;
  }

  // 2. Parse text bidding message
  // Match pattern: BID <requirementId> <amount> <pitch>
  const match = text.match(/^BID\s+([a-f0-9\-]{36})\s+(\d+(?:\.\d+)?)\s+(.+)$/i);
  if (!match) {
    res.status(400).json({
      success: false,
      reply: "Invalid format. Please send: BID [Requirement_ID] [Amount] [Your Pitch Message]",
    });
    return;
  }

  const requirementId = match[1];
  const bidAmount = Number(match[2]);
  const message = match[3];

  // 3. Look up requirement
  const [requirement] = await db
    .select()
    .from(requirementsTable)
    .where(eq(requirementsTable.id, requirementId));

  if (!requirement || requirement.status !== "open") {
    res.status(400).json({
      success: false,
      reply: "This requirement is either not found or closed for bidding.",
    });
    return;
  }

  // 4. Verify Compliance Vault
  const [vault] = await db
    .select()
    .from(complianceVaultTable)
    .where(eq(complianceVaultTable.userId, provider.id));

  if (!vault || (vault.aadhaarStatus !== "verified" && !provider.aadhaarVerified)) {
    res.status(403).json({
      success: false,
      reply: "Bidding blocked. Please complete Aadhaar verification in the Compliance Vault first.",
    });
    return;
  }

  // 5. Enforce minBidFloor
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, requirement.categoryId));

  if (category?.minBidFloor && bidAmount < Number(category.minBidFloor)) {
    res.status(400).json({
      success: false,
      reply: `Bidding failed. Your bid is below the minimum floor of ₹${category.minBidFloor} for this category.`,
    });
    return;
  }

  // 6. Check subscription bids remaining
  const [sub] = await db
    .select()
    .from(providerSubscriptionsTable)
    .where(eq(providerSubscriptionsTable.providerId, provider.id));

  if (sub && sub.bidsRemaining <= 0 && sub.plan === "free") {
    res.status(403).json({
      success: false,
      reply: "You have 0 bids remaining on your free plan. Please upgrade to submit more bids.",
    });
    return;
  }

  // 7. Insert bid
  const [bid] = await db.insert(bidsTable).values({
    requirementId,
    providerId: provider.id,
    bidAmount: String(bidAmount),
    message,
    status: "active",
    bidSource: "whatsapp",
    isHighlighted: false,
    estimatedCompletion: "3 days",
    executorType: "self",
  }).returning();

  if (sub && sub.plan === "free") {
    await db
      .update(providerSubscriptionsTable)
      .set({ bidsRemaining: sub.bidsRemaining - 1 })
      .where(eq(providerSubscriptionsTable.id, sub.id));
  }

  // Notify buyer of WhatsApp bid
  await notifyUser(
    requirement.buyerId,
    "new_bid",
    `New bid of ₹${bidAmount} received via WhatsApp for "${requirement.title}"`,
    { requirementId, bidId: bid.id }
  );

  res.json({
    success: true,
    reply: `Success! Your bid of ₹${bidAmount} for "${requirement.title}" has been successfully recorded.`,
  });
});

/**
 * POST /api/webhooks/razorpay
 * Verifies Razorpay signature and updates the escrow/payment status to "held" asynchronously.
 */
router.post("/webhooks/razorpay", async (req, res): Promise<void> => {
  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    res.status(400).json({ error: "Missing x-razorpay-signature header" });
    return;
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  // Verify HMAC-SHA256 signature
  const rawBody = (req as any).rawBody;
  const bodyString = rawBody ? rawBody.toString("utf-8") : JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(bodyString)
    .digest("hex");

  const isMock = !secret || secret === "mock_secret";
  const isSignatureValid = expectedSignature === signature || (isMock && signature === "mock_signature");

  if (!isSignatureValid) {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const { event, payload } = req.body;

  if (event !== "payment.captured" && event !== "order.paid") {
    res.json({ success: true, message: `Event '${event}' ignored.` });
    return;
  }

  let razorpayOrderId: string | undefined;
  let razorpayPaymentId: string | undefined;
  let requirementId: string | undefined;

  if (event === "payment.captured") {
    const paymentEntity = payload?.payment?.entity;
    razorpayPaymentId = paymentEntity?.id;
    razorpayOrderId = paymentEntity?.order_id;
    requirementId = paymentEntity?.notes?.requirementId;
  } else if (event === "order.paid") {
    const orderEntity = payload?.order?.entity;
    razorpayOrderId = orderEntity?.id;
    requirementId = orderEntity?.notes?.requirementId;
  }

  // Look up payment record in DB
  let paymentRecord;
  if (razorpayOrderId) {
    const [pmt] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.upiTransactionId, razorpayOrderId));
    paymentRecord = pmt;
  }
  if (!paymentRecord && razorpayPaymentId) {
    const [pmt] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.upiTransactionId, razorpayPaymentId));
    paymentRecord = pmt;
  }
  if (!paymentRecord && requirementId) {
    const [pmt] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.requirementId, requirementId));
    paymentRecord = pmt;
  }

  if (!paymentRecord) {
    res.status(404).json({ error: "Associated payment record not found" });
    return;
  }

  // Idempotency check: If the escrow status is already 'held' (or beyond, e.g. released), return success directly
  if (paymentRecord.escrowStatus !== "pending") {
    res.json({
      success: true,
      message: `Payment already processed (current status: '${paymentRecord.escrowStatus}')`,
      paymentId: paymentRecord.id,
    });
    return;
  }

  const targetPaymentId = razorpayPaymentId || `pay_mock_${Date.now().toString(36)}`;

  // Wrap in a database transaction to ensure atomicity
  try {
    await db.transaction(async (tx) => {
      // 1. Update payment status to 'held' and capture payment ID
      await tx
        .update(paymentsTable)
        .set({
          escrowStatus: "held",
          upiTransactionId: targetPaymentId,
          advanceReleased: paymentRecord.mobilizationAdvancePct > 0,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, paymentRecord.id));

      // 2. Update requirement status to 'in_progress'
      await tx
        .update(requirementsTable)
        .set({ status: "in_progress" })
        .where(eq(requirementsTable.id, paymentRecord.requirementId));
    });

    res.json({
      success: true,
      message: "Payment successfully updated to 'held' via Webhook.",
      paymentId: paymentRecord.id,
    });
  } catch (error) {
    console.error("Failed to update payment in webhook transaction:", error);
    res.status(500).json({ error: "Failed to process webhook transaction" });
  }
});

export default router;
