import { Router, type IRouter } from "express";
import { eq, count, sum, avg, gte, lte, and, sql } from "drizzle-orm";
import {
  db, usersTable, requirementsTable, bidsTable, paymentsTable,
  disputesTable, reviewsTable, categoriesTable, analyticsEventsTable,
} from "@omnibid/db";
import { optionalAuth, requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

// Track analytics event
router.post("/analytics/events", optionalAuth, async (req, res): Promise<void> => {
  const parsed = z.object({
    eventName: z.string().min(1).max(100),
    eventData: z.record(z.unknown()).optional(),
    sessionId: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    referralCode: z.string().optional(),
    city: z.string().optional(),
    category: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  await db.insert(analyticsEventsTable).values({
    userId: req.user?.userId ?? null,
    eventName: parsed.data.eventName,
    eventData: (parsed.data.eventData ?? {}) as Record<string, unknown>,
    sessionId: parsed.data.sessionId,
    utmSource: parsed.data.utmSource,
    utmMedium: parsed.data.utmMedium,
    utmCampaign: parsed.data.utmCampaign,
    referralCode: parsed.data.referralCode,
    city: parsed.data.city,
    category: parsed.data.category,
  });
  res.status(201).json({ ok: true });
});

// Dashboard - role-based analytics
router.get("/analytics/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const isBuyer = ["buyer", "both", "retail_buyer", "enterprise_buyer"].includes(user.role);
  const isProvider = ["provider", "both", "solo_provider", "agency_provider"].includes(user.role);

  if (isBuyer) {
    // Buyer analytics
    const [reqStats] = await db.select({
      total: count(),
      open: sql<number>`count(*) filter (where status = 'open')`,
      accepted: sql<number>`count(*) filter (where status = 'accepted')`,
      completed: sql<number>`count(*) filter (where status = 'completed')`,
      inProgress: sql<number>`count(*) filter (where status = 'in_progress')`,
      totalSpend: sum(paymentsTable.totalAmount),
    }).from(requirementsTable)
      .leftJoin(paymentsTable, eq(paymentsTable.requirementId, requirementsTable.id))
      .where(eq(requirementsTable.buyerId, userId));

    const [bidStats] = await db.select({
      totalBids: count(),
      avgBid: avg(bidsTable.bidAmount),
    }).from(bidsTable)
      .innerJoin(requirementsTable, eq(bidsTable.requirementId, requirementsTable.id))
      .where(eq(requirementsTable.buyerId, userId));

    const recentReqs = await db.select({
      id: requirementsTable.id,
      title: requirementsTable.title,
      status: requirementsTable.status,
      bidCount: sql<number>`(select count(*) from bids where requirement_id = requirements.id)`,
      maxBudget: requirementsTable.maxBudget,
      createdAt: requirementsTable.createdAt,
      auctionEndsAt: requirementsTable.auctionEndsAt,
    }).from(requirementsTable)
      .where(and(eq(requirementsTable.buyerId, userId), gte(requirementsTable.createdAt, thirtyDaysAgo)))
      .orderBy(sql`created_at desc`)
      .limit(5);

    // Bids per requirement chart data
    const categoryBreakdown = await db.select({
      categoryName: categoriesTable.name,
      count: count(),
      avgBudget: avg(requirementsTable.maxBudget),
    }).from(requirementsTable)
      .innerJoin(categoriesTable, eq(requirementsTable.categoryId, categoriesTable.id))
      .where(eq(requirementsTable.buyerId, userId))
      .groupBy(categoriesTable.name);

    const [disputes] = await db.select({ count: count() }).from(disputesTable)
      .where(eq(disputesTable.raisedById, userId));

    res.json({
      role: user.role,
      summary: {
        totalRequirements: Number(reqStats?.total ?? 0),
        openRequirements: Number(reqStats?.open ?? 0),
        acceptedRequirements: Number(reqStats?.accepted ?? 0),
        completedRequirements: Number(reqStats?.completed ?? 0),
        inProgressRequirements: Number(reqStats?.inProgress ?? 0),
        totalBidsReceived: Number(bidStats?.totalBids ?? 0),
        avgBidAmount: Number(bidStats?.avgBid ?? 0),
        totalSpend: Number(reqStats?.totalSpend ?? 0),
        disputes: Number(disputes?.count ?? 0),
      },
      recentRequirements: recentReqs.map(r => ({
        ...r, maxBudget: Number(r.maxBudget), bidCount: Number(r.bidCount),
        createdAt: r.createdAt.toISOString(), auctionEndsAt: r.auctionEndsAt.toISOString(),
      })),
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c.categoryName, count: Number(c.count), avgBudget: Number(c.avgBudget ?? 0),
      })),
    });
  } else if (isProvider) {
    // Provider analytics
    const [bidStats] = await db.select({
      total: count(),
      accepted: sql<number>`count(*) filter (where status = 'accepted')`,
      active: sql<number>`count(*) filter (where status = 'active')`,
      withdrawn: sql<number>`count(*) filter (where status = 'withdrawn')`,
      totalValue: sum(bidsTable.bidAmount),
    }).from(bidsTable).where(eq(bidsTable.providerId, userId));

    const [payStats] = await db.select({
      totalEarned: sum(paymentsTable.netToProvider),
      inEscrow: sql<number>`sum(net_to_provider) filter (where escrow_status = 'held')`,
      released: sql<number>`sum(net_to_provider) filter (where escrow_status = 'released')`,
      count: count(),
    }).from(paymentsTable).where(eq(paymentsTable.providerId, userId));

    const [reviewStats] = await db.select({
      avgRating: avg(reviewsTable.rating),
      count: count(),
    }).from(reviewsTable).where(eq(reviewsTable.revieweeId, userId));

    const recentBids = await db.select({
      id: bidsTable.id,
      requirementId: bidsTable.requirementId,
      bidAmount: bidsTable.bidAmount,
      status: bidsTable.status,
      createdAt: bidsTable.createdAt,
      requirementTitle: requirementsTable.title,
    }).from(bidsTable)
      .innerJoin(requirementsTable, eq(bidsTable.requirementId, requirementsTable.id))
      .where(and(eq(bidsTable.providerId, userId), gte(bidsTable.createdAt, thirtyDaysAgo)))
      .orderBy(sql`bids.created_at desc`)
      .limit(5);

    const weeklyBids = await db.select({
      count: count(),
      totalValue: sum(bidsTable.bidAmount),
    }).from(bidsTable)
      .where(and(eq(bidsTable.providerId, userId), gte(bidsTable.createdAt, sevenDaysAgo)));

    res.json({
      role: user.role,
      summary: {
        totalBids: Number(bidStats?.total ?? 0),
        acceptedBids: Number(bidStats?.accepted ?? 0),
        activeBids: Number(bidStats?.active ?? 0),
        winRate: bidStats?.total ? Math.round((Number(bidStats.accepted) / Number(bidStats.total)) * 100) : 0,
        totalBidValue: Number(bidStats?.totalValue ?? 0),
        totalEarned: Number(payStats?.totalEarned ?? 0),
        inEscrow: Number(payStats?.inEscrow ?? 0),
        releasedToAccount: Number(payStats?.released ?? 0),
        avgRating: Number(reviewStats?.avgRating ?? 0),
        reviewCount: Number(reviewStats?.count ?? 0),
        weeklyBids: Number(weeklyBids?.[0]?.count ?? 0),
      },
      recentBids: recentBids.map(b => ({
        ...b, bidAmount: Number(b.bidAmount), createdAt: b.createdAt.toISOString(),
      })),
      omniScore: user.omniScore,
      trustScore: user.trustScore,
    });
  }
});

