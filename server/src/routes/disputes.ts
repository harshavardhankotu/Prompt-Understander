import { Router, type IRouter } from "express";
import { eq, or, and, desc, gte, like } from "drizzle-orm";
import { db, disputesTable, requirementsTable, bidsTable, usersTable, paymentsTable } from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { notifyUser } from "../lib/notifications";
import { z } from "zod";

const router: IRouter = Router();

const CreateDisputeBody = z.object({
  requirementId: z.string(),
  bidId: z.string(),
  title: z.string().min(5),
  description: z.string().min(10),
  evidenceUrl: z.string().optional(),
});

const RespondDisputeBody = z.object({
  response: z.string().min(10),
  responseEvidenceUrl: z.string().optional(),
});

const ResolveDisputeBody = z.object({
  resolution: z.enum(["buyer_wins", "provider_wins", "mutual"]),
  resolutionNote: z.string().min(5),
});

async function formatDispute(d: typeof disputesTable.$inferSelect) {
  const [raisedBy] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, d.raisedById));
  const [respondent] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, d.respondentId));
  const [req] = await db.select({ title: requirementsTable.title }).from(requirementsTable).where(eq(requirementsTable.id, d.requirementId));
  return {
    id: d.id,
    requirementId: d.requirementId,
    requirementTitle: req?.title ?? "",
    bidId: d.bidId,
    raisedById: d.raisedById,
    raisedByName: raisedBy?.name ?? "Unknown",
    respondentId: d.respondentId,
    respondentName: respondent?.name ?? "Unknown",
    status: d.status,
    title: d.title,
    description: d.description,
    evidenceUrl: d.evidenceUrl,
    response: d.response,
    responseEvidenceUrl: d.responseEvidenceUrl,
    resolution: d.resolution,
    resolutionNote: d.resolutionNote,
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/disputes", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const disputes = await db
    .select()
    .from(disputesTable)
    .where(or(eq(disputesTable.raisedById, userId), eq(disputesTable.respondentId, userId)))
    .orderBy(desc(disputesTable.createdAt));
  res.json(await Promise.all(disputes.map(formatDispute)));
});

router.post("/disputes", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDisputeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { requirementId, bidId, title, description, evidenceUrl } = parsed.data;

  const [requirement] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, requirementId));
  if (!requirement) { res.status(404).json({ error: "Requirement not found" }); return; }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const isBuyer = requirement.buyerId === req.user!.userId;
  const isProvider = bid.providerId === req.user!.userId;
  if (!isBuyer && !isProvider) { res.status(403).json({ error: "Forbidden" }); return; }

  const respondentId = isBuyer ? bid.providerId : requirement.buyerId;

  const existing = await db.select().from(disputesTable).where(
    and(eq(disputesTable.requirementId, requirementId), eq(disputesTable.raisedById, req.user!.userId))
  );
  if (existing.length) { res.status(400).json({ error: "You already have a dispute for this requirement" }); return; }

  const [dispute] = await db.insert(disputesTable).values({
    requirementId,
    bidId,
    raisedById: req.user!.userId,
    respondentId,
    title,
    description,
    evidenceUrl: evidenceUrl ?? null,
  }).returning();

  await notifyUser(respondentId, "dispute_raised", `A dispute has been raised: "${title}"`, { requirementId, disputeId: dispute.id });

  res.status(201).json(await formatDispute(dispute));
});

router.post("/disputes/:id/respond", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = RespondDisputeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, id));
  if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }
  if (dispute.respondentId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (dispute.status !== "open") { res.status(400).json({ error: "Dispute is not open" }); return; }

  const [updated] = await db.update(disputesTable).set({
    response: parsed.data.response,
    responseEvidenceUrl: parsed.data.responseEvidenceUrl ?? null,
    status: "provider_responded",
  }).where(eq(disputesTable.id, id)).returning();

  await notifyUser(dispute.raisedById, "dispute_response", `Your dispute "${dispute.title}" has received a response`, { disputeId: id });

  res.json(await formatDispute(updated));
});

