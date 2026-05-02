import { Router, type IRouter } from "express";
import { eq, and, desc, count, min, sql } from "drizzle-orm";
import { db, requirementsTable, categoriesTable, usersTable, bidsTable } from "@workspace/db";
import { CreateRequirementBody, ListRequirementsQueryParams, AcceptBidBody } from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { notifyUser } from "../lib/notifications";

const router: IRouter = Router();

function formatReq(r: typeof requirementsTable.$inferSelect, cat: typeof categoriesTable.$inferSelect, buyer: typeof usersTable.$inferSelect, bidCount: number, lowestBid: number | null) {
  return {
    id: r.id,
    buyerId: r.buyerId,
    categoryId: r.categoryId,
    categoryName: cat.name,
    categorySlug: cat.slug,
    categoryIconName: cat.iconName,
    title: r.title,
    description: r.description,
    customData: r.customData,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    maxBudget: Number(r.maxBudget),
    deadlineHours: r.deadlineHours,
    auctionEndsAt: r.auctionEndsAt.toISOString(),
    status: r.status,
    attachmentUrl: r.attachmentUrl,
    winningBidId: r.winningBidId,
    isHighTicket: r.isHighTicket,
    isRecurring: r.isRecurring,
    recurringInterval: r.recurringInterval,
    depositAmount: r.depositAmount ? Number(r.depositAmount) : null,
    depositPaid: r.depositPaid,
    bidCount,
    lowestBid,
    buyerName: buyer.name,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/requirements", optionalAuth, async (req, res): Promise<void> => {
  const params = ListRequirementsQueryParams.safeParse(req.query);

  const conditions = [];
  if (params.success) {
    if (params.data.categoryId) conditions.push(eq(requirementsTable.categoryId, params.data.categoryId as string));
    if (params.data.city) conditions.push(eq(requirementsTable.city, params.data.city as string));
    if (params.data.status) conditions.push(eq(requirementsTable.status, params.data.status as "open" | "accepted" | "completed" | "expired" | "cancelled"));
    else conditions.push(eq(requirementsTable.status, "open"));
  } else {
    conditions.push(eq(requirementsTable.status, "open"));
  }

  const limit = params.success && params.data.limit ? Number(params.data.limit) : 20;
  const offset = params.success && params.data.offset ? Number(params.data.offset) : 0;

  const rows = await db
    .select()
    .from(requirementsTable)
    .where(and(...conditions))
    .orderBy(desc(requirementsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(requirementsTable)
    .where(and(...conditions));

  const results = await Promise.all(rows.map(async (r) => {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, r.categoryId));
    const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, r.buyerId));
    const [bidStats] = await db
      .select({ count: count(), minBid: min(bidsTable.bidAmount) })
      .from(bidsTable)
      .where(and(eq(bidsTable.requirementId, r.id), eq(bidsTable.status, "active")));

    return formatReq(r, cat, buyer, Number(bidStats?.count ?? 0), bidStats?.minBid ? Number(bidStats.minBid) : null);
  }));

  res.json({ requirements: results, total: Number(total) });
});

router.post("/requirements", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRequirementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { categoryId, title, description, customData, city, state, pincode, maxBudget, deadlineHours, attachmentUrl, isRecurring, recurringInterval } = parsed.data;
  const auctionEndsAt = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);
  const isHighTicket = maxBudget > 10000;
  const depositAmount = isHighTicket ? String(Math.round(maxBudget * 0.1)) : null;

  const [requirement] = await db.insert(requirementsTable).values({
    buyerId: req.user!.userId,
    categoryId,
    title,
    description,
    customData: customData ?? null,
    city,
    state,
    pincode: pincode ?? null,
    maxBudget: String(maxBudget),
    deadlineHours,
    auctionEndsAt,
    isHighTicket,
    isRecurring: isRecurring ?? false,
    recurringInterval: recurringInterval ?? null,
    depositAmount,
    attachmentUrl: attachmentUrl ?? null,
  }).returning();

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  res.status(201).json(formatReq(requirement, cat, buyer, 0, null));
});

router.get("/requirements/my", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(requirementsTable)
    .where(eq(requirementsTable.buyerId, req.user!.userId))
    .orderBy(desc(requirementsTable.createdAt));

  const results = await Promise.all(rows.map(async (r) => {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, r.categoryId));
    const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, r.buyerId));
    const [bidStats] = await db
      .select({ count: count(), minBid: min(bidsTable.bidAmount) })
      .from(bidsTable)
      .where(eq(bidsTable.requirementId, r.id));
    return formatReq(r, cat, buyer, Number(bidStats?.count ?? 0), bidStats?.minBid ? Number(bidStats.minBid) : null);
  }));

  res.json(results);
});

router.get("/requirements/stats/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [stats] = await db
    .select({
      count: count(),
      minBid: min(bidsTable.bidAmount),
      maxBid: sql<string>`MAX(${bidsTable.bidAmount})`,
      avgBid: sql<string>`AVG(${bidsTable.bidAmount})`,
    })
    .from(bidsTable)
    .where(and(eq(bidsTable.requirementId, id), eq(bidsTable.status, "active")));

  const bidCount = Number(stats?.count ?? 0);

  res.json({
    requirementId: id,
    bidCount,
    lowestBid: stats?.minBid ? Number(stats.minBid) : null,
    highestBid: stats?.maxBid ? Number(stats.maxBid) : null,
    avgBid: stats?.avgBid ? Number(stats.avgBid) : null,
    isBidWar: bidCount >= 5,
  });
});