// Admin analytics — global platform stats
router.get("/analytics/admin", requireAuth, async (req, res): Promise<void> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [userStats] = await db.select({
    total: count(),
    buyers: sql<number>`count(*) filter (where role in ('buyer','retail_buyer','enterprise_buyer','both'))`,
    providers: sql<number>`count(*) filter (where role in ('provider','solo_provider','agency_provider','both'))`,
    verified: sql<number>`count(*) filter (where is_verified = true)`,
  }).from(usersTable);

  const [reqStats] = await db.select({
    total: count(),
    open: sql<number>`count(*) filter (where status = 'open')`,
    completed: sql<number>`count(*) filter (where status = 'completed')`,
    inProgress: sql<number>`count(*) filter (where status = 'in_progress')`,
    thisMonth: sql<number>`count(*) filter (where created_at >= ${thirtyDaysAgo})`,
  }).from(requirementsTable);

  const [bidStats] = await db.select({
    total: count(),
    thisMonth: sql<number>`count(*) filter (where created_at >= ${thirtyDaysAgo})`,
  }).from(bidsTable);

  const [payStats] = await db.select({
    totalVolume: sum(paymentsTable.totalAmount),
    platformRevenue: sum(paymentsTable.platformFeeAmount),
    escrowHeld: sql<number>`sum(total_amount) filter (where escrow_status = 'held')`,
    released: sql<number>`sum(total_amount) filter (where escrow_status = 'released')`,
    count: count(),
  }).from(paymentsTable);

  const [disputeStats] = await db.select({
    total: count(),
    open: sql<number>`count(*) filter (where status = 'open')`,
    resolved: sql<number>`count(*) filter (where status = 'resolved')`,
  }).from(disputesTable);

  const sectorActivity = await db.select({
    categoryName: categoriesTable.name,
    categorySlug: categoriesTable.slug,
    requirementCount: count(requirementsTable.id),
    minBidFloor: categoriesTable.minBidFloor,
  }).from(categoriesTable)
    .leftJoin(requirementsTable, eq(requirementsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id)
    .orderBy(sql`count(requirements.id) desc`);

  const cityActivity = await db.select({
    city: requirementsTable.city,
    count: count(),
  }).from(requirementsTable)
    .groupBy(requirementsTable.city)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  const recentEvents = await db.select().from(analyticsEventsTable)
    .orderBy(sql`created_at desc`)
    .limit(20);

  res.json({
    users: { total: Number(userStats?.total ?? 0), buyers: Number(userStats?.buyers ?? 0), providers: Number(userStats?.providers ?? 0), verified: Number(userStats?.verified ?? 0) },
    requirements: { total: Number(reqStats?.total ?? 0), open: Number(reqStats?.open ?? 0), completed: Number(reqStats?.completed ?? 0), inProgress: Number(reqStats?.inProgress ?? 0), thisMonth: Number(reqStats?.thisMonth ?? 0) },
    bids: { total: Number(bidStats?.total ?? 0), thisMonth: Number(bidStats?.thisMonth ?? 0) },
    payments: {
      totalVolume: Number(payStats?.totalVolume ?? 0),
      platformRevenue: Number(payStats?.platformRevenue ?? 0),
      escrowHeld: Number(payStats?.escrowHeld ?? 0),
      released: Number(payStats?.released ?? 0),
      count: Number(payStats?.count ?? 0),
    },
    disputes: { total: Number(disputeStats?.total ?? 0), open: Number(disputeStats?.open ?? 0), resolved: Number(disputeStats?.resolved ?? 0) },
    sectorActivity: sectorActivity.map(s => ({ categoryName: s.categoryName, categorySlug: s.categorySlug, requirementCount: Number(s.requirementCount), minBidFloor: Number(s.minBidFloor ?? 0), priceFloor: Number(s.minBidFloor ?? 0) })),
    cityActivity: cityActivity.map(c => ({ city: c.city, count: Number(c.count) })),
    recentEvents: recentEvents.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
  });
});

