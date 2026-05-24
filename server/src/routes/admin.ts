import { Router, type IRouter } from "express";
import { eq, count, sum, desc, sql } from "drizzle-orm";
import {
  db, usersTable, requirementsTable, bidsTable, categoriesTable,
  disputesTable, paymentsTable, analyticsEventsTable,
} from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

// Admin-only guard (trust_score >= 100 as proxy for admin)
function isAdmin(user: typeof usersTable.$inferSelect) {
  return user.trustScore >= 100 || user.email.endsWith("@omnibid.admin");
}

router.get("/admin/stats", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users] = await db.select({ count: count(), verified: sql<number>`count(*) filter (where is_verified=true)` }).from(usersTable);
  const [reqs] = await db.select({ count: count(), open: sql<number>`count(*) filter (where status='open')`, completed: sql<number>`count(*) filter (where status='completed')` }).from(requirementsTable);
  const [bids] = await db.select({ count: count() }).from(bidsTable);
  const [payments] = await db.select({ volume: sum(paymentsTable.totalAmount), revenue: sum(paymentsTable.platformFeeAmount) }).from(paymentsTable);
  const [disputes] = await db.select({ count: count(), open: sql<number>`count(*) filter (where status='open')` }).from(disputesTable);

  const topSectors = await db.select({
    name: categoriesTable.name,
    slug: categoriesTable.slug,
    count: sql<number>`count(${requirementsTable.id})`,
    floor: categoriesTable.minBidFloor,
  }).from(categoriesTable)
    .leftJoin(requirementsTable, eq(requirementsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id)
    .orderBy(sql`count(${requirementsTable.id}) desc`)
    .limit(10);

  const topCities = await db.select({
    city: requirementsTable.city,
    count: count(),
  }).from(requirementsTable)
    .groupBy(requirementsTable.city)
    .orderBy(desc(count()))
    .limit(8);

  const newUsersThisMonth = await db.select({ count: count() }).from(usersTable)
    .where(sql`created_at >= ${thirtyDaysAgo}`);

  res.json({
    users: { total: Number(users?.count ?? 0), verified: Number(users?.verified ?? 0), newThisMonth: Number(newUsersThisMonth[0]?.count ?? 0) },
    requirements: { total: Number(reqs?.count ?? 0), open: Number(reqs?.open ?? 0), completed: Number(reqs?.completed ?? 0) },
    bids: { total: Number(bids?.count ?? 0) },
    payments: { volume: Number(payments?.volume ?? 0), revenue: Number(payments?.revenue ?? 0) },
    disputes: { total: Number(disputes?.count ?? 0), open: Number(disputes?.open ?? 0) },
    topSectors: topSectors.map(s => ({ name: s.name, slug: s.slug, count: Number(s.count), floor: Number(s.floor ?? 0) })),
    topCities: topCities.map(c => ({ city: c.city ?? "Unknown", count: Number(c.count) })),
  });
});

// Update category price floor
router.put("/admin/categories/:id/floor", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const parsed = z.object({ floor: z.number().min(0) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [cat] = await db.update(categoriesTable)
    .set({ minBidFloor: String(parsed.data.floor) })
    .where(eq(categoriesTable.id, String(req.params.id)))
    .returning();

  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json({ id: cat.id, name: cat.name, minBidFloor: Number(cat.minBidFloor ?? 0), priceFloor: Number(cat.minBidFloor ?? 0) });
});

// List all categories with stats for admin
router.get("/admin/categories", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const cats = await db.select({
    id: categoriesTable.id,
    name: categoriesTable.name,
    slug: categoriesTable.slug,
    iconName: categoriesTable.iconName,
    minBidFloor: categoriesTable.minBidFloor,
    requirementCount: sql<number>`(select count(*) from requirements where category_id = categories.id)`,
    bidCount: sql<number>`(select count(*) from bids join requirements r on bids.requirement_id = r.id where r.category_id = categories.id)`,
  }).from(categoriesTable).orderBy(categoriesTable.name);

  res.json(cats.map(c => ({
    ...c,
    minBidFloor: Number(c.minBidFloor ?? 0),
    priceFloor: Number(c.minBidFloor ?? 0),
    requirementCount: Number(c.requirementCount),
    bidCount: Number(c.bidCount),
  })));
});

// Get all users (paginated)
router.get("/admin/users", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const page = Number(req.query.page ?? 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    city: usersTable.city,
    isVerified: usersTable.isVerified,
    trustScore: usersTable.trustScore,
    omniScore: usersTable.omniScore,
    createdAt: usersTable.createdAt,
  }).from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit).offset(offset);

  const [total] = await db.select({ count: count() }).from(usersTable);
  res.json({ users: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })), total: Number(total?.count ?? 0), page, pages: Math.ceil(Number(total?.count ?? 0) / limit) });
});

// Update user trust score / verification
router.put("/admin/users/:id", requireAuth, async (req, res): Promise<void> => {
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!me || !isAdmin(me)) { res.status(403).json({ error: "Admin only" }); return; }

  const parsed = z.object({
    isVerified: z.boolean().optional(),
    trustScore: z.number().min(0).max(100).optional(),
    omniScore: z.number().min(0).max(1000).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, String(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: updated.id, name: updated.name, isVerified: updated.isVerified, trustScore: updated.trustScore, omniScore: updated.omniScore });
});

export default router;