router.get("/requirements/:id", optionalAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [requirement] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, id));
  if (!requirement) {
    res.status(404).json({ error: "Requirement not found" });
    return;
  }

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, requirement.categoryId));
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, requirement.buyerId));

  const bids = await db
    .select()
    .from(bidsTable)
    .where(eq(bidsTable.requirementId, id))
    .orderBy(desc(bidsTable.isHighlighted), bidsTable.bidAmount);

  const bidsWithProvider = await Promise.all(bids.map(async (b) => {
    const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, b.providerId));
    return {
      id: b.id,
      requirementId: b.requirementId,
      providerId: b.providerId,
      bidAmount: Number(b.bidAmount),
      message: b.message,
      proofOfWork: b.proofOfWork,
      portfolioUrl: b.portfolioUrl,
      estimatedCompletion: b.estimatedCompletion,
      executorType: b.executorType,
      subcontractorName: b.subcontractorName,
      status: b.status,
      isHighlighted: b.isHighlighted,
      providerName: provider?.name ?? "Unknown",
      providerCity: provider?.city ?? null,
      providerTrustScore: provider?.trustScore ?? 0,
      providerIsVerified: provider?.isVerified ?? false,
      providerAvgRating: null,
      providerReviewCount: 0,
      providerSubscriptionPlan: null,
      createdAt: b.createdAt.toISOString(),
    };
  }));

  const [bidStats] = await db
    .select({ count: count(), minBid: min(bidsTable.bidAmount) })
    .from(bidsTable)
    .where(and(eq(bidsTable.requirementId, id), eq(bidsTable.status, "active")));

  res.json({
    ...formatReq(requirement, cat, buyer, Number(bidStats?.count ?? 0), bidStats?.minBid ? Number(bidStats.minBid) : null),
    buyer: {
      id: buyer.id,
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      role: buyer.role,
      city: buyer.city,
      state: buyer.state,
      pincode: buyer.pincode,
      avatarUrl: buyer.avatarUrl,
      trustScore: buyer.trustScore,
      isVerified: buyer.isVerified,
      aadhaarVerified: buyer.aadhaarVerified,
      createdAt: buyer.createdAt.toISOString(),
    },
    bids: bidsWithProvider,
    category: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      iconName: cat.iconName,
      description: cat.description,
      customFields: cat.customFields,
      priceFloor: cat.priceFloor ? Number(cat.priceFloor) : null,
    },
  });
});

router.post("/requirements/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [requirement] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, id));
  if (!requirement) { res.status(404).json({ error: "Not found" }); return; }
  if (requirement.buyerId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const [updated] = await db.update(requirementsTable).set({ status: "cancelled" }).where(eq(requirementsTable.id, id)).returning();
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId));
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, updated.buyerId));
  res.json(formatReq(updated, cat, buyer, 0, null));
});

router.post("/requirements/:id/accept-bid", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = AcceptBidBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [requirement] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, id));
  if (!requirement) { res.status(404).json({ error: "Not found" }); return; }
  if (requirement.buyerId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, parsed.data.bidId));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  await db.update(bidsTable).set({ status: "accepted" }).where(eq(bidsTable.id, parsed.data.bidId));
  await db.update(bidsTable).set({ status: "rejected" }).where(and(eq(bidsTable.requirementId, id), sql`${bidsTable.id} != ${parsed.data.bidId}`));
  const [updated] = await db.update(requirementsTable)
    .set({ status: "accepted", winningBidId: parsed.data.bidId })
    .where(eq(requirementsTable.id, id))
    .returning();

  await notifyUser(bid.providerId, "bid_accepted", `Your bid for "${requirement.title}" was accepted! Contact the buyer to proceed.`, { requirementId: id, bidId: parsed.data.bidId });

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId));
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [bidStats] = await db.select({ count: count(), minBid: min(bidsTable.bidAmount) }).from(bidsTable).where(eq(bidsTable.requirementId, id));
  res.json(formatReq(updated, cat, buyer, Number(bidStats?.count ?? 0), bidStats?.minBid ? Number(bidStats.minBid) : null));
});

router.post("/requirements/:id/repost", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [requirement] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, id));
  if (!requirement) { res.status(404).json({ error: "Not found" }); return; }
  if (requirement.buyerId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!["expired", "completed", "cancelled", "accepted"].includes(requirement.status)) {
    res.status(400).json({ error: "Can only repost completed, expired, accepted, or cancelled requirements" }); return;
  }

  const auctionEndsAt = new Date(Date.now() + requirement.deadlineHours * 60 * 60 * 1000);

  const [reposted] = await db.insert(requirementsTable).values({
    buyerId: requirement.buyerId,
    categoryId: requirement.categoryId,
    title: requirement.title,
    description: requirement.description,
    customData: requirement.customData as Record<string, unknown> | null,
    city: requirement.city,
    state: requirement.state,
    pincode: requirement.pincode,
    maxBudget: requirement.maxBudget,
    deadlineHours: requirement.deadlineHours,
    auctionEndsAt,
    isHighTicket: requirement.isHighTicket,
    isRecurring: requirement.isRecurring,
    recurringInterval: requirement.recurringInterval,
    depositAmount: requirement.depositAmount,
    attachmentUrl: requirement.attachmentUrl,
  }).returning();

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, reposted.categoryId));
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, reposted.buyerId));

  res.status(201).json(formatReq(reposted, cat, buyer, 0, null));
});

export default router;