// Funnel data
router.get("/analytics/funnel", requireAuth, async (req, res): Promise<void> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total] = await db.select({ count: count() }).from(usersTable).where(gte(usersTable.createdAt, thirtyDaysAgo));
  const [withReq] = await db.select({ count: sql<number>`count(distinct buyer_id)` }).from(requirementsTable).where(gte(requirementsTable.createdAt, thirtyDaysAgo));
  const [withBid] = await db.select({ count: sql<number>`count(distinct provider_id)` }).from(bidsTable).where(gte(bidsTable.createdAt, thirtyDaysAgo));
  const [withAccept] = await db.select({ count: sql<number>`count(distinct buyer_id)` }).from(requirementsTable).where(and(gte(requirementsTable.createdAt, thirtyDaysAgo), eq(requirementsTable.status, "accepted")));
  const [withPayment] = await db.select({ count: count() }).from(paymentsTable).where(gte(paymentsTable.createdAt, thirtyDaysAgo));
  const [withComplete] = await db.select({ count: count() }).from(requirementsTable).where(and(gte(requirementsTable.createdAt, thirtyDaysAgo), eq(requirementsTable.status, "completed")));

  res.json([
    { stage: "Signed Up", count: Number(total?.count ?? 0) },
    { stage: "Posted Requirement", count: Number(withReq?.count ?? 0) },
    { stage: "Bids Received", count: Number(withBid?.count ?? 0) },
    { stage: "Bid Accepted", count: Number(withAccept?.count ?? 0) },
    { stage: "Payment Initiated", count: Number(withPayment?.count ?? 0) },
    { stage: "Work Completed", count: Number(withComplete?.count ?? 0) },
  ]);
});

// GET /analytics/hub-density
router.get("/analytics/hub-density", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = await db.select({
      city: requirementsTable.city,
      categoryName: categoriesTable.name,
      bidCount: count(bidsTable.id),
      avgBidAmount: avg(bidsTable.bidAmount),
    }).from(requirementsTable)
      .innerJoin(categoriesTable, eq(categoriesTable.id, requirementsTable.categoryId))
      .leftJoin(bidsTable, eq(bidsTable.requirementId, requirementsTable.id))
      .groupBy(requirementsTable.city, categoriesTable.id)
      .orderBy(requirementsTable.city);
      
    res.json(data.map(d => ({
      city: d.city,
      category: d.categoryName,
      bidCount: Number(d.bidCount),
      avgBidAmount: Number(d.avgBidAmount ?? 0),
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /analytics/time-to-bid
router.get("/analytics/time-to-bid", requireAuth, async (req, res): Promise<void> => {
  try {
    const timeToFirstBid = await db.select({
      requirementId: requirementsTable.id,
      title: requirementsTable.title,
      city: requirementsTable.city,
      timeMinutes: sql<number>`EXTRACT(EPOCH FROM (MIN(${bidsTable.createdAt}) - ${requirementsTable.createdAt})) / 60`
    }).from(requirementsTable)
      .innerJoin(bidsTable, eq(bidsTable.requirementId, requirementsTable.id))
      .groupBy(requirementsTable.id)
      .orderBy(requirementsTable.id)
      .limit(15);

    res.json(timeToFirstBid.map(t => ({
      id: t.requirementId,
      title: t.title,
      city: t.city,
      timeMinutes: Math.round(Number(t.timeMinutes ?? 0)),
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