router.post("/disputes/:id/resolve", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ResolveDisputeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, id));
  if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }

  const isParty = dispute.raisedById === req.user!.userId || dispute.respondentId === req.user!.userId;
  if (!isParty) { res.status(403).json({ error: "Forbidden" }); return; }
  if (dispute.status === "resolved" || dispute.status === "cancelled") {
    res.status(400).json({ error: "Dispute already closed" }); return;
  }

  const [updated] = await db.update(disputesTable).set({
    resolution: parsed.data.resolution,
    resolutionNote: parsed.data.resolutionNote,
    status: "resolved",
    resolvedAt: new Date(),
  }).where(eq(disputesTable.id, id)).returning();

  const otherId = req.user!.userId === dispute.raisedById ? dispute.respondentId : dispute.raisedById;
  await notifyUser(otherId, "dispute_resolved", `Dispute "${dispute.title}" has been resolved`, { disputeId: id });

  res.json(await formatDispute(updated));
});

const TriggerDisputeBody = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(10).optional(),
  evidenceUrl: z.string().optional(),
});

/**
 * POST /api/requirements/:requirementId/dispute
 * Allows either the Buyer or the Provider to raise an official dispute on an escrow payment.
 * This freezes the escrow funds (blocking release and approvals) and alerts administrators.
 */
router.post("/requirements/:requirementId/dispute", requireAuth, async (req, res): Promise<void> => {
  const requirementId = Array.isArray(req.params.requirementId)
    ? req.params.requirementId[0]
    : req.params.requirementId;

  const parsed = TriggerDisputeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // 1. Fetch requirement and payment record
  const [requirement] = await db
    .select()
    .from(requirementsTable)
    .where(eq(requirementsTable.id, requirementId));

  if (!requirement) {
    res.status(404).json({ error: "Requirement not found" });
    return;
  }

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.requirementId, requirementId));

  if (!payment) {
    res.status(404).json({ error: "Payment escrow record not found for this requirement." });
    return;
  }

  // 2. Validate requester is party to this transaction (Buyer or Provider)
  const isBuyer = requirement.buyerId === req.user!.userId;
  const isProvider = payment.providerId === req.user!.userId;

  if (!isBuyer && !isProvider) {
    res.status(403).json({ error: "Forbidden: Only the buyer or provider can dispute this transaction." });
    return;
  }

  // 3. Verify escrow is in a state that can be disputed
  if (payment.escrowStatus !== "held" && payment.escrowStatus !== "in_progress") {
    res.status(400).json({
      error: `Cannot raise dispute: escrow is currently in '${payment.escrowStatus}' state. Only active escrows ('held' or 'in_progress') can be disputed.`,
    });
    return;
  }

  const title = parsed.data.title || "Official Payment Dispute Raised";
  const description = parsed.data.description || "A payment dispute has been officially raised on this transaction by a participating party.";
  const respondentId = isBuyer ? payment.providerId : requirement.buyerId;

  try {
    const [dispute] = await db.transaction(async (tx) => {
      // A. Update payment status to "disputed"
      await tx
        .update(paymentsTable)
        .set({
          escrowStatus: "disputed",
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id));

      // B. Update requirement status to "disputed"
      await tx
        .update(requirementsTable)
        .set({
          status: "disputed",
        })
        .where(eq(requirementsTable.id, requirementId));

      // C. Insert dispute record
      const [disp] = await tx
        .insert(disputesTable)
        .values({
          requirementId,
          bidId: payment.bidId,
          raisedById: req.user!.userId,
          respondentId,
          title,
          description,
          evidenceUrl: parsed.data.evidenceUrl ?? null,
          status: "open",
        })
        .returning();

      return [disp];
    });

    // 4. Alert admins (trustScore >= 100 or email ending in @omnibid.admin)
    const admins = await db
      .select()
      .from(usersTable)
      .where(
        or(
          gte(usersTable.trustScore, 100),
          like(usersTable.email, "%@omnibid.admin")
        )
      );

    for (const admin of admins) {
      await notifyUser(
        admin.id,
        "dispute_raised",
        `[ADMIN ALERT] Dispute raised on requirement "${requirement.title}"`,
        { requirementId, disputeId: dispute.id }
      ).catch(() => {/* non-critical */});
    }

    // 5. Notify opposing party
    await notifyUser(
      respondentId,
      "dispute_raised",
      `A dispute has been raised on requirement "${requirement.title}"`,
      { requirementId, disputeId: dispute.id }
    ).catch(() => {/* non-critical */});

    res.status(201).json(await formatDispute(dispute));
  } catch (error) {
    console.error("Failed to raise dispute in transaction:", error);
    res.status(500).json({ error: "Failed to raise dispute due to database error." });
  }
});

export default router;
