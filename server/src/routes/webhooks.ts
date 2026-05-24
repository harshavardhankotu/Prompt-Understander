import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, usersTable, requirementsTable, bidsTable,
  categoriesTable, complianceVaultTable, providerSubscriptionsTable
} from "@omnibid/db";
import { z } from "zod";
import { notifyUser } from "../lib/notifications";

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

export default router;
